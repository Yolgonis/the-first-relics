/**
 * Chains of the Patron (Warlock): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "chains_patron",
  /** Damage type of the relic's damage abilities. */
  damageType: "necrotic",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Patron's Glance", type: "utility", activation: "bonus", charges: 1, range: 60, target: "creature" },
    active2: { name: "Borrowed Ruin", type: "damage", activation: "special", charges: 2, range: 120, target: "creature", damage: { number: 4, denomination: 8, type: "necrotic" } },
    active3: { name: "Chain of Binding", type: "save", activation: "action", charges: 3, range: 60, target: "creature", save: "str" },
    active4: { name: "Pay the Difference", type: "utility", activation: "reaction", charges: 4, range: 0, target: "self" },
    avatar: { name: "Avatar of Ambition", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Signature of Ambition", type: "save", activation: "action", charges: 0, range: 60, target: "creature", save: "cha" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "detect-pact", type: "utility", activation: "bonus", charges: 1, range: 60, target: "creature", note: "Pact/curse detection." },
    active2: { role: "bonus-damage", type: "damage", activation: "special", charges: 2, range: 120, target: "creature", damage: { number: 4, denomination: 8, type: "necrotic" }, note: "Extra necrotic damage." },
    active3: { role: "save-control", type: "save", activation: "action", charges: 3, range: 60, target: "creature", save: "str", note: "STR save; apply Restrained if Midi does not." },
    active4: { role: "saving-reroll-cost", type: "utility", activation: "reaction", charges: 4, range: 0, target: "self", note: "Take necrotic self-cost to reroll save." },
    avatar: { role: "self-buff", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self", effect: true, note: "Pact avatar effect/reminder." },
    signature: { role: "save-control-signature", type: "save", activation: "action", charges: 0, range: 60, target: "creature", save: "cha", note: "CHA save against Price of Eternity." }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: { note: "borrowed" }, 2: { note: "chatDamage" } },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "necrotic", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { note: "Patron's Glance is manual: the GM reveals pact, curse, oath, or binding information about the target." },
    active3: { condition: "restrained", targetName: "Restrained — Chain of Binding", rounds: 1, seconds: 6 },
    active4: { note: "Pay the Difference is manual: take the approved necrotic cost, then reroll the failed saving throw." },
    avatar: { selfEffect: true },
    signature: { condition: "restrained", targetName: "Restrained — Price of Eternity", extraTargetChanges: [{ key: "flags.the-first-relics.teleportBlocked", mode: mode("OVERRIDE"), value: "true", priority: 20 }, { key: "flags.the-first-relics.invisibilityBlocked", mode: mode("OVERRIDE"), value: "true", priority: 20 }], rounds: 10, seconds: 60 }
  })
};
