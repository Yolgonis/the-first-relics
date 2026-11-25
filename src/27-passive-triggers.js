import "./25-hooks.js"; // keeps the original load order
import { TFRNotifyWarn, TFRT, TFR_MODULE_ID } from "./00-core.js";
import { TFRGetStageData, TFRMode } from "./01-stages-and-text.js";
import { TFRRelicFeaturesAreBlocked } from "./02-attunement.js";
import {
  TFRPassiveName,
  TFRRelicBonusEffect,
  TFRRelicItemSignatureUnlocked,
  TFRRelicItemStage,
  TFRUnlockedPassiveCount
} from "./04-items.js";
import { TFRGetRelicById } from "./06-relic-state.js";
import { TFREscapeHtml } from "./08-affinity-events.js";
import { TFRChatFlags, TFRResolveActor } from "./11-effect-helpers.js";
import { TFRApplyTempHp, TFRMonkFocusItem, TFRRegainFeatureUses, TFRRegainFocus, TFRRegainPactSlot, TFRRegainSpellSlot } from "./14-ability-runtime.js";
import { TFRDistanceFeet } from "./19-fey-step.js";

// Event-triggered passive features: combat start, dropping to 0 hit points, long rests, casting
// spells, rolling initiative, healing, and defeating a hostile creature. Passives that need GM judgment
// stay manual. A trigger only fires while its passive is unlocked by the item's stage and the
// relic's effects are active (equipped, attuned where required, not refusing attunement).
// Once-per-long-rest uses are stored on the relic item and cleared by a long rest.

/** True when the passive at `index` is unlocked on this relic item and its effects are active. */
function TFRPassiveActive(item, index) {
  if (!item?.getFlag?.(TFR_MODULE_ID, "relicId")) return false;
  if (index >= TFRUnlockedPassiveCount(TFRRelicItemStage(item))) return false;
  if (TFRRelicFeaturesAreBlocked(item)) return false;
  const bonus = TFRRelicBonusEffect(item);
  if (bonus) return !bonus.disabled && !bonus.isSuppressed;
  return !!item.system?.equipped && (item.system?.attunement !== "required" || !!item.system?.attuned);
}

/** The actor's relic item with an active passive at `index`, or null. */
function TFRActivePassiveItem(actor, relicId, index) {
  const item = actor?.items?.find?.(candidate => candidate.getFlag?.(TFR_MODULE_ID, "relicId") === relicId);
  return item && TFRPassiveActive(item, index) ? item : null;
}

/** The relic bonus of an item, read from its relic bonus effect so synchronous hooks can use it. */
function TFRItemRelicBonus(item) {
  const effect = TFRRelicBonusEffect(item);
  const change = (effect?.changes || []).find(c => c.key === "system.attributes.ac.bonus");
  return Math.abs(Number(String(change?.value ?? "1").replace(/\s/g, ""))) || 1;
}

/**
 * The started combat the actor takes part in. game.combat only follows the scene the user is
 * viewing, so a GM looking at another scene would otherwise lose per-round limits.
 */
function TFRActorCombat(actor) {
  const inCombat = combat => combat?.started && combat.combatants.some(combatant => combatant.actor === actor);
  return inCombat(game.combat) ? game.combat : game.combats?.find(inCombat) || null;
}

/** "combatId:round" for the actor's combat, or null outside combat. */
function TFRCombatRoundKey(actor) {
  const combat = TFRActorCombat(actor);
  return combat ? `${combat.id}:${combat.round}` : null;
}

function TFRCombatTurnKey(actor) {
  const combat = TFRActorCombat(actor);
  return combat ? `${combat.id}:${combat.round}:${combat.turn}` : null;
}

function TFRPassiveUsed(item, index) {
  return !!item?.getFlag?.(TFR_MODULE_ID, `passiveUses.p${index}`);
}

function TFRIsResponsibleGM() {
  return !!game.users?.activeGM?.isSelf;
}

function TFRProficiency(actor) {
  return Number(actor?.system?.attributes?.prof) || 0;
}

async function TFRPassiveRelicBonus(item) {
  const relic = await TFRGetRelicById(item.getFlag(TFR_MODULE_ID, "relicId"));
  return Number(TFRGetStageData(relic, TFRRelicItemStage(item), TFRRelicItemSignatureUnlocked(item))?.bonus) || 1;
}

