/**
 * Crown of the Conqueror (Paladin): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "crown_conqueror",
  /** Damage type of the relic's damage abilities. */
  damageType: "radiant",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Crown's Judgment", type: "damage", activation: "special", charges: 1, range: 5, target: "creature", damage: { number: 3, denomination: 8, type: "radiant" } },
    active2: { name: "Royal Decree", type: "save", activation: "bonus", charges: 2, range: 60, target: "creature", save: "wis" },
    active3: { name: "Divine Mandate", type: "utility", activation: "special", charges: 3, range: 0, target: "self" },
    active4: { name: "March of Kings", type: "utility", activation: "bonus", charges: 4, range: 30, target: "creature" },
    avatar: { name: "King Eternal", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "The World Shall Kneel", type: "save", activation: "action", charges: 0, range: 60, target: "creature", save: "wis" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "bonus-damage", note: "Extra radiant damage after a melee hit." },
    active2: { role: "save-control", note: "WIS save; compelled until the end of your next turn." },
    active3: { role: "resource-recovery", note: "Regains one expended use of Channel Divinity." },
    active4: { role: "ally-command", note: "Allies move or attack with their reactions; GM-resolved." },
    avatar: { role: "self-buff", effect: true, note: "Flight, hover, psychic resistance and radiant melee damage; the larger aura is GM-resolved." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {},
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: { note: "smite" }, 1: { note: "banner" }, 2: {} },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "psychic", priority: 20 },
      { key: "system.bonuses.mwak.damage", mode: add, value: "+1d8[radiant]", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active2: { condition: "charmed", targetName: "Compelled — Royal Decree", rounds: 1, seconds: 6 },
    active3: { itemUses: { identifier: "channel-divinity-paladin", amount: 1 } },
    active4: { note: "March of Kings is manual: each chosen ally within 30 ft who can hear you can use its reaction to move up to half its speed or make one weapon attack." },
    avatar: { selfEffect: true, note: "While King Eternal lasts, the radius of your Aura of Protection increases by 10 feet." },
    signature: { condition: "frightened", targetName: "Kneeling — The World Shall Kneel", rounds: 10, seconds: 60, extraTargetChanges: [{ key: "system.attributes.movement.walk", mode: mode("OVERRIDE"), value: "0", priority: 20 }, { key: "system.attributes.movement.fly", mode: mode("OVERRIDE"), value: "0", priority: 20 }, { key: "system.attributes.movement.climb", mode: mode("OVERRIDE"), value: "0", priority: 20 }, { key: "flags.midi-qol.noReactions", mode: mode("OVERRIDE"), value: "1", priority: 20 }], alsoProne: true }
  })
};
