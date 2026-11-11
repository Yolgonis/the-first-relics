/**
 * Mantle of the First Seer (Wizard): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "mantle_first_seer",
  /** Damage type of the relic's damage abilities. */
  damageType: "psychic",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Echo of Tomorrow", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self" },
    active2: { name: "Moment of Clarity", type: "utility", activation: "reaction", charges: 2, range: 60, target: "creature" },
    active3: { name: "Threads of Fate", type: "utility", activation: "reaction", charges: 3, range: 60, target: "creature" },
    active4: { name: "Spell Insight", type: "utility", activation: "reaction", charges: 4, range: 120, target: "creature" },
    avatar: { name: "Avatar of Understanding", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Signature of Understanding", type: "utility", activation: "reaction", charges: 0, range: 120, target: "creature" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "self-buff", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self", note: "Advantage on next Intelligence check; reminder utility." },
    active2: { role: "roll-modifier", type: "utility", activation: "reaction", charges: 2, range: 60, target: "creature", note: "Add/subtract relic bonus before outcome." },
    active3: { role: "reroll", type: "utility", activation: "reaction", charges: 3, range: 60, target: "creature", note: "Reroll effect; no damage." },
    active4: { role: "spell-info", type: "utility", activation: "reaction", charges: 4, range: 120, target: "creature", note: "Spell information and save advantage reminder." },
    avatar: { role: "self-buff", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self", effect: true, note: "First Seer avatar reminder/effect." },
    signature: { role: "reroll-signature", type: "utility", activation: "reaction", charges: 0, range: 120, target: "creature", note: "Chronicle Unwritten is reroll only; no damage." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    // Arcana and History are about magic and history by nature; Investigation depends on the subject.
    0: { changes: [["system.skills.arc.bonuses.check", "ADD", "+{bonus}"], ["system.skills.his.bonuses.check", "ADD", "+{bonus}"]], note: "scholar" }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 1: {}, 3: { note: "chronicle" } },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override }) => ({
    active1: [{ key: "system.bonuses.abilities.check", mode: add, value: `+${bonus}`, priority: 20 }],
    active4: [{ key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
      { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
      { key: "system.attributes.senses.truesight", mode: upgrade, value: "30", priority: 20 },
      { key: "system.bonuses.abilities.check", mode: add, value: `+${bonus}`, priority: 20 },
      { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { selfEffect: true, rounds: 2, seconds: 12 },
    active2: { note: "Moment of Clarity is manual: after the d20 is rolled but before the outcome, add or subtract the relic bonus." },
    active3: { note: "Threads of Fate is manual: force the visible d20 result to be rerolled, then resolve the chosen result." },
    active4: { selfEffect: true, rounds: 1, seconds: 6 },
    avatar: { selfEffect: true },
    signature: { note: "Chronicle Unwritten is manual: after seeing the d20 result but before the outcome, force a reroll and choose the final result." }
  })
};
