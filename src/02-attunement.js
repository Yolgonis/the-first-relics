import "./01-stages-and-text.js"; // keeps the original load order
import {
  TFRLoadCanonicalRelics,
  TFRNotifyInfo,
  TFRNotifyWarn,
  TFRT,
  TFR_ATTUNEMENT_REFUSAL_FLAG,
  TFR_MODULE_ID
} from "./00-core.js";
import {
  TFRAttunementForStage,
  TFRRemoveDescriptionSection,
  TFRRemovePlayerMoodHistory,
  TFRSheetHtmlElement
} from "./01-stages-and-text.js";
import { TFRRelicItemStage } from "./04-items.js";
import {
  TFRFindAllRelicItemCopies,
  TFRGetRelicById,
  TFRGetRelicState,
  TFRSetRelicState
} from "./06-relic-state.js";

function TFRIsRelicItem(item) {
  return !!(
    item?.getFlag?.(TFR_MODULE_ID, "relicId") ||
    item?.flags?.[TFR_MODULE_ID]?.relicId
  );
}

export function TFRRelicRefusesAttunement(item) {
  return !!(
    item?.getFlag?.(TFR_MODULE_ID, TFR_ATTUNEMENT_REFUSAL_FLAG) ||
    item?.flags?.[TFR_MODULE_ID]?.[TFR_ATTUNEMENT_REFUSAL_FLAG]
  );
}

export function TFRRelicFeaturesAreBlocked(item) {
  return TFRIsRelicItem(item) && TFRRelicRefusesAttunement(item);
}

function TFRWarnRelicFeaturesBlocked(item, label = "Relic ability") {
  TFRNotifyWarn(TFRT("{itemName} refuses attunement. {label} cannot be used until the GM allows attunement.", { itemName: item?.name || TFRT("The relic"), label: label }));
}

export function TFRBlockRelicFeatureUse(item, label = "Relic ability") {
  if (!TFRRelicFeaturesAreBlocked(item)) return false;
  TFRWarnRelicFeaturesBlocked(item, label);
  return true;
}

function TFRPendingDocumentChange(changes, path) {
  if (!changes || typeof changes !== "object") return { present: false, value: undefined };
  if (Object.prototype.hasOwnProperty.call(changes, path)) {
    return { present: true, value: changes[path] };
  }
  if (foundry.utils.hasProperty(changes, path)) {
    return { present: true, value: foundry.utils.getProperty(changes, path) };
  }
  return { present: false, value: undefined };
}

function TFRNotifyAttunementRefusal(item, userId, message) {
  if (!userId || userId === game.user?.id) {
    TFRNotifyWarn(message || TFRT("{itemName} refuses to attune to this bearer.", { itemName: item?.name || TFRT("The relic") }));
  }
}

function TFRBlockRefusedAttunementUpdate(item, changes = {}, options = {}, userId = null) {
  if (!TFRIsRelicItem(item)) return;

  const flagPath = `flags.${TFR_MODULE_ID}.${TFR_ATTUNEMENT_REFUSAL_FLAG}`;
  const flagDeletePath = `flags.${TFR_MODULE_ID}.-=${TFR_ATTUNEMENT_REFUSAL_FLAG}`;
  const moduleDeletePath = `flags.-=${TFR_MODULE_ID}`;
  const directFlagChange = TFRPendingDocumentChange(changes, flagPath);
  const deletesFlag = TFRPendingDocumentChange(changes, flagDeletePath).present ||
    TFRPendingDocumentChange(changes, moduleDeletePath).present;
  const flagChange = directFlagChange.present
    ? directFlagChange
    : deletesFlag
      ? { present: true, value: false }
      : { present: false, value: undefined };
  const currentRefusal = TFRRelicRefusesAttunement(item);
  const requestedRefusal = flagChange.present ? !!flagChange.value : currentRefusal;
  const updatingUser = game.users?.get?.(userId);
  const updateIsFromGm = updatingUser?.isGM ?? ((!userId || userId === game.user?.id) && !!game.user?.isGM);

  if (flagChange.present && requestedRefusal !== currentRefusal && !updateIsFromGm) {
    TFRNotifyAttunementRefusal(item, userId, "Only the GM can change a relic's attunement consent.");
    return false;
  }

  const attunedChange = TFRPendingDocumentChange(changes, "system.attuned");
  if (requestedRefusal && attunedChange.present && attunedChange.value === true) {
    TFRNotifyAttunementRefusal(item, userId);
    return false;
  }

  const attunementChange = TFRPendingDocumentChange(changes, "system.attunement");
  if (requestedRefusal && attunementChange.present && attunementChange.value !== "required") {
    TFRNotifyAttunementRefusal(item, userId, `${item.name} refuses attunement. Its magical features must remain suppressed.`);
    return false;
  }

  // If a GM or macro enables refusal directly, normalize an already-attuned item
  // in the same update even when system.attuned was not explicitly submitted.
  if (requestedRefusal && item.system?.attuned && !attunedChange.present) {
    changes["system.attuned"] = false;
  }
  if (requestedRefusal && item.system?.attunement !== "required" && !attunementChange.present) {
    changes["system.attunement"] = "required";
  }
}

