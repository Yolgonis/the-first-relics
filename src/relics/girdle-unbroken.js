/**
 * Girdle of the Unbroken (Barbarian): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "girdle_unbroken",
  /** Damage type of the relic's damage abilities. */
  damageType: "force",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Stand", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self" },
    active2: { name: "Stoneheart Surge", type: "damage", activation: "special", charges: 2, range: 5, target: "creature", damage: { number: 4, denomination: 8, type: "force" } },
    active3: { name: "Refuse the Fall", type: "utility", activation: "reaction", charges: 3, range: 0, target: "self" },
    active4: { name: "Hold the World", type: "utility", activation: "reaction", charges: 4, range: 10, target: "creature" },
    avatar: { name: "Avatar of Indomitable Will", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Signature of Indomitable Will", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "self-recovery", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self", note: "End prone + temp HP; utility/reminder." },
    active2: { role: "bonus-damage", type: "damage", activation: "special", charges: 2, range: 5, target: "creature", damage: { number: 4, denomination: 8, type: "force" }, note: "Extra force damage after melee hit." },
    active3: { role: "saving-reroll", type: "utility", activation: "reaction", charges: 3, range: 0, target: "self", note: "Reroll failed STR/CON/WIS save." },
    active4: { role: "ally-protection", type: "utility", activation: "reaction", charges: 4, range: 10, target: "creature", note: "+3 AC or take movement/effect; GM resolved." },
    avatar: { role: "self-buff", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self", effect: true, note: "Unbroken avatar effect/reminder." },
    signature: { role: "death-ward-state", type: "utility", activation: "special", charges: 0, range: 0, target: "self", note: "1 HP refusal state." }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 2: { note: "rage" } },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override }) => ({
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
      { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
      { key: "system.traits.ci.value", mode: add, value: "prone", priority: 20 }
    ],
    signature: [
      { key: "system.traits.ci.value", mode: add, value: "frightened", priority: 20 },
      { key: "system.traits.ci.value", mode: add, value: "paralyzed", priority: 20 },
      { key: "system.traits.ci.value", mode: add, value: "prone", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { removeSelf: ["prone"], tempHp: "level+bonus", rounds: 1, seconds: 6 },
    active3: { note: "Refuse the Fall is manual: reroll the failed Strength, Constitution, or Wisdom save and use the new result." },
    active4: { note: "Hold the World is manual: protect the chosen creature within 10 ft, then resolve the AC bonus, movement, or intercepted effect with the GM." },
    avatar: { selfEffect: true },
    signature: { selfEffect: true }
  })
};
