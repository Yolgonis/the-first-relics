/**
 * Cloak of the Umbral Veil (Rogue): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "cloak_shadowfell",
  /** Damage type of the relic's damage abilities. */
  damageType: "necrotic",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Shadow Step", type: "utility", activation: "bonus", charges: 1, range: 30, target: "space", template: "mistyStep", teleport: true },
    active2: { name: "Fade Away", type: "utility", activation: "reaction", charges: 2, range: 0, target: "self" },
    active3: { name: "Living Darkness", type: "utility", activation: "action", charges: 3, range: 60, target: "space" },
    active4: { name: "Death From Silence", type: "damage", activation: "action", charges: 4, range: 5, target: "creature", damage: { number: 8, denomination: 6, type: "necrotic" } },
    avatar: { name: "Walker Between Shadows", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "One Step Behind", type: "damage", activation: "special", charges: 0, range: 60, target: "creature", damage: { number: 10, denomination: 6, type: "necrotic" }, template: "mistyStep", teleport: true }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 3: { note: "midi" } },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    active2: [{ key: "flags.midi-qol.advantage.attack.all", mode: override, value: "1", priority: 20 }],
    active3: [{ key: "flags.the-first-relics.livingDarkness", mode: override, value: "true", priority: 20 }],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "necrotic", priority: 20 },
      { key: "flags.the-first-relics.ignoreOpportunityAttacks", mode: override, value: "true", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({ active1: { teleport: true }, active2: { conditionSelf: "invisible", selfName: "Invisible — Fade Away", rounds: 1, seconds: 6, expireOnTurnEnd: true }, active3: { selfEffect: true, note: "Living Darkness template/area still needs GM placement; darkness state helper applied to bearer." }, avatar: { selfEffect: true }, signature: { teleport: true, note: "One Step Behind damage is rolled by the activity; teleport helper can be used for shadow movement." } })
};
