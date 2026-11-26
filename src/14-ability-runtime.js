import "./13-save-resolver.js"; // keeps the original load order
import { TFRRelicTable } from "./relics/index.js";
import { TFRContentLanguage, TFRLoadRelics, TFRT, TFR_CLOAK_DISPLAY_NAME, TFR_MODULE_ID } from "./00-core.js";
import { TFRGetStageData, TFRMode, TFRStageTitle } from "./01-stages-and-text.js";
import { TFRBlockRelicFeatureUse } from "./02-attunement.js";
import {
  TFRAbilityDefinitions,
  TFRGetAbilityDefinition,
  TFRRuntimeWorkCoveredByNativeEffects,
  TFRShouldPreferNativeActivityEffects
} from "./03-activities.js";
import {
  TFRIsAbilitySlotUnlocked,
  TFRRelicItemSignatureUnlocked,
  TFRRelicItemStage,
  TFRRequiredStageForSlot,
  TFRUnlockedActivitySlots
} from "./04-items.js";
import { TFRGetRelicById } from "./06-relic-state.js";
import {
  TFRAbilityHelperChatContent,
  TFRAbilityHelperKind,
  TFRApplyOrRefreshEffect,
  TFRChatFlags,
  TFREffectData,
  TFRGetSelectedTargetActor,
  TFRResolveActor,
  TFRSpendRelicCharges,
  TFRTokenForActor
} from "./11-effect-helpers.js";
import {
  TFRApplyRestrainedCondition,
  TFRApplyStatusCondition,
  TFRGetSelectedTargetToken,
  TFRRemoveActorConditions
} from "./12-conditions.js";
import { TFRQueueSaveAwareCondition } from "./13-save-resolver.js";
import {
  TFRDestinationTopLeftForToken,
  TFRDistanceFeet,
  TFRFindActorRelicItem,
  TFRSelectedToken,
  TFRTokenCenter
} from "./19-fey-step.js";
import {
  TFRMoveTokenAsTeleport,
  TFRPickCanvasPointWithRange,
  TFRPlaySimpleTeleportAnimation
} from "./23-teleport.js";
import {
  TFRChatMessagePlainText,
  TFRGetActivitySlot,
  TFRLogRelicTimelineSafe,
  TFRTokenFromChatMessage
} from "./24-chat-and-gates.js";

function TFRActorTotalLevel(actor) {
  const direct = Number(actor?.system?.details?.level);
  if (Number.isFinite(direct) && direct > 0) return direct;
  let total = 0;
  for (const item of actor?.items || []) {
    if (item.type === "class") total += Number(item.system?.levels || 0) || 0;
  }
  return total || Number(actor?.system?.details?.cr) || 1;
}

export async function TFRApplyTempHp(actor, amount, label = "Temporary Hit Points") {
  if (!actor || !Number.isFinite(Number(amount))) return false;
  const current = Number(actor.system?.attributes?.hp?.temp || 0) || 0;
  const next = Math.max(current, Number(amount));
  if (next > current) await actor.update({ "system.attributes.hp.temp": next });
  ui.notifications.info(TFRT("{label}: {actorName} has {next} temp HP.", { label: label, actorName: actor.name, next: next }));
  return true;
}

/** The actor's class feature with this identifier that has limited uses, or null. */
export function TFRFeatureWithUses(actor, identifier) {
  return actor?.items?.find?.(item => item.system?.identifier === identifier && item.system?.uses?.max) || null;
}

/**
 * The first identifier in the list the actor has a feature with spent uses for; else the first
 * one it has at all; else the first in the list (so the warning names it). A single identifier is returned as is.
 */
function TFRPickFeatureIdentifier(actor, identifiers) {
  if (!Array.isArray(identifiers)) return identifiers;
  const owned = identifiers.filter(identifier => TFRFeatureWithUses(actor, identifier));
  return owned.find(identifier => Number(TFRFeatureWithUses(actor, identifier).system.uses.spent) > 0) || owned[0] || identifiers[0];
}

/** The actor's Monk's Focus feature, whose uses are the Focus Points, or null. */
export function TFRMonkFocusItem(actor) {
  return TFRFeatureWithUses(actor, "monks-focus");
}

