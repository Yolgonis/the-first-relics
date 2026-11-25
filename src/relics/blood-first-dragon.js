/**
 * Blood of the First Dragon (Sorcerer): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "blood_first_dragon",
  /** Damage type of the relic's damage abilities. */
  damageType: "fire",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Draconic Roar", type: "save", activation: "bonus", charges: 1, range: 30, target: "creature", save: "wis" },
    active2: { name: "Burning Blood", type: "utility", activation: "bonus", charges: 2, range: 0, target: "self" },
    active3: { name: "Wings of the First Dragon", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
    active4: { name: "Primordial Breath", type: "damage", activation: "action", charges: 4, range: 60, target: "creature", damage: { number: 10, denomination: 6, type: "fire" } },
    avatar: { name: "First Dragon Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Heart of the First Flame", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    0: { changes: [["system.attributes.hp.bonuses.level", "ADD", "+1"]] },
    1: { changes: [["system.attributes.ac.bonus", "ADD", "+1"]] },
    2: { changes: [["system.abilities.str.save.roll.mode", "ADD", "1"], ["system.abilities.con.save.roll.mode", "ADD", "1"]] },
    3: { changes: [["system.traits.dr.value", "ADD", "fire"], ["system.traits.dr.value", "ADD", "cold"], ["system.traits.ci.value", "ADD", "frightened"]] }
  },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    active2: [
      { key: "system.bonuses.mwak.damage", mode: add, value: "+2d6[fire]", priority: 20 },
      { key: "system.bonuses.rwak.damage", mode: add, value: "+2d6[fire]", priority: 20 }
    ],
    active3: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "60", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 }
    ],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "80", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "fire", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "cold", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "lightning", priority: 20 },
      { key: "system.bonuses.mwak.damage", mode: add, value: "+2d10[fire]", priority: 20 },
      { key: "system.bonuses.rwak.damage", mode: add, value: "+2d10[fire]", priority: 20 }
    ],
    signature: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "80", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({ active1: { condition: "frightened", targetName: "Frightened — Draconic Roar", rounds: 1, seconds: 6 }, active2: { selfEffect: true }, active3: { selfEffect: true }, avatar: { selfEffect: true }, signature: { selfEffect: true } })
};