/** Posts a short chat card naming the passive that just triggered. */
async function TFRPassiveChat(actor, item, index, text) {
  const relic = await TFRGetRelicById(item.getFlag(TFR_MODULE_ID, "relicId"));
  const passive = TFRPassiveName(relic?.features?.passives?.[index]) || item.name;
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ passiveTrigger: true, relicId: relic?.id, passiveIndex: index }),
    content: `<h3>${TFREscapeHtml(passive)}</h3><p><em>${TFREscapeHtml(item.name)}</em></p><p>${text}</p>`
  });
}

/** Reads an update value given either as a flat "a.b.c" key or as a nested object. */
function TFRUpdateValue(changes, path) {
  return path in (changes || {}) ? changes[path] : foundry.utils.getProperty(changes || {}, path);
}

function TFRSetUpdateValue(changes, path, value) {
  if (path in changes) changes[path] = value;
  else foundry.utils.setProperty(changes, path, value);
}

function TFRActorToken(actor) {
  return actor?.token?.object || actor?.getActiveTokens?.()[0] || null;
}

/** Token center from its document position, so tokens mid-animation measure where they really are. */
function TFRTokenCenterPoint(token) {
  const doc = token?.document || token;
  const size = canvas?.grid?.size || 100;
  return { x: (doc?.x || 0) + ((doc?.width || 1) * size) / 2, y: (doc?.y || 0) + ((doc?.height || 1) * size) / 2 };
}

// ---- Combat start: Unseen Hunter (Umbral Veil), Prepared Mind, Wellspring, King's Mercy, Endless Seasons, Endless Refrain, Undying Fury, Second Dawn, Pact Reservoir, Font of Divinity ----

