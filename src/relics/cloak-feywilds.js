/**
 * Cloak of Fey Paths (Ranger): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "cloak_feywilds",
  /** Damage type of the relic's damage abilities. */
  damageType: "force",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Fey Step", type: "utility", activation: "bonus", charges: 1, range: 60, target: "space", template: "mistyStep", teleport: true },
    active2: { name: "Arrow of the First Hunt", type: "damage", activation: "special", charges: 2, range: 120, target: "creature", damage: { number: 4, denomination: 8, type: "force" } },
    active3: { name: "Nature's Pursuit", type: "utility", activation: "bonus", charges: 3, range: 0, target: "self" },
    active4: { name: "Briar Snare", type: "save", activation: "action", charges: 4, range: 60, target: "creature", save: "str" },
    avatar: { name: "Avatar of The Hunt", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Signature of The Hunt", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "teleport", type: "utility", activation: "bonus", charges: 1, range: 60, target: "space", note: "Native charge + range only; token movement is manual without macro." },
    active2: { role: "bonus-damage", type: "damage", activation: "special", charges: 2, range: 120, target: "creature", damage: { number: 4, denomination: 8, type: "force" }, note: "Extra force damage after ranged hit." },
    active3: { role: "self-buff", type: "utility", activation: "bonus", charges: 3, range: 0, target: "self", effect: true, note: "+10 ft movement effect." },
    active4: { role: "save-control", type: "save", activation: "action", charges: 4, range: 60, target: "creature", save: "str", note: "STR save; apply Restrained if Midi does not." },
    avatar: { role: "self-buff", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self", effect: true, note: "Avatar helper effect." },
    signature: { role: "signature-state", type: "utility", activation: "special", charges: 0, range: 0, target: "self", effect: true, note: "Signature reminder/state." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    // Perception is always automated; the tracking part of the Survival bonus is GM-resolved.
    0: { changes: [["system.skills.prc.bonuses.check", "ADD", "+{bonus}"], ["system.skills.prc.bonuses.passive", "ADD", "+{bonus}"]], note: "instinct" },
    1: { changes: [["system.attributes.movement.ignoredDifficultTerrain", "ADD", "nonmagical"]], note: "terrain" }
  },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override }) => ({
    active2: [{ key: "flags.the-first-relics.markedByFirstHunt", mode: override, value: "true", priority: 20 }],
    active3: [{ key: "system.attributes.movement.walk", mode: add, value: "10", priority: 20 }],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
      { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
      { key: "system.bonuses.rwak.attack", mode: add, value: `+${bonus}`, priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { teleport: true }, active2: { targetEffect: true, note: "Marked prey helper applied." }, active3: { selfEffect: true },
    active4: { condition: "restrained", targetName: "Restrained — Briar Snare", rounds: 1, seconds: 6 }, avatar: { selfEffect: true }, signature: { selfEffect: true }
  })
};
