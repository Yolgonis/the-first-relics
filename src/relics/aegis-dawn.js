/**
 * Aegis of the Dawn (Fighter): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "aegis_dawn",
  /** Damage type of the relic's damage abilities. */
  damageType: "radiant",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Stand Firm", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self" },
    active2: { name: "Dawn Barrier", type: "utility", activation: "reaction", charges: 2, range: 30, target: "creature" },
    active3: { name: "Bastion of Resolve", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
    active4: { name: "Break the Darkness", type: "save", activation: "action", charges: 4, range: 30, target: "creature", save: "con" },
    avatar: { name: "Dawn Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Last Sunrise", type: "utility", activation: "special", charges: 0, range: 30, target: "creature" }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: {}, 3: {} },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override }) => ({
    active1: [{ key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }],
    active2: [{ key: "system.attributes.ac.bonus", mode: add, value: "4", priority: 20 }],
    active3: [{ key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "bludgeoning", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "piercing", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "slashing", priority: 20 },
      { key: "system.bonuses.mwak.damage", mode: add, value: "+2d8[radiant]", priority: 20 },
      { key: "system.bonuses.rwak.damage", mode: add, value: "+2d8[radiant]", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({ active1: { selfEffect: true, rounds: 1, seconds: 6 }, active2: { targetEffect: true, rounds: 1, seconds: 6 }, active3: { selfEffect: true }, active4: { condition: "blinded", targetName: "Blinded — Break the Darkness", rounds: 1, seconds: 6 }, avatar: { selfEffect: true }, signature: { removeTarget: ["frightened", "charmed"], note: "Last Sunrise healing/refusal is GM-resolved; fear/charm cleanup helper ran on the selected target if any." } })
};
