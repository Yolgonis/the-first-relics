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
    active1: { name: "Unbroken Pact", type: "utility", activation: "reaction", charges: 1, range: 0, target: "self" },
    active2: { name: "Borrowed Ruin", type: "damage", activation: "special", charges: 2, range: 120, target: "creature", damage: { number: 4, denomination: 8, type: "necrotic" } },
    active3: { name: "Chain of Binding", type: "save", activation: "bonus", charges: 3, range: 60, target: "creature", save: "str" },
    active4: { name: "Pay the Difference", type: "utility", activation: "reaction", charges: 4, range: 0, target: "self" },
    avatar: { name: "Avatar of Ambition", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Signature of Ambition", type: "save", activation: "action", charges: 0, range: 60, target: "creature", save: "cha" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "concentration-save", note: "Keep concentration on a warlock spell; GM-resolved." },
    active2: { role: "bonus-damage", note: "Extra necrotic damage." },
    active3: { role: "save-control", note: "STR save; apply Restrained if Midi does not." },
    active4: { role: "saving-reroll-cost", note: "Take necrotic self-cost to reroll save." },
    avatar: { role: "self-buff", effect: true, note: "Pact avatar effect/reminder." },
    signature: { role: "save-control-signature", note: "CHA save against Price of Eternity." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    3: { changes: [["system.traits.ci.value", "ADD", "charmed"], ["system.traits.ci.value", "ADD", "frightened"], ["system.bonuses.spell.dc", "ADD", "+1"]] }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: { note: "borrowed" }, 1: {}, 2: {} },
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
    active1: { note: "Unbroken Pact is manual: you keep concentration on the warlock spell instead of losing it." },
    active3: { condition: "restrained", targetName: "Restrained — Chain of Binding", rounds: 1, seconds: 6 },
    active4: { note: "Pay the Difference is manual: take the approved necrotic cost, then reroll the failed saving throw." },
    avatar: { selfEffect: true },
    signature: { condition: "restrained", targetName: "Restrained — Price of Eternity", extraTargetChanges: [{ key: "flags.the-first-relics.teleportBlocked", mode: mode("OVERRIDE"), value: "true", priority: 20 }, { key: "flags.the-first-relics.invisibilityBlocked", mode: mode("OVERRIDE"), value: "true", priority: 20 }], rounds: 10, seconds: 60 }
  })
};
