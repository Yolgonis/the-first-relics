/**
 * Heart of Yggdrasil (Druid): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "heart_yggdrasil",
  /** Damage type of the relic's damage abilities. */
  damageType: "poison",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Verdant Bloom", type: "utility", activation: "action", charges: 1, range: 60, target: "space" },
    active2: { name: "Nature's Embrace", type: "heal", activation: "bonus", charges: 2, range: 30, target: "creature", healing: { number: 4, denomination: 8 } },
    active3: { name: "Forest Guardian", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
    active4: { name: "Roots of Eternity", type: "save", activation: "action", charges: 4, range: 60, target: "creature", save: "str" },
    avatar: { name: "Avatar of Yggdrasil", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "World Reborn", type: "utility", activation: "special", charges: 0, range: 60, target: "creature" }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    3: { changes: [["system.traits.ci.value", "ADD", "poisoned"], ["system.traits.ci.value", "ADD", "diseased"]] }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: {}, 1: { note: "chatHealing" }, 2: { note: "canvas" } },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override }) => ({
    active3: [
      { key: "system.traits.dr.value", mode: add, value: "acid", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "cold", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "fire", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "lightning", priority: 20 }
    ],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "acid", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "cold", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "fire", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "lightning", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "poison", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({ active1: { note: "Verdant Bloom is manual: place and resolve the plant/terrain growth area with the GM." }, active3: { selfEffect: true }, active4: { condition: "restrained", targetName: "Restrained — Roots of Eternity", rounds: 10, seconds: 60 }, avatar: { selfEffect: true }, signature: { removeTarget: ["poisoned", "diseased", "frightened", "charmed"], note: "World Reborn healing/damage is GM-resolved; cleanup helper ran on selected target if any." } })
};