async function TFRStartCombatPassives(combat) {
  const actors = new Map();
  for (const combatant of combat.combatants) if (combatant.actor) actors.set(combatant.actor.uuid, combatant.actor);
  const midiAttackFlags = game.modules.get("midi-qol")?.active && game.modules.get("dae")?.active;

  for (const actor of actors.values()) {
    const existing = new Set(actor.effects.filter(effect => effect.getFlag(TFR_MODULE_ID, "combatId") === combat.id)
      .map(effect => effect.getFlag(TFR_MODULE_ID, "passiveTrigger")));
    const effects = [];


    // The first-attack advantage and damage need Midi-QOL with DAE to expire after one attack.
    const veil = midiAttackFlags ? TFRActivePassiveItem(actor, "cloak_shadowfell", 3) : null;
    if (veil && !existing.has("unseenHunter")) {
      const damage = "+2d8[necrotic]";
      effects.push({
        name: `${veil.name} - ${TFRT("Unseen Hunter")}`,
        img: veil.img,
        origin: veil.uuid,
        changes: [
          { key: "flags.midi-qol.advantage.attack.all", mode: TFRMode("OVERRIDE"), value: "1", priority: 20 },
          ...["mwak", "rwak", "msak", "rsak"].map(type => ({ key: `system.bonuses.${type}.damage`, mode: TFRMode("ADD"), value: damage, priority: 20 }))
        ],
        duration: { combat: combat.id },
        flags: {
          dae: { specialDuration: ["1Attack"] },
          [TFR_MODULE_ID]: { passiveTrigger: "unseenHunter", combatId: combat.id }
        }
      });
    }

    if (effects.length) await actor.createEmbeddedDocuments("ActiveEffect", effects);

    // Prepared Mind (Mantle of the First Seer): one expended slot back at initiative, once per long rest.
    const mantle = TFRActivePassiveItem(actor, "mantle_first_seer", 2);
    if (mantle && !TFRPassiveUsed(mantle, 2)) {
      const level = await TFRRegainSpellSlot(actor, await TFRPassiveRelicBonus(mantle), TFRT("Prepared Mind"));
      if (level) {
        await mantle.setFlag(TFR_MODULE_ID, "passiveUses.p2", true);
        await TFRPassiveChat(actor, mantle, 2, TFRT("{actor} regains a level {level} spell slot.", { actor: TFREscapeHtml(actor.name), level }));
      }
    }

    // Wellspring (Blood of the First Dragon): Sorcery Points equal to the relic bonus at initiative.
    const blood = TFRActivePassiveItem(actor, "blood_first_dragon", 0);
    if (blood) {
      const regained = await TFRRegainFeatureUses(actor, "font-of-magic", await TFRPassiveRelicBonus(blood), TFRT("Wellspring"));
      if (regained) await TFRPassiveChat(actor, blood, 0, TFRT("{actor} regains {amount} Sorcery Points.", { actor: TFREscapeHtml(actor.name), amount: regained }));
    }

    // King's Mercy (Crown of the Conqueror): five times the relic bonus back into Lay on Hands.
    const mercy = TFRActivePassiveItem(actor, "crown_conqueror", 2);
    if (mercy) {
      const regained = await TFRRegainFeatureUses(actor, "lay-on-hands", 5 * await TFRPassiveRelicBonus(mercy), TFRT("King's Mercy"));
      if (regained) await TFRPassiveChat(actor, mercy, 2, TFRT("{actor} regains {amount} hit points in the Lay on Hands pool.", { actor: TFREscapeHtml(actor.name), amount: regained }));
    }

    // Endless Seasons (Heart of Yggdrasil): one expended Wild Shape use back at initiative.
    const seasons = TFRActivePassiveItem(actor, "heart_yggdrasil", 1);
    if (seasons) {
      const regained = await TFRRegainFeatureUses(actor, "wild-shape", 1, TFRT("Endless Seasons"));
      if (regained) await TFRPassiveChat(actor, seasons, 1, TFRT("{actor} regains a use of Wild Shape.", { actor: TFREscapeHtml(actor.name) }));
    }

    // Endless Refrain (Lyre of the First Song): one expended Bardic Inspiration use back at initiative.
    const refrain = TFRActivePassiveItem(actor, "lyre_first_song", 0);
    if (refrain) {
      const regained = await TFRRegainFeatureUses(actor, "bardic-inspiration", 1, TFRT("Endless Refrain"));
      if (regained) await TFRPassiveChat(actor, refrain, 0, TFRT("{actor} regains a use of Bardic Inspiration.", { actor: TFREscapeHtml(actor.name) }));
    }

    // Undying Fury (Girdle of the Unbroken): one expended Rage use back at initiative.
    const fury = TFRActivePassiveItem(actor, "girdle_unbroken", 1);
    if (fury) {
      const regained = await TFRRegainFeatureUses(actor, "rage", 1, TFRT("Undying Fury"));
      if (regained) await TFRPassiveChat(actor, fury, 1, TFRT("{actor} regains a use of Rage.", { actor: TFREscapeHtml(actor.name) }));
    }

    // Second Dawn (Aegis of the Dawn): one expended Second Wind use back at initiative.
    const dawn = TFRActivePassiveItem(actor, "aegis_dawn", 0);
    if (dawn) {
      const regained = await TFRRegainFeatureUses(actor, "second-wind", 1, TFRT("Second Dawn"));
      if (regained) await TFRPassiveChat(actor, dawn, 0, TFRT("{actor} regains a use of Second Wind.", { actor: TFREscapeHtml(actor.name) }));
    }

    // Pact Reservoir (Chains of the Patron): one expended Pact Magic slot back at initiative.
    const reservoir = TFRActivePassiveItem(actor, "chains_patron", 1);
    if (reservoir) {
      const level = await TFRRegainPactSlot(actor, TFRT("Pact Reservoir"));
      if (level) await TFRPassiveChat(actor, reservoir, 1, TFRT("{actor} regains a Pact Magic slot.", { actor: TFREscapeHtml(actor.name) }));
    }

    // Font of Divinity (Vestments of the First Saint): one expended Channel Divinity use back at initiative.
    const font = TFRActivePassiveItem(actor, "vestments_first_saint", 2);
    if (font) {
      const regained = await TFRRegainFeatureUses(actor, "channel-divinity-cleric", 1, TFRT("Font of Divinity"));
      if (regained) await TFRPassiveChat(actor, font, 2, TFRT("{actor} regains a use of Channel Divinity.", { actor: TFREscapeHtml(actor.name) }));
    }
  }
}

