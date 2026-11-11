/**
 * Crown of the Conqueror (Paladin): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "crown_conqueror",
  /** Damage type of the relic's damage abilities. */
  damageType: "force",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Rally", type: "utility", activation: "bonus", charges: 1, range: 30, target: "creature" },
    active2: { name: "Royal Decree", type: "save", activation: "action", charges: 2, range: 60, target: "creature", save: "wis" },
    active3: { name: "Banner Unbroken", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
    active4: { name: "March of Kings", type: "utility", activation: "action", charges: 4, range: 30, target: "creature" },
    avatar: { name: "King Eternal", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "The World Shall Kneel", type: "save", activation: "action", charges: 0, range: 60, target: "creature", save: "wis" }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    0: { aura: { distance: 30, self: true }, changes: [["system.abilities.wis.bonuses.save", "ADD", "+{bonus}"]] }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 1: { note: "banner" } },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override }) => ({
    active3: [{ key: "system.attributes.ac.bonus", mode: add, value: "2", priority: 20 }],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "psychic", priority: 20 },
      { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { note: "Rally is manual: choose the ally, then apply the relic's morale/leadership benefit for the current scene." },
    active2: { condition: "charmed", targetName: "Compelled — Royal Decree", rounds: 1, seconds: 6 },
    active3: { selfEffect: true },
    active4: { note: "March of Kings is manual: move or reposition the chosen ally/creature as the table resolves the command." },
    avatar: { selfEffect: true },
    signature: { condition: "frightened", targetName: "Kneeling — The World Shall Kneel", rounds: 10, seconds: 60, extraTargetChanges: [{ key: "system.attributes.movement.walk", mode: mode("OVERRIDE"), value: "0", priority: 20 }, { key: "system.attributes.movement.fly", mode: mode("OVERRIDE"), value: "0", priority: 20 }, { key: "system.attributes.movement.climb", mode: mode("OVERRIDE"), value: "0", priority: 20 }, { key: "flags.midi-qol.noReactions", mode: mode("OVERRIDE"), value: "1", priority: 20 }], alsoProne: true }
  })
};
