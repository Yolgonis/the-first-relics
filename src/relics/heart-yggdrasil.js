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
    active1: { name: "Rooted Focus", type: "utility", activation: "reaction", charges: 1, range: 0, target: "self" },
    active2: { name: "Nature's Embrace", type: "heal", activation: "bonus", charges: 2, range: 30, target: "creature", healing: { number: 4, denomination: 8 } },
    active3: { name: "Bark of Yggdrasil", type: "utility", activation: "bonus", charges: 3, range: 0, target: "self" },
    active4: { name: "Roots of Eternity", type: "save", activation: "action", charges: 4, range: 60, target: "creature", save: "str" },
    avatar: { name: "Avatar of Yggdrasil", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "World Reborn", type: "utility", activation: "special", charges: 0, range: 60, target: "creature" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "concentration-save", note: "Turn the failed concentration save into a success; GM-resolved." },
    active3: { role: "self-protection", effect: true, note: "+2 AC and resistance to bludgeoning, piercing and slashing for 1 minute." },
    avatar: { role: "self-buff", effect: true, note: "Flight, hover, resistances and extra poison damage; free Wild Shape uses are GM-resolved." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {},
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: { note: "chatHealing" }, 1: {}, 2: { note: "canvas" }, 3: { note: "spellDamage" } },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    active3: [
      { key: "system.attributes.ac.bonus", mode: add, value: "+2", priority: 20 },
      ...["bludgeoning", "piercing", "slashing"].map(type => ({ key: "system.traits.dr.value", mode: add, value: type, priority: 20 }))
    ],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      ...["acid", "cold", "fire", "lightning", "poison"].map(type => ({ key: "system.traits.dr.value", mode: add, value: type, priority: 20 })),
      { key: "system.bonuses.mwak.damage", mode: add, value: "+1d8[poison]", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { note: "Rooted Focus is manual: the failed concentration saving throw succeeds instead." },
    active3: { selfEffect: true },
    active4: { condition: "restrained", targetName: "Restrained — Roots of Eternity", rounds: 10, seconds: 60 },
    avatar: { selfEffect: true, note: "While Avatar of Yggdrasil lasts, features that spend a use of Wild Shape (Wild Shape, Circle Forms, Starry Form, Wrath of the Sea) don't expend it." },
    signature: { removeTarget: ["poisoned", "diseased", "frightened", "charmed"], note: "World Reborn healing/damage is GM-resolved; cleanup helper ran on selected target if any." }
  })
};
