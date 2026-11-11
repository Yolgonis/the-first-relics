/**
 * Prints every per-relic table the module derives from its relic definitions, as JSON.
 *
 *   node tests/relic-tables.snapshot.mjs > before.json
 *
 * Run it before and after reorganising relic definitions and diff the two files: any
 * difference is a behaviour change.
 */
import { relics } from "./foundry-stub.mjs";
import { TFR_ACTIVITY_SLOTS, TFR_STAGES } from "../src/00-core.js";
import { TFRDamageTypeForRelic } from "../src/01-stages-and-text.js";
import { TFRAbilityAutomation, TFRAbilityDefinitions } from "../src/03-activities.js";
import { TFR_PASSIVE_EFFECTS, TFR_PASSIVE_TRIGGERS } from "../src/04-items.js";
import { TFREffectChangesForRelicAbility, TFRRelicAbilityRuntimeSpec } from "../src/14-ability-runtime.js";

CONST.ACTIVE_EFFECT_MODES = { CUSTOM: 0, MULTIPLY: 1, ADD: 2, DOWNGRADE: 3, UPGRADE: 4, OVERRIDE: 5 };

const itemAt = stage => ({
  flags: { "the-first-relics": { stage } },
  getFlag: (_scope, key) => (key === "stage" ? stage : undefined)
});
const perSlot = fn => Object.fromEntries(TFR_ACTIVITY_SLOTS.map(slot => [slot, fn(slot)]));

const snapshot = {
  abilityDefinitions: TFRAbilityDefinitions(),
  passiveEffects: TFR_PASSIVE_EFFECTS,
  passiveTriggers: TFR_PASSIVE_TRIGGERS,
  relics: Object.fromEntries([...relics, { id: "unknown_relic", stages: relics[0].stages }].map(relic => [relic.id, {
    damageType: TFRDamageTypeForRelic(relic),
    automation: perSlot(slot => TFRAbilityAutomation(relic.id, slot)),
    runtime: perSlot(slot => TFRRelicAbilityRuntimeSpec(relic.id, slot)),
    effectChangesNoItem: perSlot(slot => TFREffectChangesForRelicAbility(relic.id, slot)),
    effectChanges: Object.fromEntries(TFR_STAGES.map(stage => [
      stage, perSlot(slot => TFREffectChangesForRelicAbility(relic.id, slot, relic, itemAt(stage)))
    ]))
  }]))
};
console.log(JSON.stringify(snapshot, null, 1));
