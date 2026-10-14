// Event-triggered passive features: combat start, dropping to 0 hit points, long rests, casting
// divination spells, healing, and defeating a hostile creature. Passives that need GM judgment
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

// ---- Combat start: Dawn's Endurance (Aegis), Unseen Hunter (Umbral Veil) ----

async function TFRStartCombatPassives(combat) {
  const actors = new Map();
  for (const combatant of combat.combatants) if (combatant.actor) actors.set(combatant.actor.uuid, combatant.actor);
  const midiAttackFlags = game.modules.get("midi-qol")?.active && game.modules.get("dae")?.active;

  for (const actor of actors.values()) {
    const existing = new Set(actor.effects.filter(effect => effect.getFlag(TFR_MODULE_ID, "combatId") === combat.id)
      .map(effect => effect.getFlag(TFR_MODULE_ID, "passiveTrigger")));
    const effects = [];

    const aegis = TFRActivePassiveItem(actor, "aegis_dawn", 0);
    if (aegis && !existing.has("dawnsEndurance")) {
      const bonus = await TFRPassiveRelicBonus(aegis);
      effects.push({
        name: `${aegis.name} - ${TFRT("Dawn's Endurance")}`,
        img: aegis.img,
        origin: aegis.uuid,
        changes: [{ key: "system.attributes.ac.bonus", mode: TFRMode("ADD"), value: `+${bonus}`, priority: 20 }],
        duration: { combat: combat.id, rounds: 1, startRound: 1 },
        flags: { [TFR_MODULE_ID]: { passiveTrigger: "dawnsEndurance", combatId: combat.id } }
      });
    }

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

// ---- Long rest: reset once-per-rest uses; Living Sap (Heart of Yggdrasil) ----

async function TFRPassivesAfterRest(actor, result) {
  if (!result?.longRest || !actor?.isOwner) return;
  for (const item of actor.items.filter(candidate => candidate.getFlag?.(TFR_MODULE_ID, "passiveUses"))) {
    await item.unsetFlag(TFR_MODULE_ID, "passiveUses");
  }
  const heart = TFRActivePassiveItem(actor, "heart_yggdrasil", 0);
  if (heart) await TFRApplyTempHp(actor, TFRProficiency(actor) * 2, TFRT("Living Sap"));
}

// ---- Casting a divination spell: Living Chronicle (Mantle of the First Seer) ----

async function TFRPassivesAfterActivity(activity) {
  const actor = activity?.actor;
  const spell = activity?.item;
  if (!actor?.isOwner || spell?.type !== "spell" || spell.system?.school !== "div") return;
  const mantle = TFRActivePassiveItem(actor, "mantle_first_seer", 3);
  if (!mantle) return;
  await TFRApplyTempHp(actor, TFRProficiency(actor) + await TFRPassiveRelicBonus(mantle), TFRT("Living Chronicle"));
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
  if (!TFRActivePassiveItem(actor, "heart_yggdrasil", 1)) return;
  const healing = damages.find(damage => damage.type === "healing" && Number(damage.value) > 0);
  if (healing) healing.value = Number(healing.value) + TFRProficiency(actor);
}

// ---- Defeating a hostile creature: Price Paid (Chains of the Patron) ----

// Hit points before damage, recorded in preApplyDamage, so applyDamage can tell a kill apart from
// damage to a creature that was already at 0 or was kept at 1 by another passive.
const TFR_HP_BEFORE_DAMAGE = new Map();

function TFRRecordHpBeforeDamage(actor) {
  TFR_HP_BEFORE_DAMAGE.set(actor.uuid, Number(actor.system?.attributes?.hp?.value) || 0);
}

function TFRPricePaidCheck(actor, amount, options) {
  const before = TFR_HP_BEFORE_DAMAGE.get(actor.uuid) ?? 0;
  TFR_HP_BEFORE_DAMAGE.delete(actor.uuid);
  if (!(amount > 0) || before <= 0 || !options?.originatingMessage) return;
  if ((Number(actor.system?.attributes?.hp?.value) || 0) !== 0) return;
  const target = TFRActorToken(actor)?.document || actor.prototypeToken;
  if (target?.disposition !== CONST.TOKEN_DISPOSITIONS.HOSTILE) return;
  const source = ChatMessage.getSpeakerActor(options.originatingMessage.speaker);
  const chains = TFRActivePassiveItem(source, "chains_patron", 2);
  if (!chains || !source.isOwner) return;
  (async () => {
    const warlock = Number(source.classes?.warlock?.system?.levels) || 0;
    await TFRApplyTempHp(source, warlock + await TFRPassiveRelicBonus(chains), TFRT("Price Paid"));
  })().catch(error => console.warn("The First Relics | Could not apply Price Paid.", error));
}

function TFRRegisterPassiveTriggers() {
  if (globalThis.__TFR_PASSIVE_TRIGGERS__) return;
  globalThis.__TFR_PASSIVE_TRIGGERS__ = true;

  Hooks.on("updateCombat", (combat, changed) => {
    if (!TFRIsResponsibleGM() || !("round" in changed)) return;
    const run = combat.round === 1
      ? TFRStartCombatPassives(combat)
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
  Hooks.on("dnd5e.postUseActivity", activity => {
    TFRPassivesAfterActivity(activity).catch(error => console.warn("The First Relics | Activity passive trigger failed.", error));
  });
  Hooks.on("dnd5e.preRollDamageV2", TFRAddHealingGiven);
  Hooks.on("dnd5e.preCalculateDamage", TFRAddHealingReceived);
  Hooks.on("dnd5e.preApplyDamage", TFRRecordHpBeforeDamage);
  Hooks.on("dnd5e.applyDamage", TFRPricePaidCheck);
}
