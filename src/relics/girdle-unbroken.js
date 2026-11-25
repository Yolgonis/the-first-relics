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
    active1: { name: "Primal Surge", type: "utility", activation: "special", charges: 1, range: 0, target: "self" },
    active2: { name: "Stoneheart Surge", type: "damage", activation: "special", charges: 2, range: 5, target: "creature", damage: { number: 4, denomination: 8, type: "force" } },
    active3: { name: "Refuse the Fall", type: "utility", activation: "reaction", charges: 3, range: 0, target: "self" },
    active4: { name: "Earthshaker Leap", type: "save", activation: "bonus", charges: 4, range: 5, target: "creature", save: "str" },
    avatar: { name: "Avatar of Indomitable Will", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Signature of Indomitable Will", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "rage-start", note: "Enter Rage without a bonus action (spend a Rage use) and move half your speed; GM-resolved." },
    active2: { role: "bonus-damage", note: "Extra force damage after a melee hit." },
    active3: { role: "saving-reroll", note: "Reroll failed STR/CON/WIS save." },
    active4: { role: "save-control", note: "STR save; Prone, and a flying target falls. The leap is moved manually." },
    avatar: { role: "self-buff", effect: true, note: "Unbroken avatar effect/reminder." },
    signature: { role: "death-ward-state", note: "1 HP refusal state." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    3: { changes: [["system.scale.barbarian.rage-damage.value", "ADD", "{bonus}"]] }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: { note: "rage" }, 1: {}, 2: { note: "rage" } },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
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
    active1: { note: "Primal Surge is manual: enter your Rage without taking a bonus action (it still spends a use of Rage), then move up to half your speed." },
    active3: { note: "Refuse the Fall is manual: reroll the failed Strength, Constitution, or Wisdom save and use the new result." },
    active4: { condition: "prone", targetName: "Prone — Earthshaker Leap", rounds: 1, seconds: 6, note: "Earthshaker Leap: move your token next to the target first; a flying target that fails also falls." },
    avatar: { selfEffect: true },
    signature: { selfEffect: true }
  })
};