/**
 * Restores `amount` uses of the feature with this identifier ("all" restores every spent use), such
 * as Focus Points (monks-focus), Sorcery Points (font-of-magic) or Innate Sorcery. Returns the uses regained.
 */
export async function TFRRegainFeatureUses(actor, identifier, amount, label = "Feature Uses") {
  const item = TFRFeatureWithUses(actor, identifier);
  if (!item) {
    ui.notifications.warn(TFRT("{label}: {actorName} has no feature with uses for {identifier}.", { label, actorName: actor?.name || "", identifier }));
    return 0;
  }
  const spent = Number(item.system.uses.spent) || 0;
  const regained = amount === "all" ? spent : Math.min(spent, Math.max(0, Number(amount) || 0));
  if (regained > 0) await item.update({ "system.uses.spent": spent - regained });
  ui.notifications.info(TFRT("{label}: {actorName} regains {regained} uses of {feature} ({value}/{max}).", { label, actorName: actor.name, regained, feature: item.name, value: item.system.uses.value, max: item.system.uses.max }));
  return regained;
}

/** Restores `amount` Focus Points ("all" restores every spent point). Returns the points regained. */
export async function TFRRegainFocus(actor, amount, label = "Focus Points") {
  return TFRRegainFeatureUses(actor, "monks-focus", amount, label);
}

/** Restores one expended Pact Magic slot. Returns the slot level, or 0. */
export async function TFRRegainPactSlot(actor, label = "Pact Slot") {
  const pact = actor?.system?.spells?.pact;
  if (!pact || !(Number(pact.max) > 0) || !(Number(pact.value) < Number(pact.max))) {
    ui.notifications.warn(TFRT("{label}: {actorName} has no expended Pact Magic slot.", { label, actorName: actor?.name || "" }));
    return 0;
  }
  await actor.update({ "system.spells.pact.value": Number(pact.value) + 1 });
  ui.notifications.info(TFRT("{label}: {actorName} regains a Pact Magic slot.", { label, actorName: actor.name }));
  return Number(pact.level) || 1;
}

/** Restores one expended spell slot, the highest level up to `maxLevel`. Returns its level, or 0. */
export async function TFRRegainSpellSlot(actor, maxLevel, label = "Spell Slot") {
  const spells = actor?.system?.spells || {};
  for (let level = Math.min(9, Math.max(0, Number(maxLevel) || 0)); level >= 1; level--) {
    const slot = spells[`spell${level}`];
    if (!slot || !(Number(slot.max) > 0) || !(Number(slot.value) < Number(slot.max))) continue;
    await actor.update({ [`system.spells.spell${level}.value`]: Number(slot.value) + 1 });
    ui.notifications.info(TFRT("{label}: {actorName} regains a level {level} spell slot.", { label, actorName: actor.name, level }));
    return level;
  }
  ui.notifications.warn(TFRT("{label}: {actorName} has no expended spell slot of level {level} or lower.", { label, actorName: actor?.name || "", level: maxLevel }));
  return 0;
}

export async function TFRApplyVerdantSnare(actor, targetActor = null, item = null, options = {}) {
  const targetToken = TFRGetSelectedTargetToken();
  const target = targetActor || targetToken?.actor || null;
  if (!target) {
    ui.notifications.warn(TFRT("Briar Snare: target one creature first."));
    return null;
  }

  const effect = await TFRApplyRestrainedCondition(actor, targetToken || target, item);
  const note = options.fromDnd5eCard
    ? TFRT("dnd5e consumed the resource. Restrained was applied as a GM helper; remove it if the target succeeds its save.")
    : TFRT("Restrained was applied as a GM helper; remove it if the target succeeds its save.");

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ ability: "verdantSnare", targetActorId: target.id }),
    content: `<h2>${TFRT("Briar Snare")}</h2><p>${TFRT("Target: {target}.", { target: target.name })} ${note}</p>`
  });
}


