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
    active2: { name: "Second Shadow", type: "utility", activation: "reaction", charges: 2, range: 30, target: "creature" },
    active3: { name: "Fade Away", type: "utility", activation: "reaction", charges: 3, range: 0, target: "self" },
    active4: { name: "Death From Silence", type: "damage", activation: "special", charges: 4, range: 5, target: "creature", damage: { number: 8, denomination: 6, type: "necrotic" } },
    avatar: { name: "Walker Between Shadows", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "One Step Behind", type: "damage", activation: "special", charges: 0, range: 60, target: "creature", damage: { number: 10, denomination: 6, type: "necrotic" }, template: "mistyStep", teleport: true }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active2: { role: "reaction-attack", note: "Reaction weapon attack; Sneak Attack applies if unused this turn." },
    active3: { role: "self-protection", note: "Invisible until the end of your next turn." },
    active4: { role: "bonus-damage", note: "Extra necrotic damage after a Sneak Attack hit; the stun save is GM-resolved." }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: { note: "sneakAttack" }, 1: { note: "chatDamage" }, 3: { note: "midi" } },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "necrotic", priority: 20 },
      { key: "flags.the-first-relics.ignoreOpportunityAttacks", mode: override, value: "true", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { teleport: true },
    active2: { note: "Second Shadow is manual: make one weapon attack against the creature; apply Sneak Attack if you haven't used it this turn." },
    active3: { conditionSelf: "invisible", selfName: "Invisible — Fade Away", rounds: 1, seconds: 6, expireOnTurnEnd: true },
    active4: { note: "Death From Silence: the GM may call for a Constitution saving throw to resist being stunned until the end of your next turn." },
    avatar: { selfEffect: true, note: "While Walker Between Shadows lasts, you can apply Sneak Attack twice per turn (to different creatures) and take the Hide action as a bonus action in any light." },
    signature: { teleport: true, note: "One Step Behind damage is rolled by the activity; teleport helper can be used for shadow movement." }
  })
};
