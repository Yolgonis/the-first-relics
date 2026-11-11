import test from "node:test";
import assert from "node:assert/strict";
import "./foundry-stub.mjs";
import { TFRMigrateLegacyRelicIds } from "../src/06-relic-state.js";

const FLAG = "the-first-relics";

function doc(data) {
  const updates = [];
  return { ...data, updates, update: async change => { updates.push(change); } };
}

function world({ state, items = [], actorItems = [], pages = [], tokens = [] }) {
  const settings = { relicState: state };
  game.settings = { get: (_module, key) => settings[key], set: async (_module, key, value) => { settings[key] = value; } };
  game.items = items;
  game.actors = { contents: [{ items: { contents: actorItems } }] };
  game.journal = [{ pages }];
  game.scenes = { contents: [{ tokens: { contents: tokens } }] };
  return settings;
}
const token = (actorLink, items) => ({ actorLink, actor: { items: { contents: items } } });

const girdle = relicId => doc({
  flags: { [FLAG]: { relicId } },
  _source: { system: { identifier: relicId, activities: { a1: { flags: { [FLAG]: { relicId } } }, a2: { flags: {} } } } }
});

test("old relic ids move to the new id everywhere", async () => {
  const worldItem = girdle("manacles_unbroken");
  const actorItem = girdle("manacles_unbroken");
  const untouched = girdle("cloak_feywilds");
  const page = doc({ flags: { [FLAG]: { lorePageId: "manacles_unbroken" } } });
  const settings = world({
    state: { manacles_unbroken: { affinity: 420 }, cloak_feywilds: { affinity: 10 } },
    items: [worldItem, untouched],
    actorItems: [actorItem],
    pages: [page]
  });

  assert.deepEqual(await TFRMigrateLegacyRelicIds(), { state: 1, items: 2, pages: 1 });
  assert.deepEqual(settings.relicState, { cloak_feywilds: { affinity: 10 }, girdle_unbroken: { affinity: 420 } });
  for (const item of [worldItem, actorItem]) {
    assert.deepEqual(item.updates, [{
      [`flags.${FLAG}.relicId`]: "girdle_unbroken",
      "system.identifier": "girdle_unbroken",
      [`system.activities.a1.flags.${FLAG}.relicId`]: "girdle_unbroken"
    }]);
  }
  assert.deepEqual(untouched.updates, []);
  assert.deepEqual(page.updates, [{ [`flags.${FLAG}.lorePageId`]: "girdle_unbroken" }]);
});

test("items owned by unlinked tokens are migrated, linked tokens are left to their actor", async () => {
  const onUnlinked = girdle("manacles_unbroken");
  const onLinked = girdle("manacles_unbroken");
  world({ state: {}, tokens: [token(false, [onUnlinked]), token(true, [onLinked]), { actorLink: false, actor: null }] });
  assert.deepEqual(await TFRMigrateLegacyRelicIds(), { state: 0, items: 1, pages: 0 });
  assert.equal(onUnlinked.updates.length, 1);
  assert.deepEqual(onLinked.updates, []);
});

test("state already saved under the new id is kept", async () => {
  const settings = world({ state: { manacles_unbroken: { affinity: 1 }, girdle_unbroken: { affinity: 900 } } });
  await TFRMigrateLegacyRelicIds();
  assert.deepEqual(settings.relicState, { girdle_unbroken: { affinity: 900 } });
});

test("a migrated world is left alone", async () => {
  const item = girdle("girdle_unbroken");
  const settings = world({ state: { girdle_unbroken: { affinity: 5 } }, items: [item] });
  assert.deepEqual(await TFRMigrateLegacyRelicIds(), { state: 0, items: 0, pages: 0 });
  assert.deepEqual(item.updates, []);
  assert.deepEqual(settings.relicState, { girdle_unbroken: { affinity: 5 } });
});

test("only the active GM client migrates", async () => {
  const item = girdle("manacles_unbroken");
  world({ state: { manacles_unbroken: {} }, items: [item] });
  game.users.activeGM = { isSelf: false };
  try {
    assert.deepEqual(await TFRMigrateLegacyRelicIds(), { state: 0, items: 0, pages: 0 });
    assert.deepEqual(item.updates, []);
  } finally {
    game.users.activeGM = { isSelf: true };
  }
});
