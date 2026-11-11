import test from "node:test";
import assert from "node:assert/strict";
import { relics, repoFileExists } from "./foundry-stub.mjs";
import { TFR_ACTIVITY_SLOTS, TFR_STAGES } from "../src/00-core.js";
import { TFRAbilityDefinitions } from "../src/03-activities.js";
import { TFR_PASSIVE_EFFECTS, TFR_PASSIVE_TRIGGERS } from "../src/04-items.js";
import { TFR_LEGACY_RELIC_IDS } from "../src/06-relic-state.js";

const ids = relics.map(relic => relic.id);
const unique = values => new Set(values).size === values.length;

test("twelve relics with unique ids, names and classes", () => {
  assert.equal(relics.length, 12);
  assert.ok(unique(ids), "ids");
  assert.ok(unique(relics.map(relic => relic.name)), "names");
  assert.ok(unique(relics.map(relic => relic.class)), "classes");
  for (const id of ids) assert.match(id, /^[a-z]+(_[a-z]+)*$/);
});

test("stages grow in bonus and charges", () => {
  for (const relic of relics) {
    assert.deepEqual(Object.keys(relic.stages), TFR_STAGES, relic.id);
    const [dormant, awakened, exalted] = TFR_STAGES.map(stage => relic.stages[stage]);
    assert.ok(dormant.bonus < awakened.bonus && awakened.bonus < exalted.bonus, `${relic.id} bonus`);
    assert.ok(dormant.charges < awakened.charges && awakened.charges < exalted.charges, `${relic.id} charges`);
  }
});

test("each relic has four passives, four actives, an avatar and a signature", () => {
  for (const relic of relics) {
    const { passives, actives, avatar, signature } = relic.features;
    assert.equal(passives.length, 4, relic.id);
    assert.equal(actives.length, 4, relic.id);
    for (const text of [...passives, ...actives, avatar, signature]) assert.ok(typeof text === "string" && text.trim(), relic.id);
  }
});

test("affinity events and hidden requirements are well formed", () => {
  for (const relic of relics) {
    assert.ok(unique(relic.affinityEvents.map(event => event.id)), `${relic.id} event ids`);
    for (const event of relic.affinityEvents) {
      assert.ok(event.label && Number.isFinite(event.delta) && event.delta !== 0, `${relic.id} ${event.id}`);
    }
    assert.ok(unique(relic.hiddenRequirements.map(requirement => requirement.id)), `${relic.id} requirement ids`);
  }
});

test("icon and stage art exist on disk", () => {
  for (const relic of relics) {
    assert.ok(repoFileExists(relic.icon), `${relic.id}: ${relic.icon}`);
    const folder = relic.icon.split("/").pop().replace(/\.png$/, "");
    for (const stage of ["dormant", "awakened", "exalted", "final-form"]) {
      assert.ok(repoFileExists(`art/icons/stages/${folder}/${stage}.png`), `${relic.id}: ${stage} art`);
    }
  }
});

test("ability definitions cover every relic and slot", () => {
  const definitions = TFRAbilityDefinitions();
  assert.deepEqual(Object.keys(definitions).sort(), [...ids].sort());
  for (const [id, slots] of Object.entries(definitions)) {
    assert.deepEqual(Object.keys(slots), TFR_ACTIVITY_SLOTS, id);
    for (const [slot, definition] of Object.entries(slots)) {
      assert.ok(definition.name && Number.isFinite(definition.charges), `${id} ${slot}`);
    }
  }
});

test("passive automation tables point at real relics and passives", () => {
  for (const [label, table] of [["effects", TFR_PASSIVE_EFFECTS], ["triggers", TFR_PASSIVE_TRIGGERS]]) {
    for (const [id, passives] of Object.entries(table)) {
      const relic = relics.find(candidate => candidate.id === id);
      assert.ok(relic, `${label}: unknown relic id ${id}`);
      for (const index of Object.keys(passives)) {
        assert.ok(Number(index) < relic.features.passives.length, `${label}: ${id} has no passive ${index}`);
      }
    }
  }
});

test("renamed relic ids map old ids to current ones", () => {
  for (const [oldId, newId] of Object.entries(TFR_LEGACY_RELIC_IDS)) {
    assert.ok(!ids.includes(oldId), `${oldId} is still a relic id`);
    assert.ok(ids.includes(newId), `${newId} is not a relic id`);
  }
});
