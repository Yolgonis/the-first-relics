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
    active3: { name: "Glamour Veil", type: "utility", activation: "reaction", charges: 3, range: 0, target: "self" },
    active4: { name: "Briar Snare", type: "save", activation: "special", charges: 4, range: 120, target: "creature", save: "str" },
    avatar: { name: "Avatar of The Hunt", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Signature of The Hunt", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "teleport", note: "Native charge + range only; token movement is manual without macro." },
    active2: { role: "bonus-damage", note: "Extra force damage after a weapon hit; moving Hunter's Mark is manual." },
    active3: { role: "self-protection", note: "Disadvantage on the triggering attack and the counterattack are GM-resolved." },
    active4: { role: "save-control", note: "STR save after a weapon hit; Restrained until the end of your next turn." },
    avatar: { role: "self-buff", effect: true, note: "Flight, hover and a second Hunter's Mark die are automated; the second mark and the companion are GM-resolved." },
    signature: { role: "signature-state", effect: true, note: "Maximized Hunter's Mark damage is automated; the extra attack, tracking and free Fey Step are GM-resolved." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {},
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: {}, 1: {}, 2: { note: "huntersMarkDamage" } },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    active2: [{ key: "flags.the-first-relics.markedByFirstHunt", mode: override, value: "true", priority: 20 }],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "flags.the-first-relics.cloakTwinMark", mode: override, value: "true", priority: 20 }
    ],
    signature: [{ key: "flags.the-first-relics.cloakMaxMark", mode: override, value: "true", priority: 20 }]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { teleport: true },
    active2: { targetEffect: true, note: "Marked prey helper applied. You can move Hunter's Mark to this target without an action." },
    active3: { note: "Glamour Veil is manual: the triggering attack has disadvantage; if it misses, make one weapon attack against the attacker without an action." },
    active4: { condition: "restrained", targetName: "Restrained — Briar Snare", rounds: 1, seconds: 6 },
    avatar: { selfEffect: true, note: "You can keep Hunter's Mark on two creatures; your Primal Companion gains a 40 ft flying speed and adds the relic bonus to its attack rolls." },
    signature: { selfEffect: true, note: "Blessing of Sylvara: make one extra attack when you take the Attack action; you know the marked creature's location within 1 mile; when it drops to 0 HP, move the mark and use Fey Step without spending charges." }
  })
};