export async function TFRApplyCloakMark(sourceActor, targetActor) {
  if (!sourceActor || !targetActor) {
    ui.notifications.warn(TFRT("{TFR_CLOAK_DISPLAY_NAME}: select a target token first.", { TFR_CLOAK_DISPLAY_NAME: TFR_CLOAK_DISPLAY_NAME }));
    return null;
  }
  const effect = TFREffectData(
    `Marked by the First Hunt (${sourceActor.name})`,
    "modules/the-first-relics/art/icons/cloak-feywilds.svg",
    [{ key: "flags.the-first-relics.markedByFirstHunt", mode: TFRMode("OVERRIDE"), value: sourceActor.id, priority: 20 }],
    10, 60
  );
  const created = await TFRApplyOrRefreshEffect(targetActor, effect);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
    flags: TFRChatFlags({ ability: "arrowFirstHunt", targetActorId: targetActor.id }),
    content: `<h2>${TFRT("Marked by the First Hunt")}</h2><p>${TFRT("{target} is marked by {source}. Resolve invisibility denial, tracking, Avatar advantage, and Signature interactions manually where needed.", { target: targetActor.name, source: sourceActor.name })}</p>`
  });
  return created;
}

function TFRRelicStageBonusFromItem(relic, item) {
  const stage = item ? TFRRelicItemStage(item) : "dormant";
  return Number(TFRGetStageData(relic, stage, item ? TFRRelicItemSignatureUnlocked(item) : false)?.bonus || 1) || 1;
}

export function TFREffectChangesForRelicAbility(relicId, slot, relic = null, item = null) {
  const bonus = relic ? TFRRelicStageBonusFromItem(relic, item) : 1;
  const add = TFRMode("ADD");
  const upgrade = TFRMode("UPGRADE");
  const override = TFRMode("OVERRIDE");
  // CUSTOM is resolved by the applyActiveEffect hook in 25-hooks.js; used for booleans, which DAE would turn into 1.
  const custom = TFRMode("CUSTOM");
  const common = TFRRelicTable("abilityEffects", { bonus, add, upgrade, override, custom });
  return foundry.utils.deepClone(common[relicId]?.[slot] || []);
}

export function TFRRelicAbilityEffectData(relic, slot, item = null, actor = null) {
  if (!relic || !slot) return null;
  const def = TFRGetAbilityDefinition(relic, slot);
  const changes = TFREffectChangesForRelicAbility(relic.id, slot, relic, item);
  const img = item?.img || relic.icon || "icons/svg/aura.svg";
  const name = def?.name || slot;
  if (!changes.length && !["signature", "avatar"].includes(slot)) return null;
  return TFREffectData(`${name} — ${relic.name}`, img, changes, 10, 60, item?.uuid || null);
}

export function TFRRelicAbilityRuntimeSpec(relicId, slot) {
  const specs = TFRRelicTable("runtime", { mode: TFRMode });
  return specs[relicId]?.[slot] || {};
}

async function TFRExecuteRelicTeleport({ token = null, actor = null, relicId, slot, consumeCharges = false, message = null } = {}) {
  token = token || (actor ? TFRTokenForActor(actor) : TFRSelectedToken());
  if (!token) { ui.notifications.warn(TFRT("Relic teleport: select the bearer's token first.")); return { ok: false, issue: "No token" }; }
  actor = actor || token.actor;
  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === relicId);
  const item = TFRFindActorRelicItem(actor, relicId);
  const def = relic ? TFRGetAbilityDefinition(relic, slot) : null;
  if (!actor || !relic || !item || !def) return { ok: false, issue: "Missing relic teleport data" };
  if (TFRBlockRelicFeatureUse(item, def.name || "Relic teleport")) return { ok: false, issue: "Attunement refused" };
  const range = def.range || 30;
  const from = TFRTokenCenter(token);
  const destination = await TFRPickCanvasPointWithRange({ origin: from, rangeFeet: range, message: message || TFRT("{defName}: click a destination within {range} ft. Press Esc to cancel.", { defName: def.name, range }) });
  if (!destination) return { ok: false, issue: "Cancelled" };
  const distance = TFRDistanceFeet(from, destination);
  if (distance > range + 0.001) { ui.notifications.warn(TFRT("{defName}: destination is {distance} ft away, max is {range} ft.", { defName: def.name, distance: distance.toFixed(1), range: range })); return { ok: false, issue: "Out of range" }; }
  if (consumeCharges && !(await TFRSpendRelicCharges(item, def.charges || 0))) return { ok: false, issue: "Not enough charges" };
  const topLeft = TFRDestinationTopLeftForToken(token, destination);
  const restoreTeleportVisual = await TFRPlaySimpleTeleportAnimation(token, destination);
  await TFRMoveTokenAsTeleport(token, topLeft);
  if (typeof restoreTeleportVisual === "function") await restoreTeleportVisual();
  await TFRLogRelicTimelineSafe(relicId, { type: "Automation Execute", slot, actor: actor.name, activity: def.name, reason: `${actor.name} used ${def.name} (${distance.toFixed(1)} ft).${consumeCharges ? "" : " Charges were already consumed by dnd5e."}` });
  return { ok: true, relic: relic.name, activity: def.name, actor: actor.name, distance: Number(distance.toFixed(2)) };
}

