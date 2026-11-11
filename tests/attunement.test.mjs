import test from "node:test";
import assert from "node:assert/strict";
import { notifications } from "./foundry-stub.mjs";
import { TFRActorHasClass, TFRBlockWrongClassAttunement, TFRRegisterAttunementRefusal } from "../src/02-attunement.js";

const actor = (name, ...classes) => ({
  documentName: "Actor",
  name,
  classes: Object.fromEntries(classes.map(identifier => [identifier, {}])),
  items: []
});
const relicItem = (relicId, parent, attuned = false) => ({
  name: "Test Relic",
  flags: { "the-first-relics": { relicId } },
  system: { attuned },
  parent
});
const attune = { "system.attuned": true };
const asPlayer = fn => {
  game.user.isGM = false;
  try { return fn(); } finally { game.user.isGM = true; }
};

test.before(async () => {
  TFRRegisterAttunementRefusal();
  await new Promise(resolve => setTimeout(resolve, 50)); // relic classes load asynchronously
});
test.beforeEach(() => { notifications.length = 0; });

test("class match uses the class identifier or the class item", () => {
  assert.equal(TFRActorHasClass(actor("A", "monk"), "Monk"), true);
  assert.equal(TFRActorHasClass(actor("A", "wizard", "monk"), "Monk"), true);
  assert.equal(TFRActorHasClass(actor("A", "wizard"), "Monk"), false);
  assert.equal(TFRActorHasClass({ items: [{ type: "class", name: "Keşiş", system: { identifier: "monk" } }] }, "Monk"), true);
  assert.equal(TFRActorHasClass({ items: [] }, "Monk"), false);
});

test("a player cannot attune a relic without its class", () => {
  const item = relicItem("bands_inner_dragon", actor("Carry", "wizard"));
  assert.equal(asPlayer(() => TFRBlockWrongClassAttunement(item, attune)), false);
  assert.match(notifications[0], /^warn: Test Relic requires attunement by a Monk\. Carry cannot attune/);
});

test("a player with the class attunes without a notice", () => {
  const item = relicItem("girdle_unbroken", actor("Verdant", "barbarian"));
  assert.equal(asPlayer(() => TFRBlockWrongClassAttunement(item, attune)), undefined);
  assert.deepEqual(notifications, []);
});

test("a GM can override, with a notice", () => {
  const item = relicItem("bands_inner_dragon", actor("Carry", "wizard"));
  assert.equal(TFRBlockWrongClassAttunement(item, attune), undefined);
  assert.match(notifications[0], /^info: .*GM override/);
});

test("other updates and non-relic items are ignored", () => {
  const wrongClass = actor("Carry", "wizard");
  const check = (item, changes) => asPlayer(() => TFRBlockWrongClassAttunement(item, changes));
  assert.equal(check(relicItem("bands_inner_dragon", wrongClass), { name: "x" }), undefined);
  assert.equal(check(relicItem("bands_inner_dragon", wrongClass), { "system.attuned": false }), undefined);
  assert.equal(check(relicItem("bands_inner_dragon", wrongClass, true), attune), undefined, "already attuned");
  assert.equal(check({ name: "Sword", flags: {}, system: {}, parent: wrongClass }, attune), undefined);
  assert.equal(check(relicItem("bands_inner_dragon", null), attune), undefined, "unowned world item");
  assert.deepEqual(notifications, []);
});
