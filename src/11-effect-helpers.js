import "./10-basic-audits.js"; // keeps the original load order
import { TFRT, TFR_CLOAK_DISPLAY_NAME, TFR_CLOAK_ITEM_NAMES, TFR_MODULE_ID } from "./00-core.js";
import { TFRConditionLabel } from "./03-activities.js";
import { TFREscapeHtml } from "./08-affinity-events.js";

export function TFRResolveActor(actorOrId = null) {
  if (actorOrId?.documentName === "Actor") return actorOrId;
  if (typeof actorOrId === "string") return game.actors.get(actorOrId) || game.actors.getName(actorOrId) || canvas.tokens?.get(actorOrId)?.actor;
  return canvas.tokens?.controlled?.[0]?.actor || game.user.character || null;
}

export function TFRTokenForActor(actor) {
  if (!actor) return null;
  const controlled = canvas?.tokens?.controlled || [];
  const selected = controlled.find(t => t?.actor?.id === actor.id);
  if (selected) return selected;
  return canvas?.tokens?.placeables?.find(t => t?.actor?.id === actor.id) || null;
}

export function TFRGetActorRelicItem(actor, relicId) {
  if (!actor) return null;
  const flagged = actor.items.find(item => item.getFlag("the-first-relics", "relicId") === relicId);
  if (flagged) return flagged;
  const names = {
    cloak_feywilds: TFR_CLOAK_DISPLAY_NAME,
    mantle_first_seer: "Mantle of the First Seer",
    girdle_unbroken: "Girdle of the Unbroken",
    chains_patron: "Chains of the Patron"
  };
  if (relicId === "cloak_feywilds") {
    return actor.items.find(item => TFR_CLOAK_ITEM_NAMES.has(item.name))
      || game.items.find(item => TFR_CLOAK_ITEM_NAMES.has(item.name));
  }
  return actor.items.getName(names[relicId]) || game.items.getName(names[relicId]);
}

export function TFRGetSelectedTargetActor() {
  return Array.from(game.user.targets || [])[0]?.actor || null;
}

export async function TFRSpendRelicCharges(item, charges) {
  charges = Number(charges || 0);
  if (charges <= 0) return true;
  if (!item) return false;
  const spent = Number(item.system?.uses?.spent || 0);
  const max = Number(item.system?.uses?.max || 0);
  const remaining = Math.max(max - spent, 0);
  if (remaining < charges) {
    ui.notifications.warn(TFRT("{itemName}: Not enough charges. Required {charges}, remaining {remaining}.", { itemName: item.name, charges: charges, remaining: remaining }));
    return false;
  }
  await item.update({ "system.uses.spent": spent + charges });
  return true;
}

export function TFREffectData(name, img, changes, rounds = 10, seconds = 60, origin = null) {
  return {
    name, img, origin, transfer: false, disabled: false,
    changes,
    duration: { rounds, seconds },
    flags: { dae: { transfer: false, stackable: "noneName", specialDuration: [] } }
  };
}

export async function TFRSafeDeleteDocument(document, context = "") {
  if (!document) return false;
  try {
    const parent = document.parent || null;
    const collection = parent?.effects || parent?.items || null;
    const id = document.id || document._id;

    // If Foundry or another module already removed the embedded document, do not ask the server
    // to delete it again. This avoids harmless-but-noisy "ActiveEffect does not exist" errors.
    if (collection?.get && id && !collection.get(id)) return false;
    if (document.deleted) return false;

    await document.delete();
    return true;
  } catch (err) {
    const message = String(err?.message || err || "");
    if (message.includes("does not exist") || message.includes("not found") || message.includes("No document")) {
      console.debug(`The First Relics | skipped stale delete${context ? ` (${context})` : ""}:`, message);
      return false;
    }
    console.warn(`The First Relics | failed to delete document${context ? ` (${context})` : ""}:`, err);
    return false;
  }
}

export async function TFRApplyOrRefreshEffect(actor, effectData) {
  if (!actor) return null;
  const existing = actor.effects.find(e => e.name === effectData.name);
  if (existing) await TFRSafeDeleteDocument(existing, `refresh effect ${effectData.name}`);
  const [created] = await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  return created;
}

export function TFRChatFlags(extra = {}) {
  return {
    [TFR_MODULE_ID]: {
      tfrAutomationMessage: true,
      ...(extra || {})
    }
  };
}

export function TFRAbilityHelperKind({ applied = false, saveQueued = false, spec = {} } = {}) {
  if (saveQueued) return "Save Resolver";
  if (applied) return "Module Helper";
  if (spec?.note) return "Manual Reminder";
  return "Helper";
}

function TFRHelperKindLabel(kind) {
  const labels = {
    "Save Resolver": TFRT("Save Resolver"),
    "Module Helper": TFRT("Module Helper"),
    "Manual Reminder": TFRT("Manual Reminder"),
    "Helper": TFRT("Helper")
  };
  return labels[kind] || kind;
}

export function TFRAbilityHelperChatContent({ relic, def, spec = {}, applied = false, saveQueued = false } = {}) {
  const ability = TFREscapeHtml(def?.name || "Relic Ability");
  const relicName = TFREscapeHtml(relic?.name || "The First Relic");
  const kind = TFRAbilityHelperKind({ applied, saveQueued, spec });
  const status = saveQueued
    ? TFRT("Waiting for the save roll and GM resolver before applying {condition}.", { condition: TFREscapeHtml(spec.condition ? TFRConditionLabel(spec.condition) : TFRT("the condition")) })
    : applied
      ? TFRT("Module helper effects were applied or queued.")
      : TFRT("No direct game effect was applied by the module.");
  const note = spec.note ? `<li><strong>${TFRT("Manual Reminder.")}</strong> ${TFREscapeHtml(spec.note)}</li>` : "";

  return `
    <div class="tfr-ability-helper-card" data-tfr-helper-kind="${TFREscapeHtml(kind)}">
      <h2>${ability}</h2>
      <p><strong>${relicName}</strong> - ${TFREscapeHtml(TFRHelperKindLabel(kind))}</p>
      <ul>
        <li>${status}</li>
        ${note}
      </ul>
    </div>
  `;
}