async function TFRApplyRelicAbilityRuntime(actor, relicId, slot, options = {}) {
  if (!actor || !relicId || !slot) return null;
  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === relicId);
  const item = TFRFindActorRelicItem(actor, relicId);
  if (!relic || !item) return null;
  const def = TFRGetAbilityDefinition(relic, slot);
  if (TFRBlockRelicFeatureUse(item, def?.name || "Relic ability")) return { ok: false, issue: "Attunement refused" };
  const spec = TFRRelicAbilityRuntimeSpec(relicId, slot);
  const targetToken = TFRGetSelectedTargetToken();
  const targetActor = targetToken?.actor || TFRGetSelectedTargetActor();
  const effect = TFRRelicAbilityEffectData(relic, slot, item, actor);
  let applied = false;

  if (TFRShouldPreferNativeActivityEffects(relic, slot, options) && TFRRuntimeWorkCoveredByNativeEffects(spec)) {
    await TFRLogRelicTimelineSafe(relicId, {
      type: "Native Activity Effect",
      slot,
      actor: actor.name,
      activity: def?.name || slot,
      reason: `${actor.name} used ${def?.name || slot}. Effects are available on the native dnd5e chat card.`
    });
    return null;
  }

  if (spec.teleport) { const token = TFRTokenFromChatMessage(options.message, actor) || TFRTokenForActor(actor) || TFRSelectedToken(); await TFRExecuteRelicTeleport({ token, actor, relicId, slot, consumeCharges: options.spendCharges === true }); applied = true; }
  if (spec.removeSelf?.length) { await TFRRemoveActorConditions(actor, spec.removeSelf); applied = true; }
  if (spec.selfEffect && effect) { if (spec.rounds || spec.seconds) effect.duration = { ...(effect.duration || {}), rounds: spec.rounds, seconds: spec.seconds }; await TFRApplyOrRefreshEffect(actor, effect); applied = true; }
  if (spec.conditionSelf) { await TFRApplyStatusCondition(actor, actor, item, spec.conditionSelf, spec.selfName || `${def?.name} — ${relic.name}`, spec.rounds || 10, spec.seconds || 60, [], { expireOnTurnEnd: !!spec.expireOnTurnEnd }); applied = true; }
  if (spec.targetEffect) { if (!targetActor) ui.notifications.warn(TFRT("{value}: target one creature first for the helper effect.", { value: def?.name || "Relic ability" })); else if (effect) { if (spec.rounds || spec.seconds) effect.duration = { ...(effect.duration || {}), rounds: spec.rounds, seconds: spec.seconds }; await TFRApplyOrRefreshEffect(targetActor, effect); applied = true; } }
  let saveQueued = false;
  let saveQueueResult = null;
  if (spec.condition) {
    const saveConditionNeedsResolver = def?.type === "save" && options.forceApplyCondition !== true;
    if (saveConditionNeedsResolver) {
      saveQueueResult = await TFRQueueSaveAwareCondition(actor, relicId, slot, options);
      saveQueued = !!saveQueueResult?.queued;
      applied = applied || saveQueued;
    } else if (!targetActor) {
      ui.notifications.warn(TFRT("{value}: target one creature first for the condition helper.", { value: def?.name || "Relic ability" }));
    } else {
      const changes = foundry.utils.deepClone(spec.extraTargetChanges || []);
      await TFRApplyStatusCondition(actor, targetToken || targetActor, item, spec.condition, spec.targetName || `${def?.name} — ${relic.name}`, spec.rounds || 10, spec.seconds || 60, changes, { expireOnTurnEnd: !!spec.expireOnTurnEnd });
      if (spec.alsoProne) await TFRApplyStatusCondition(actor, targetToken || targetActor, item, "prone", "Prone — The World Shall Kneel", spec.rounds || 10, spec.seconds || 60, [], { expireOnTurnEnd: !!spec.expireOnTurnEnd });
      applied = true;
    }
  }
  if (spec.removeTarget?.length) { if (!targetActor) ui.notifications.warn(TFRT("{value}: target a creature to run cleanup helper.", { value: def?.name || "Relic ability" })); else { await TFRRemoveActorConditions(targetActor, spec.removeTarget); applied = true; } }
  if (spec.tempHp) { const bonus = TFRRelicStageBonusFromItem(relic, item); let amount = 0; if (spec.tempHp === "level+bonus") amount = TFRActorTotalLevel(actor) + bonus; else if (spec.tempHp === "10+bonus") amount = 10 + bonus; else amount = Number(spec.tempHp) || 0; if (amount > 0) { await TFRApplyTempHp(actor, amount, def?.name || "Relic Temp HP"); applied = true; } }
  if (spec.itemUses) { const raw = spec.itemUses.amount; const amount = raw === "all" ? "all" : raw === "bonus+2" ? TFRRelicStageBonusFromItem(relic, item) + 2 : raw === "bonus" ? TFRRelicStageBonusFromItem(relic, item) : Number(raw) || 0; await TFRRegainFeatureUses(actor, TFRPickFeatureIdentifier(actor, spec.itemUses.identifier), amount, def?.name || "Feature Uses"); applied = true; }
  if (spec.spellSlot) { await TFRRegainSpellSlot(actor, spec.spellSlot === "bonus" ? TFRRelicStageBonusFromItem(relic, item) : Number(spec.spellSlot) || 1, def?.name || "Spell Slot"); applied = true; }
  if (spec.focus) { const amount = spec.focus === "all" ? "all" : spec.focus === "bonus+1" ? TFRRelicStageBonusFromItem(relic, item) + 1 : Number(spec.focus) || 0; await TFRRegainFocus(actor, amount, def?.name || "Focus Points"); applied = true; }

  if (saveQueued) {
    await TFRLogRelicTimelineSafe(relicId, { type: "Save Resolver Queued", slot, actor: actor.name, activity: def?.name || slot, reason: `${actor.name} used ${def?.name || slot}. Waiting for save result or manual resolver before applying ${spec.condition}.` });
    if (!spec.note || !applied) return saveQueueResult?.chatMessage || null;
  }

  if (applied || spec.note) {
    await TFRLogRelicTimelineSafe(relicId, { type: "Ability Helper", slot, actor: actor.name, activity: def?.name || slot, reason: `${actor.name} used ${def?.name || slot}. Helper effects ${applied ? "applied/queued" : "not required"}.` });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: TFRChatFlags({ abilityHelper: true, relicId, slot, helperKind: TFRAbilityHelperKind({ applied, saveQueued, spec }) }),
      content: TFRAbilityHelperChatContent({ relic, def, spec, applied, saveQueued })
    });
  }
  return null;
}