function TFRNormalizeRefusedAttunementOnCreate(item, data = {}, options = {}, userId = null) {
  if (!TFRIsRelicItem(item) || !TFRRelicRefusesAttunement(item)) return;
  item.updateSource({ "system.attuned": false, "system.attunement": "required" });
}

async function TFRResolveRelicItem(itemOrUuid = null) {
  if (itemOrUuid?.documentName === "Item") return itemOrUuid;
  if (typeof itemOrUuid !== "string" || !itemOrUuid.trim()) return null;

  const worldItem = game.items?.get?.(itemOrUuid) || null;
  if (worldItem) return worldItem;

  try {
    const document = await fromUuid(itemOrUuid);
    return document?.documentName === "Item" ? document : null;
  } catch (err) {
    return null;
  }
}

export async function TFRSetAttunementRefusal(itemOrUuid, refuses = true) {
  if (!game.user?.isGM) {
    TFRNotifyWarn(TFRT("The First Relics: Only the GM can change a relic's attunement consent."));
    return false;
  }

  const item = await TFRResolveRelicItem(itemOrUuid);
  if (!TFRIsRelicItem(item)) {
    TFRNotifyWarn(TFRT("The First Relics: Relic item not found."));
    return false;
  }

  const refusing = !!refuses;
  const update = {
    [`flags.${TFR_MODULE_ID}.${TFR_ATTUNEMENT_REFUSAL_FLAG}`]: refusing,
    "system.attunement": refusing ? "required" : TFRAttunementForStage(TFRRelicItemStage(item))
  };
  if (refusing) update["system.attuned"] = false;

  await item.update(update);
  TFRNotifyInfo(
    refusing
      ? TFRT("{itemName} now refuses attunement; its active features and passive bonuses are suppressed.", { itemName: item.name })
      : TFRT("{itemName} is willing to accept attunement again.", { itemName: item.name })
  );
  return item;
}

export async function TFRSetRelicAttunementRefusal(relicId, refuses = true) {
  if (!game.user?.isGM) {
    TFRNotifyWarn(TFRT("The First Relics: Only the GM can change a relic's attunement consent."));
    return false;
  }

  const relic = await TFRGetRelicById(relicId);
  if (!relic) {
    TFRNotifyWarn(TFRT("The First Relics: Relic not found: {relicId}", { relicId: relicId }));
    return false;
  }

  const refusing = !!refuses;
  const data = await TFRGetRelicState(relic.id);
  data.refusesAttunement = refusing;
  await TFRSetRelicState(relic.id, data);

  const copies = TFRFindAllRelicItemCopies(relic);
  const failures = [];
  for (const item of copies) {
    const update = {
      [`flags.${TFR_MODULE_ID}.${TFR_ATTUNEMENT_REFUSAL_FLAG}`]: refusing,
      "system.attunement": refusing ? "required" : TFRAttunementForStage(TFRRelicItemStage(item))
    };
    if (refusing) update["system.attuned"] = false;
    try {
      await item.update(update);
    } catch (error) {
      failures.push(item.uuid || item.name);
      console.error(`The First Relics | Could not update attunement consent for ${item.uuid || item.name}.`, error);
    }
  }

  if (failures.length) {
    TFRNotifyWarn(TFRT("{relicName}: consent was saved, but {failuresCount} item copy/copies could not be updated.", { relicName: relic.name, failuresCount: failures.length }));
  } else {
    TFRNotifyInfo(
      refusing
        ? TFRT("{relicName} now refuses attunement; its active features and passive bonuses are suppressed. {copiesCount} item copy/copies synchronized.", { relicName: relic.name, copiesCount: copies.length })
        : TFRT("{relicName} now accepts attunement. {copiesCount} item copy/copies synchronized.", { relicName: relic.name, copiesCount: copies.length })
    );
  }
  return data;
}

/** relic id -> class named in "requires attunement by a <class>". Filled once at startup. */
const TFR_RELIC_CLASSES = new Map();

