/**
 * Relic definitions, one file per relic. The module code reads them only through this file.
 * To change a relic, edit its file; to add one, add its file and list it here.
 */
import cloakFeywilds from "./cloak-feywilds.js";
import mantleFirstSeer from "./mantle-first-seer.js";
import girdleUnbroken from "./girdle-unbroken.js";
import chainsPatron from "./chains-patron.js";
import aegisDawn from "./aegis-dawn.js";
import crownConqueror from "./crown-conqueror.js";
import bandsInnerDragon from "./bands-inner-dragon.js";
import cloakShadowfell from "./cloak-shadowfell.js";
import heartYggdrasil from "./heart-yggdrasil.js";
import vestmentsFirstSaint from "./vestments-first-saint.js";
import bloodFirstDragon from "./blood-first-dragon.js";
import lyreFirstSong from "./lyre-first-song.js";

/** Relic id -> definition, in the order of data/relics.json. */
export const TFR_RELIC_DEFINITIONS = Object.fromEntries([
  cloakFeywilds,
  mantleFirstSeer,
  girdleUnbroken,
  chainsPatron,
  aegisDawn,
  crownConqueror,
  bandsInnerDragon,
  cloakShadowfell,
  heartYggdrasil,
  vestmentsFirstSaint,
  bloodFirstDragon,
  lyreFirstSong
].map(definition => [definition.id, definition]));

/**
 * One field of every relic that defines it: relic id -> a fresh copy of that field.
 * Fields that depend on runtime values are functions and are called with the context.
 */
export function TFRRelicTable(field, context = {}) {
  const table = {};
  for (const [id, definition] of Object.entries(TFR_RELIC_DEFINITIONS)) {
    const value = definition[field];
    if (value !== undefined) table[id] = typeof value === "function" ? value(context) : structuredClone(value);
  }
  return table;
}