export async function TFRUseSelectedRelicAbility(relicId, slot, options = {}) {
  if (!relicId) {
    ui.notifications.warn(TFRT("Selected Relic Quick Actions: select a relic in the dashboard first."));
    return { ok: false, issue: "No relic selected" };
  }
  const actor = TFRResolveActor();
  if (!actor) {
    ui.notifications.warn(TFRT("Selected Relic Quick Actions: select the bearer's token."));
    return { ok: false, issue: "No actor selected" };
  }
  const item = TFRFindActorRelicItem(actor, relicId);
  if (!item) {
    const relic = await TFRGetRelicById(relicId);
    ui.notifications.warn(TFRT("{value} was not found on {actorName}.", { value: relic?.name || relicId, actorName: actor.name }));
    return { ok: false, issue: "Actor does not have selected relic" };
  }
  return TFRUseRelicAbility(actor, relicId, slot, options);
}

export async function TFRUseRelicAbility(actorOrId, relicId, slot, options = {}) {
  const actor = TFRResolveActor(actorOrId);
  if (!actor) return ui.notifications.warn(TFRT("The First Relics: no actor selected."));
  const item = TFRFindActorRelicItem(actor, relicId);
  if (!item) return ui.notifications.warn(TFRT("{actorName} does not have {relicId}.", { actorName: actor.name, relicId: relicId }));
  if (TFRBlockRelicFeatureUse(item, slot || "Relic ability")) return { ok: false, issue: "Attunement refused" };
  const stage = TFRRelicItemStage(item);
  const signatureUnlocked = TFRRelicItemSignatureUnlocked(item);
  if (!TFRIsAbilitySlotUnlocked(stage, slot, signatureUnlocked)) { const required = slot === "signature" ? "Signature unlock / 1000 affinity" : `${TFRStageTitle(TFRRequiredStageForSlot(slot))} stage`; ui.notifications.warn(TFRT("{slot} is locked. {itemName} is currently {value}; required: {required}.", { slot: slot, itemName: item.name, value: TFRStageTitle(stage), required: required })); return { ok: false, issue: "Locked" }; }
  if (options.spendCharges === true) { const relics = await TFRLoadRelics(); const relic = relics.find(r => r.id === relicId); const def = relic ? TFRGetAbilityDefinition(relic, slot) : null; if (def?.charges && !(await TFRSpendRelicCharges(item, def.charges))) return { ok: false, issue: "Not enough charges" }; }
  return TFRApplyRelicAbilityRuntime(actor, relicId, slot, options);
}