async function TFRRemoveCombatPassives(combat, triggers = null) {
  const actors = new Map();
  for (const combatant of combat.combatants) if (combatant.actor) actors.set(combatant.actor.uuid, combatant.actor);
  for (const actor of actors.values()) {
    const ids = actor.effects
      .filter(effect => effect.getFlag(TFR_MODULE_ID, "combatId") === combat.id
        && (!triggers || triggers.includes(effect.getFlag(TFR_MODULE_ID, "passiveTrigger"))))
      .map(effect => effect.id);
    if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

// ---- Combat start: Banner of Order (Crown) - the GM chooses the allies ----

async function TFRBannerOfOrder(combat) {
  const seen = new Set();
  for (const combatant of combat.combatants) {
    const bearer = combatant.actor;
    if (!bearer || seen.has(bearer.uuid)) continue;
    seen.add(bearer.uuid);
    const crown = TFRActivePassiveItem(bearer, "crown_conqueror", 1);
    if (!crown) continue;
    const limit = TFRProficiency(bearer);
    const amount = limit + await TFRPassiveRelicBonus(crown);
    const disposition = combatant.token?.disposition;
    const allies = combat.combatants.filter(other => other.actor && other.actor !== bearer && other.token?.disposition === disposition);
    if (!allies.length) continue;
    const rows = allies.map(ally => `<label class="checkbox"><input type="checkbox" name="ally" value="${ally.id}"> ${TFREscapeHtml(ally.name)}</label>`).join("");
    const chosen = await foundry.applications.api.DialogV2.wait({
      window: { title: TFRT("Banner of Order") },
      content: `<p>${TFRT("{bearer} raises the banner. Choose up to {limit} allies; each gains {amount} temporary hit points.", { bearer: TFREscapeHtml(bearer.name), limit, amount })}</p><div class="form-group stacked">${rows}</div>`,
      buttons: [
        { action: "apply", label: TFRT("Apply"), default: true, callback: (event, button) => [...button.form.querySelectorAll("input[name=ally]:checked")].map(input => input.value) },
        { action: "skip", label: TFRT("Skip"), callback: () => [] }
      ],
      rejectClose: false
    }) || [];
    const targets = chosen.slice(0, limit).map(id => combat.combatants.get(id)?.actor).filter(Boolean);
    for (const ally of targets) await TFRApplyTempHp(ally, amount, TFRT("Banner of Order"));
    if (chosen.length > limit) TFRNotifyWarn(TFRT("Banner of Order: only the first {limit} allies were chosen.", { limit }));
    if (targets.length) await TFRPassiveChat(bearer, crown, 1, TFRT("{allies} gain {amount} temporary hit points.", { allies: targets.map(a => TFREscapeHtml(a.name)).join(", "), amount }));
  }
}

// ---- Dropping to 0 hit points: First Light (Aegis), Endless Spring (Heart of Yggdrasil) ----

/** Finds a passive that keeps `actor` at 1 hit point, or null. */
function TFRFindZeroHpSave(actor) {
  const aegis = TFRActivePassiveItem(actor, "aegis_dawn", 3);
  if (aegis?.isOwner && !TFRPassiveUsed(aegis, 3)) return { item: aegis, index: 3, bearer: actor, saved: actor };

  const token = TFRActorToken(actor);
  if (!token || !canvas?.tokens?.placeables) return null;
  for (const other of canvas.tokens.placeables) {
    const bearer = other.actor;
    if (!bearer || other === token || bearer.uuid === actor.uuid) continue;
    if (other.document.disposition !== token.document.disposition) continue;
    const heart = TFRActivePassiveItem(bearer, "heart_yggdrasil", 2);
    if (!heart?.isOwner || TFRPassiveUsed(heart, 2)) continue;
    if (TFRDistanceFeet(TFRTokenCenterPoint(other), TFRTokenCenterPoint(token)) > 30) continue;
    return { item: heart, index: 2, bearer, saved: actor };
  }
  return null;
}

function TFRPreventDropToZero(actor, changes, options) {
  if (options?.tfrPassive) return;
  const next = TFRUpdateValue(changes, "system.attributes.hp.value");
  if (typeof next !== "number" || next > 0) return;
  if ((Number(actor.system?.attributes?.hp?.value) || 0) <= 0) return;
  const save = TFRFindZeroHpSave(actor);
  if (!save) return;

  TFRSetUpdateValue(changes, "system.attributes.hp.value", 1);
  (async () => {
    await save.item.setFlag(TFR_MODULE_ID, `passiveUses.p${save.index}`, true);
    const text = save.bearer === save.saved
      ? TFRT("{actor} drops to 1 hit point instead of 0.", { actor: TFREscapeHtml(save.saved.name) })
      : TFRT("{actor} drops to 1 hit point instead of 0, sustained by {bearer}.", { actor: TFREscapeHtml(save.saved.name), bearer: TFREscapeHtml(save.bearer.name) });
    await TFRPassiveChat(save.bearer, save.item, save.index, text);
  })().catch(error => console.warn("The First Relics | Could not record a 0 HP passive.", error));
}

// ---- Long rest: reset once-per-rest uses ----

async function TFRPassivesAfterRest(actor, result) {
  if (!result?.longRest || !actor?.isOwner) return;
  for (const item of actor.items.filter(candidate => candidate.getFlag?.(TFR_MODULE_ID, "passiveUses"))) {
    await item.unsetFlag(TFR_MODULE_ID, "passiveUses");
  }
}

// ---- Hunter's Mark: Unbroken Mark, Shroud of Leaves, Marked Quarry (Cloak of Fey Paths) ----
// The avatar doubles the mark's damage dice and the signature maximizes them, through flags their
// effects set on the bearer.

function TFRIsHuntersMark(item) {
  return item?.type === "spell" && item.system?.identifier === "hunters-mark";
}

/** Unbroken Mark: casting or moving Hunter's Mark doesn't start concentration. */
function TFRUnbrokenMark(activity, usageConfig) {
  if (!TFRIsHuntersMark(activity?.item) || !usageConfig?.concentration) return;
  if (!TFRActivePassiveItem(activity.actor, "cloak_feywilds", 0)) return;
  usageConfig.concentration.begin = false;
  usageConfig.concentration.end = null;
}

/** Shroud of Leaves: temporary hit points when Hunter's Mark is cast or moved. */
async function TFRShroudOfLeaves(actor) {
  const cloak = TFRActivePassiveItem(actor, "cloak_feywilds", 1);
  if (!cloak) return;
  const wisdom = Number(actor.system?.abilities?.wis?.mod) || 0;
  await TFRApplyTempHp(actor, Math.max(1, wisdom + await TFRPassiveRelicBonus(cloak)), TFRT("Shroud of Leaves"));
}

/** Marked Quarry (die step), the avatar (doubled dice) and the signature (maximized) on Hunter's Mark damage. */
function TFRHuntersMarkDamage(config) {
  const activity = config?.subject;
  if (activity?.type !== "damage" || !TFRIsHuntersMark(activity.item)) return;
  const actor = activity.actor;
  const quarry = TFRActivePassiveItem(actor, "cloak_feywilds", 2);
  const twin = !!actor?.getFlag?.(TFR_MODULE_ID, "cloakTwinMark");
  const max = !!actor?.getFlag?.(TFR_MODULE_ID, "cloakMaxMark");
  if (!quarry && !twin && !max) return;
  const roll = config.rolls?.[0];
  if (!roll?.parts?.length) return;
  let flatBonus = 0;
  roll.parts = roll.parts.map(part => String(part).replace(/(\d*)d(\d+)/g, (match, count, faces) => {
    let number = Number(count) || 1;
    let size = Number(faces);
    if (quarry) {
      if (size < 10) size += 2;
      else flatBonus = TFRItemRelicBonus(quarry);
    }
    if (twin) number *= 2;
    return max ? String(number * size) : `${number}d${size}`;
  }));
  if (flatBonus) roll.parts.push(String(flatBonus));
}

// ---- Casting a spell of 1st level or higher: Living Chronicle (Mantle of the First Seer) ----

/** Binding Ward (Chains of the Patron): once per turn, temporary hit points when a Pact Magic slot is spent. */
async function TFRBindingWard(actor, spell, usage) {
  const slot = usage?.spell?.slot;
  const pactCast = slot === "pact" || (!slot && spell.system?.method === "pact");
  if (!pactCast) return;
  const chains = TFRActivePassiveItem(actor, "chains_patron", 2);
  if (!chains) return;
  const turn = TFRCombatTurnKey(actor);
  if (turn && chains.getFlag(TFR_MODULE_ID, "bindingWardTurn") === turn) return;
  if (turn) await chains.setFlag(TFR_MODULE_ID, "bindingWardTurn", turn);
  const warlock = Number(actor.classes?.warlock?.system?.levels) || 0;
  await TFRApplyTempHp(actor, warlock + await TFRPassiveRelicBonus(chains), TFRT("Binding Ward"));
}

async function TFRPassivesAfterActivity(activity, usage) {
  const actor = activity?.actor;
  const spell = activity?.item;
  if (actor?.isOwner && TFRIsHuntersMark(spell) && activity.type === "utility") await TFRShroudOfLeaves(actor);
  if (!actor?.isOwner || spell?.type !== "spell" || !(Number(spell.system?.level) >= 1)) return;
  await TFRBindingWard(actor, spell, usage);
  const mantle = TFRActivePassiveItem(actor, "mantle_first_seer", 1);
  if (!mantle) return;
  const turn = TFRCombatTurnKey(actor);
  if (turn && mantle.getFlag(TFR_MODULE_ID, "livingChronicleTurn") === turn) return;
  if (turn) await mantle.setFlag(TFR_MODULE_ID, "livingChronicleTurn", turn);
  await TFRApplyTempHp(actor, TFRProficiency(actor) + await TFRPassiveRelicBonus(mantle), TFRT("Living Chronicle"));
}

// ---- Divine Smite damage: Crowned Smite (Crown of the Conqueror) ----

function TFRAddCrownedSmite(config) {
  const activity = config?.subject;
  const spell = activity?.item;
  if (activity?.type !== "damage" || spell?.type !== "spell" || spell.system?.identifier !== "divine-smite") return;
  const crown = TFRActivePassiveItem(activity.actor, "crown_conqueror", 0);
  if (!crown) return;
  const roll = config.rolls?.[0];
  if (roll?.parts) roll.parts.push(`1d8[radiant] + ${TFRItemRelicBonus(crown)}`);
}

// ---- Class spell damage: Arcane Edge (Mantle), Elemental Wrath (Blood), Primal Wrath (Heart), Dissonant Edge (Lyre), Radiant Sermon (Vestments) ----

/** Spell damage passives: once per turn, the ability modifier + relic bonus on a spell of that class. */
const TFR_SPELL_DAMAGE_PASSIVES = [
  { relicId: "mantle_first_seer", index: 3, sourceClass: "wizard", ability: "int", flag: "arcaneEdgeTurn" },
  { relicId: "blood_first_dragon", index: 3, sourceClass: "sorcerer", ability: "cha", flag: "elementalWrathTurn" },
  { relicId: "heart_yggdrasil", index: 3, sourceClass: "druid", ability: "wis", flag: "primalWrathTurn" },
  { relicId: "lyre_first_song", index: 3, sourceClass: "bard", ability: "cha", flag: "dissonantEdgeTurn" },
  { relicId: "vestments_first_saint", index: 3, sourceClass: "cleric", ability: "wis", flag: "radiantSermonTurn" }
];

function TFRAddSpellDamagePassive(config) {
  const activity = config?.subject;
  const spell = activity?.item;
  if (!activity || activity.type === "heal" || spell?.type !== "spell") return;
  const passive = TFR_SPELL_DAMAGE_PASSIVES.find(entry => entry.sourceClass === spell.system?.sourceClass);
  const relic = passive ? TFRActivePassiveItem(activity.actor, passive.relicId, passive.index) : null;
  if (!relic) return;
  const turn = TFRCombatTurnKey(activity.actor);
  if (turn && relic.getFlag(TFR_MODULE_ID, passive.flag) === turn) return;
  const roll = config.rolls?.[0];
  if (!roll?.parts) return;
  const modifier = Number(activity.actor.system?.abilities?.[passive.ability]?.mod) || 0;
  roll.parts.push(String(Math.max(0, modifier) + TFRItemRelicBonus(relic)));
  if (turn && relic.isOwner) relic.setFlag(TFR_MODULE_ID, passive.flag, turn).catch(error => console.warn("The First Relics | Could not record a spell damage passive.", error));
}

// ---- Healing given and received: Saint's Grace (Vestments), Nature's Blessing (Yggdrasil) ----

function TFRAddHealingGiven(config) {
  const activity = config?.subject;
  if (activity?.type !== "heal") return;
  const types = activity.healing?.types;
  if (types?.size && !types.has("healing")) return;
  const actor = activity.actor;
  if (!TFRActivePassiveItem(actor, "vestments_first_saint", 1)) return;
  const roll = config.rolls?.[0];
  if (roll?.parts) roll.parts.push(String(TFRProficiency(actor)));
}

function TFRAddHealingReceived(actor, damages) {
  if (!TFRActivePassiveItem(actor, "heart_yggdrasil", 0)) return;
  const healing = damages.find(damage => damage.type === "healing" && Number(damage.value) > 0);
  if (healing) healing.value = Number(healing.value) + TFRProficiency(actor);
}

// ---- Damage while raging: Will Before Wound (Girdle of the Unbroken) ----

function TFRIsRaging(actor) {
  for (const effect of actor?.allApplicableEffects?.() ?? []) {
    if (!effect.disabled && !effect.isSuppressed && /\brage\b/i.test(effect.name)) return true;
  }
  return false;
}

/** Primal Hide: while raging, elemental damage the bearer doesn't already resist is halved. */
const TFR_PRIMAL_HIDE_TYPES = ["acid", "cold", "fire", "lightning", "poison", "thunder"];

function TFRPrimalHideDamage(actor, damages) {
  if (!TFRActivePassiveItem(actor, "girdle_unbroken", 0) || !TFRIsRaging(actor)) return;
  const resisted = actor.system?.traits?.dr?.value;
  for (const damage of damages) {
    if (!TFR_PRIMAL_HIDE_TYPES.includes(damage.type) || resisted?.has?.(damage.type)) continue;
    damage.value = Math.floor((Number(damage.value) || 0) / 2);
  }
}

/** The Girdle whose Will Before Wound can still reduce damage this round, or null. */
function TFRWillBeforeWoundItem(actor) {
  const girdle = TFRActivePassiveItem(actor, "girdle_unbroken", 2);
  if (!girdle || !TFRIsRaging(actor)) return null;
  const round = TFRCombatRoundKey(actor);
  return round && girdle.getFlag(TFR_MODULE_ID, "willBeforeWoundRound") === round ? null : girdle;
}

// Damage previews also call calculateDamage, so the once-per-round use is recorded only when the
// damage is actually applied (TFRMarkWillBeforeWound).
function TFRReduceRagingDamage(actor, damages) {
  const girdle = TFRWillBeforeWoundItem(actor);
  if (!girdle) return;
  let remaining = TFRItemRelicBonus(girdle);
  for (const damage of [...damages].filter(d => !(d.type in CONFIG.DND5E.healingTypes)).sort((a, b) => b.value - a.value)) {
    const cut = Math.min(remaining, Math.max(0, Number(damage.value) || 0));
    damage.value -= cut;
    remaining -= cut;
    if (!remaining) break;
  }
}

function TFRMarkWillBeforeWound(actor, amount) {
  if (!(amount > 0)) return;
  const girdle = TFRWillBeforeWoundItem(actor);
  const round = TFRCombatRoundKey(actor);
  if (!girdle || !round || !girdle.isOwner) return;
  girdle.setFlag(TFR_MODULE_ID, "willBeforeWoundRound", round).catch(error => console.warn("The First Relics | Could not record Will Before Wound.", error));
}

// ---- Sneak Attack and damage taken: Deepened Shadows, Umbral Shroud (Cloak of the Umbral Veil) ----

/** Deepened Shadows: one extra die on the Sneak Attack damage roll. */
function TFRAddDeepenedShadows(config) {
  const activity = config?.subject;
  if (activity?.type !== "damage" || activity.item?.system?.identifier !== "sneak-attack") return;
  if (!TFRActivePassiveItem(activity.actor, "cloak_shadowfell", 0)) return;
  const roll = config.rolls?.[0];
  if (roll?.parts) roll.parts.push("1d6");
}

function TFRUmbralShroudItem(actor) {
  const veil = TFRActivePassiveItem(actor, "cloak_shadowfell", 1);
  if (!veil) return null;
  const round = TFRCombatRoundKey(actor);
  return round && veil.getFlag(TFR_MODULE_ID, "umbralShroudRound") === round ? null : veil;
}

// Like Will Before Wound: previews also call calculateDamage, so the use is recorded on apply.
function TFRReduceUmbralShroudDamage(actor, damages) {
  const veil = TFRUmbralShroudItem(actor);
  if (!veil) return;
  let remaining = Math.max(0, Number(actor.system?.abilities?.dex?.mod) || 0) + TFRItemRelicBonus(veil);
  for (const damage of [...damages].filter(d => !(d.type in CONFIG.DND5E.healingTypes)).sort((a, b) => b.value - a.value)) {
    const cut = Math.min(remaining, Math.max(0, Number(damage.value) || 0));
    damage.value -= cut;
    remaining -= cut;
    if (!remaining) break;
  }
}

function TFRMarkUmbralShroud(actor, amount) {
  if (!(amount > 0)) return;
  const veil = TFRUmbralShroudItem(actor);
  const round = TFRCombatRoundKey(actor);
  if (!veil || !round || !veil.isOwner) return;
  veil.setFlag(TFR_MODULE_ID, "umbralShroudRound", round).catch(error => console.warn("The First Relics | Could not record Umbral Shroud.", error));
}

// ---- Warlock damage: Borrowed Power (Chains of the Patron) ----

function TFRAddBorrowedPower(config) {
  const activity = config?.subject;
  const spell = activity?.item;
  if (!activity || activity.type === "heal" || spell?.type !== "spell") return;
  const warlockSpell = spell.system?.sourceClass === "warlock" || spell.system?.identifier === "eldritch-blast";
  if (!warlockSpell) return;
  const chains = TFRActivePassiveItem(activity.actor, "chains_patron", 0);
  if (!chains) return;
  const turn = TFRCombatTurnKey(activity.actor);
  if (turn && chains.getFlag(TFR_MODULE_ID, "borrowedPowerTurn") === turn) return;
  const roll = config.rolls?.[0];
  if (!roll?.parts) return;
  roll.parts.push(String(TFRItemRelicBonus(chains)));
  if (turn && chains.isOwner) chains.setFlag(TFR_MODULE_ID, "borrowedPowerTurn", turn).catch(error => console.warn("The First Relics | Could not record Borrowed Power.", error));
}

/** Diagnostic: the state of every relic passive on an actor (unlocked, active, used this rest). */
export function TFRPassiveStatus(actorOrId) {
  const actor = TFRResolveActor(actorOrId);
  if (!actor) return [];
  return actor.items.filter(item => item.getFlag?.(TFR_MODULE_ID, "relicId")).flatMap(item => [0, 1, 2, 3].map(index => ({
    relic: item.name,
    passive: index,
    unlocked: index < TFRUnlockedPassiveCount(TFRRelicItemStage(item)),
    active: TFRPassiveActive(item, index),
    usedThisRest: TFRPassiveUsed(item, index),
    raging: TFRIsRaging(actor)
  })));
}

// ---- Turn start: Inner Dragon Manifest (Bands of the Inner Dragon) regains 1 Focus Point ----

async function TFRInnerDragonTurnFocus(combat) {
  const actor = combat?.started ? combat.combatant?.actor : null;
  if (!actor?.getFlag(TFR_MODULE_ID, "innerDragonFocus")) return;
  const item = TFRMonkFocusItem(actor);
  if (!item || !(Number(item.system.uses.spent) > 0)) return;
  await TFRRegainFocus(actor, 1, TFRT("Inner Dragon Manifest"));
}

export function TFRRegisterPassiveTriggers() {
  if (globalThis.__TFR_PASSIVE_TRIGGERS__) return;
  globalThis.__TFR_PASSIVE_TRIGGERS__ = true;

  Hooks.on("updateCombat", (combat, changed) => {
    if (!TFRIsResponsibleGM()) return;
    if ("turn" in changed || "round" in changed) TFRInnerDragonTurnFocus(combat).catch(error => console.warn("The First Relics | Inner Dragon focus failed.", error));
    if (!("round" in changed)) return;
    const run = combat.round === 1
      ? TFRStartCombatPassives(combat).then(() => TFRBannerOfOrder(combat))
      : combat.round > 1 ? TFRRemoveCombatPassives(combat, ["dawnsEndurance"]) : null;
    run?.catch(error => console.warn("The First Relics | Combat passive trigger failed.", error));
  });
  Hooks.on("deleteCombat", combat => {
    if (!TFRIsResponsibleGM()) return;
    TFRRemoveCombatPassives(combat).catch(error => console.warn("The First Relics | Combat passive cleanup failed.", error));
  });
  Hooks.on("preUpdateActor", TFRPreventDropToZero);
  Hooks.on("dnd5e.restCompleted", (actor, result) => {
    TFRPassivesAfterRest(actor, result).catch(error => console.warn("The First Relics | Rest passive trigger failed.", error));
  });
  Hooks.on("dnd5e.postUseActivity", (activity, usage) => {
    TFRPassivesAfterActivity(activity, usage).catch(error => console.warn("The First Relics | Activity passive trigger failed.", error));
  });
  Hooks.on("dnd5e.preRollDamageV2", TFRAddHealingGiven);
  Hooks.on("dnd5e.preRollDamageV2", TFRAddBorrowedPower);
  Hooks.on("dnd5e.preRollDamageV2", TFRHuntersMarkDamage);
  Hooks.on("dnd5e.preUseActivity", TFRUnbrokenMark);
  Hooks.on("dnd5e.preCalculateDamage", TFRAddHealingReceived);
  Hooks.on("dnd5e.preCalculateDamage", TFRPrimalHideDamage);
  Hooks.on("dnd5e.preCalculateDamage", TFRReduceRagingDamage);
  Hooks.on("dnd5e.applyDamage", TFRMarkWillBeforeWound);
  Hooks.on("dnd5e.preRollDamageV2", TFRAddSpellDamagePassive);
  Hooks.on("dnd5e.preRollDamageV2", TFRAddCrownedSmite);
  Hooks.on("dnd5e.preRollDamageV2", TFRAddDeepenedShadows);
  Hooks.on("dnd5e.preCalculateDamage", TFRReduceUmbralShroudDamage);
  Hooks.on("dnd5e.applyDamage", TFRMarkUmbralShroud);
}