export function TFRActorHasClass(actor, className) {
  const identifier = String(className).toLowerCase();
  return Object.keys(actor?.classes || {}).includes(identifier)
    || !!actor?.items?.some(item => item.type === "class" && (item.system?.identifier === identifier || item.name === className));
}

/** The class this bearer is missing for the relic, or "" if the bearer qualifies. */
function TFRMissingAttunementClass(item, actor = item?.parent) {
  const className = TFR_RELIC_CLASSES.get(item?.flags?.[TFR_MODULE_ID]?.relicId);
  if (!className || actor?.documentName !== "Actor") return "";
  return TFRActorHasClass(actor, className) ? "" : className;
}

/** Players cannot attune a relic to a bearer without its class. A GM still can, with a notice. */
export function TFRBlockWrongClassAttunement(item, changes = {}) {
  if (TFRPendingDocumentChange(changes, "system.attuned").value !== true || item.system?.attuned) return;
  const className = TFRMissingAttunementClass(item);
  if (!className) return;
  const names = { itemName: item.name, actorName: item.parent.name, className };
  if (game.user?.isGM) {
    TFRNotifyInfo(TFRT("{itemName} requires attunement by a {className}. {actorName} is not one; attuned by GM override.", names));
    return;
  }
  TFRNotifyWarn(TFRT("{itemName} requires attunement by a {className}. {actorName} cannot attune to it.", names));
  return false;
}

function TFRClearWrongClassAttunementOnCreate(item) {
  if (game.user?.isGM || !item.system?.attuned || !TFRMissingAttunementClass(item)) return;
  item.updateSource({ "system.attuned": false });
}

export function TFRRegisterAttunementRefusal() {
  Hooks.on("preUpdateItem", TFRBlockRefusedAttunementUpdate);
  Hooks.on("preCreateItem", TFRNormalizeRefusedAttunementOnCreate);
  Hooks.on("preUpdateItem", TFRBlockWrongClassAttunement);
  Hooks.on("preCreateItem", TFRClearWrongClassAttunementOnCreate);
  TFRLoadCanonicalRelics()
    .then(relics => relics.forEach(relic => TFR_RELIC_CLASSES.set(relic.id, relic.class)))
    .catch(error => console.error("The First Relics | Could not load relic classes for attunement.", error));
}

export async function TFRNormalizeRefusingRelicItems() {
  if (!game.user?.isGM) return 0;
  const items = [...(game.items?.contents || [])];
  for (const actor of game.actors?.contents || []) items.push(...(actor.items?.contents || []));

  let normalized = 0;
  const seen = new Set();
  for (const item of items) {
    if (!item?.uuid || seen.has(item.uuid) || !TFRRelicFeaturesAreBlocked(item)) continue;
    seen.add(item.uuid);
    if (!item.system?.attuned && item.system?.attunement === "required") continue;
    await item.update({ "system.attuned": false, "system.attunement": "required" });
    normalized += 1;
  }
  return normalized;
}

/** Says on the item sheet, next to the attunement field, that this bearer lacks the relic's class. */
function TFRShowAttunementClassNote(item, element) {
  const className = TFRMissingAttunementClass(item);
  const group = element.querySelector('[name="system.attuned"]')?.closest(".form-group");
  if (!className || !group || element.querySelector(".tfr-attunement-class-note")) return;
  // The attunement field sits in a narrow column of a split row; the note goes under the whole row.
  const row = group.closest(".split-group") || group;
  const note = document.createElement("p");
  note.className = "hint tfr-attunement-class-note";
  note.textContent = game.user?.isGM
    ? TFRT("Requires attunement by a {className}. {actorName} is not one; only a GM can attune it.", { className, actorName: item.parent.name })
    : TFRT("Requires attunement by a {className}. {actorName} cannot attune to it.", { className, actorName: item.parent.name });
  row.after(note);
}

export async function TFRApplyRelicSheetVisibility(app, html) {
  const item = app?.document || app?.item || app?.object;
  const relicId = item?.getFlag?.(TFR_MODULE_ID, "relicId");
  if (!relicId) return;
  const element = TFRSheetHtmlElement(html);
  if (!element?.querySelectorAll) return;

  TFRRemoveDescriptionSection(element, "Relic Personality");
  element
    .querySelectorAll(
      ".first-relics-item-description .secret, " +
      ".first-relics-item-description section.secret, " +
      ".first-relics-item-description .tfr-gm-relic-notes"
    )
    .forEach(node => node.remove());

  TFRShowAttunementClassNote(item, element);

  if (!game.user?.isGM) {
    TFRRemovePlayerMoodHistory(element);
    return;
  }

}