function TFRTextHasNeedle(haystack, needle) {
  const value = String(needle || "").trim().toLowerCase();
  if (!value) return false;
  return String(haystack || "").toLowerCase().includes(value);
}

export function TFRNormalizeChatHaystack(message) {
  const text = TFRChatMessagePlainText(message).toLowerCase();
  let flagText = "";
  try { flagText = JSON.stringify(message?.flags || {}).toLowerCase(); } catch (err) {}
  return `${text} ${flagText}`.replace(/\s+/g, " ").trim();
}

export function TFRChatMentionsRelicItem(message, actor, relicId, item, haystack = null) {
  haystack = haystack ?? TFRNormalizeChatHaystack(message);
  const names = [
    item?.name,
    relicId,
    String(relicId || "").replaceAll("_", " "),
    item?.getFlag?.(TFR_MODULE_ID, "relicId")
  ].filter(Boolean);
  if (names.some(n => TFRTextHasNeedle(haystack, n))) return true;

  let flagText = "";
  try { flagText = JSON.stringify(message?.flags || {}).toLowerCase(); } catch (err) {}
  const ids = [item?.id, item?._id, item?.uuid].filter(Boolean).map(x => String(x).toLowerCase());
  return ids.some(id => id && flagText.includes(id));
}

function TFRActivityBadgeScore(def, slot, haystack) {
  if (!def) return 0;
  const h = ` ${String(haystack || "").toLowerCase().replace(/\s+/g, " ")} `;
  let score = 0;

  const name = String(def.name || "").toLowerCase();
  if (name && h.includes(name)) score += 100;

  // Some dnd5e v5 item chat cards show only the item name plus badge chips, not the activity name.
  // These badge matches identify the used activity without depending on fragile HTML structure.
  const activation = String(def.activation || "").toLowerCase();
  if (activation === "bonus" && (h.includes(" bonus action ") || h.includes(" bonus "))) score += 12;
  else if (activation === "reaction" && h.includes(" reaction ")) score += 12;
  else if (activation === "action" && h.includes(" action ") && !h.includes(" bonus action ")) score += 8;
  else if (activation === "special" && h.includes(" special ")) score += 8;

  const range = Number(def.range || 0);
  if (range > 0) {
    const rangeBits = [`${range} ft`, `${range}ft`, `${range} feet`];
    if (rangeBits.some(bit => h.includes(bit))) score += 12;
  }

  const target = String(def.target || "").toLowerCase();
  if (target === "space" && h.includes(" space ")) score += 12;
  else if (target === "self" && h.includes(" self ")) score += 12;
  else if (target === "creature" && h.includes(" creature ")) score += 8;

  // Newer dnd5e flags often include the activity id/key directly. If present, trust it strongly.
  if (h.includes(`"${slot}"`) || h.includes(`/${slot}`) || h.includes(`.${slot}`)) score += 80;
  return score;
}

