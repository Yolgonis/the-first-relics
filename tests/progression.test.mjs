import test from "node:test";
import assert from "node:assert/strict";
import { relics } from "./foundry-stub.mjs";
import { TFRAttunementForStage, TFRGetStageData, TFRIsFinalForm } from "../src/01-stages-and-text.js";
import { TFRIsAbilitySlotUnlocked, TFRNormalizeStage, TFRRequiredStageForSlot } from "../src/04-items.js";
import { TFRMoodFromAffinity, TFRSignatureUnlockedFromAffinity, TFRStageFromAffinity } from "../src/06-relic-state.js";
import { TFR_ACTIVITY_SLOTS, TFR_STAGES } from "../src/00-core.js";

test("affinity thresholds pick the stage", () => {
  for (const [affinity, stage] of [[0, "dormant"], [299, "dormant"], [300, "awakened"], [749, "awakened"], [750, "exalted"], [1000, "exalted"]]) {
    assert.equal(TFRStageFromAffinity(affinity), stage, `affinity ${affinity}`);
  }
  assert.equal(TFRStageFromAffinity("not a number"), "dormant");
  assert.equal(TFRStageFromAffinity(undefined), "dormant");
});

test("the signature unlocks at 1000 affinity", () => {
  assert.equal(TFRSignatureUnlockedFromAffinity(999), false);
  assert.equal(TFRSignatureUnlockedFromAffinity(1000), true);
});

test("relic data uses the thresholds the code applies", () => {
  for (const relic of relics) {
    const { thresholds, min, max } = relic.affinity;
    assert.deepEqual([min, max], [0, 1000], relic.id);
    for (const stage of TFR_STAGES) assert.equal(TFRStageFromAffinity(thresholds[stage]), stage, `${relic.id} ${stage}`);
    for (const stage of ["awakened", "exalted"]) assert.notEqual(TFRStageFromAffinity(thresholds[stage] - 1), stage, `${relic.id} below ${stage}`);
    assert.equal(TFRSignatureUnlockedFromAffinity(thresholds.signature), true, relic.id);
    assert.equal(TFRSignatureUnlockedFromAffinity(thresholds.signature - 1), false, relic.id);
  }
});

test("mood bands", () => {
  const bands = [[0, "Rejected"], [50, "Rejected"], [51, "Silent"], [200, "Silent"], [201, "Watching"], [399, "Watching"],
    [400, "Curious"], [649, "Curious"], [650, "Satisfied"], [849, "Satisfied"], [850, "Resonating"], [1000, "Resonating"]];
  for (const [affinity, mood] of bands) assert.equal(TFRMoodFromAffinity(affinity), mood, `affinity ${affinity}`);
});

test("unknown stages fall back to dormant", () => {
  assert.equal(TFRNormalizeStage("exalted"), "exalted");
  assert.equal(TFRNormalizeStage("final form"), "dormant");
  assert.equal(TFRNormalizeStage(undefined), "dormant");
});

test("final form needs exalted and the signature, and raises bonus and charges", () => {
  assert.equal(TFRIsFinalForm("exalted", true), true);
  assert.equal(TFRIsFinalForm("exalted", false), false);
  assert.equal(TFRIsFinalForm("awakened", true), false);
  for (const relic of relics) {
    const exalted = TFRGetStageData(relic, "exalted");
    const final = TFRGetStageData(relic, "exalted", true);
    assert.deepEqual([final.bonus, final.charges], [5, 15], relic.id);
    assert.ok(final.bonus > exalted.bonus && final.charges > exalted.charges, relic.id);
  }
});

test("attunement is required until exalted", () => {
  assert.equal(TFRAttunementForStage("dormant"), "required");
  assert.equal(TFRAttunementForStage("awakened"), "required");
  assert.equal(TFRAttunementForStage("exalted"), "");
});

test("ability slots unlock by stage, the signature only by its own unlock", () => {
  const unlocked = (stage, signature = false) => TFR_ACTIVITY_SLOTS.filter(slot => TFRIsAbilitySlotUnlocked(stage, slot, signature));
  assert.deepEqual(unlocked("dormant"), ["active1", "active2"]);
  assert.deepEqual(unlocked("awakened"), ["active1", "active2", "active3", "active4"]);
  assert.deepEqual(unlocked("exalted"), ["active1", "active2", "active3", "active4", "avatar"]);
  assert.deepEqual(unlocked("exalted", true), TFR_ACTIVITY_SLOTS);
  assert.deepEqual(unlocked("nonsense"), unlocked("dormant"));
  for (const slot of TFR_ACTIVITY_SLOTS.filter(slot => slot !== "signature")) {
    assert.ok(TFR_STAGES.includes(TFRRequiredStageForSlot(slot)), slot);
  }
});
