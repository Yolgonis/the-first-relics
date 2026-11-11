/**
 * Vestments of the First Saint (Cleric): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "vestments_first_saint",
  /** Damage type of the relic's damage abilities. */
  damageType: "radiant",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Blessing", type: "utility", activation: "bonus", charges: 1, range: 30, target: "creature" },
    active2: { name: "Cleansing Light", type: "utility", activation: "action", charges: 2, range: 30, target: "creature" },
    active3: { name: "Sanctuary of Dawn", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
    active4: { name: "Wings of Mercy", type: "heal", activation: "action", charges: 4, range: 60, target: "creature", healing: { number: 6, denomination: 8 } },
    avatar: { name: "Saint Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Miracle of the First Saint", type: "utility", activation: "special", charges: 0, range: 60, target: "creature" }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    0: { aura: { distance: 30, self: false }, changes: [["system.attributes.death.roll.mode", "ADD", "1"]] }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 1: {} },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override }) => ({
    active1: [
      { key: "system.bonuses.abilities.save", mode: add, value: "+1d4", priority: 20 },
      { key: "system.bonuses.abilities.check", mode: add, value: "+1d4", priority: 20 },
      { key: "system.bonuses.mwak.attack", mode: add, value: "+1d4", priority: 20 },
      { key: "system.bonuses.rwak.attack", mode: add, value: "+1d4", priority: 20 },
      { key: "system.bonuses.msak.attack", mode: add, value: "+1d4", priority: 20 },
      { key: "system.bonuses.rsak.attack", mode: add, value: "+1d4", priority: 20 }
    ],
    active3: [
      { key: "system.traits.dr.value", mode: add, value: "bludgeoning", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "piercing", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "slashing", priority: 20 }
    ],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "radiant", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({ active1: { targetEffect: true }, active2: { removeTarget: ["poisoned", "diseased", "frightened", "charmed"], note: "Cleansing Light helper removed common conditions from the selected target." }, active3: { selfEffect: true }, avatar: { selfEffect: true }, signature: { removeTarget: ["poisoned", "diseased", "frightened", "charmed", "paralyzed", "stunned"], note: "Miracle cleanup helper ran on selected target; resurrection/healing remains GM-resolved." } })
};