function TFRInferRelicSlotFromChatBadges(relicId, item, haystack) {
  const defs = TFRAbilityDefinitions()[relicId] || {};
  const stage = TFRRelicItemStage(item);
  const signatureUnlocked = TFRRelicItemSignatureUnlocked(item);
  const allowed = TFRUnlockedActivitySlots(stage, signatureUnlocked);
  let best = null;
  let tied = false;

  for (const slot of allowed) {
    const def = defs[slot];
    if (!def) continue;
    const score = TFRActivityBadgeScore(def, slot, haystack);
    if (!best || score > best.score) {
      best = { relicId, slot, name: def.name, score };
      tied = false;
    } else if (best && score === best.score && score > 0) {
      tied = true;
    }
  }

  // 20+ normally means at least two reliable badge hits, or a direct name/slot hit.
  if (best && best.score >= 20 && !tied) return best;
  return null;
}

/**
 * The activity a dnd5e usage card was made from, or null. dnd5e 6 keeps it on the message's system
 * data (and leaves the card content and flags empty); dnd5e 5 recorded it in flags.dnd5e.activity.
 */
export function TFRChatMessageActivity(message) {
  const fromSystem = message?.system?.activity;
  if (fromSystem && typeof fromSystem === "object" && fromSystem.item) return fromSystem;
  try {
    const associated = message?.getAssociatedActivity?.();
    if (associated) return associated;
  } catch (err) {}
  const uuid = message?.flags?.dnd5e?.activity?.uuid;
  return uuid ? fromUuidSync(uuid) : null;
}

/** The relic id and slot of the relic activity a usage card was made from, or null. */
export function TFRRelicSlotFromChatActivity(message) {
  const activity = TFRChatMessageActivity(message);
  const relicId = activity?.item?.getFlag?.(TFR_MODULE_ID, "relicId");
  if (!relicId) return null;
  const slot = TFRGetActivitySlot(activity);
  const slots = TFRAbilityDefinitions()[relicId] || {};
  return slot && slots[slot] ? { relicId, slot, name: activity.name || slots[slot].name, score: 100 } : null;
}

export function TFRRelicAbilityFromChatMessage(message, actor = null) {
  if (!message || !actor) return null;
  if (message.getFlag?.(TFR_MODULE_ID, "tfrAutomationMessage")) return null;
  if (message.getFlag?.(TFR_MODULE_ID, "genericRelicAutomationHandled")) return null;

  // The activity recorded on the card is checked first: badge and name matching can pick the wrong
  // ability when two share an activation and target, or when the relic's name contains another
  // ability's name (the Lyre of the First Song's card matched its signature, The First Song).
  const fromActivity = TFRRelicSlotFromChatActivity(message);
  if (fromActivity) return fromActivity;

  const haystack = TFRNormalizeChatHaystack(message);
  const defs = TFRAbilityDefinitions();

  for (const [relicId, slots] of Object.entries(defs)) {
    const item = TFRFindActorRelicItem(actor, relicId);
    if (!item) continue;
    if (!TFRChatMentionsRelicItem(message, actor, relicId, item, haystack)) continue;

    // dnd5e 5 cards: the activity id in flags.dnd5e.activity.
    const activityId = message.flags?.dnd5e?.activity?.id || null;
    const flaggedActivity = activityId ? item.system?.activities?.get?.(activityId) : null;
    const flaggedSlot = flaggedActivity ? TFRGetActivitySlot(flaggedActivity) : null;
    if (flaggedSlot && slots[flaggedSlot]) {
      return { relicId, slot: flaggedSlot, name: flaggedActivity.name || slots[flaggedSlot].name, score: 100 };
    }

    // Older cards without the activity: infer by explicit ability names, activity ids, and dnd5e
    // badge chips such as REACTION + SELF or BONUS ACTION + 30 FT + 1 SPACE.
    const inferred = TFRInferRelicSlotFromChatBadges(relicId, item, haystack);
    if (inferred) return inferred;
  }
  return null;
}


