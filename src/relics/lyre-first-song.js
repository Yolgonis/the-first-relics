/**
 * Lyre of the First Song (Bard): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "lyre_first_song",
  /** Damage type of the relic's damage abilities. */
  damageType: "thunder",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Rallying Chord", type: "heal", activation: "bonus", charges: 1, range: 30, target: "creature", healing: { number: 2, denomination: 8 } },
    active2: { name: "Ballad of Heroes", type: "utility", activation: "bonus", charges: 2, range: 0, target: "self" },
    active3: { name: "Encore", type: "utility", activation: "special", charges: 3, range: 0, target: "self" },
    active4: { name: "Chorus of Creation", type: "utility", activation: "bonus", charges: 4, range: 0, target: "self" },
    avatar: { name: "First Song Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "The First Song", type: "save", activation: "special", charges: 0, range: 60, target: "creature", save: "wis" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active3: { role: "resource-recovery", note: "Regains two expended uses of Bardic Inspiration." },
    avatar: { role: "self-buff", effect: true, note: "Flight, hover and resistances; free and after-success Bardic Inspiration are GM-resolved." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    // The ADD grows the die one step; the DOWNGRADE, applied after it, keeps it at d12 at most.
    1: { changes: [["system.scale.bard.inspiration.faces", "ADD", "2"], ["system.scale.bard.inspiration.faces", "DOWNGRADE", "12"]] }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: {}, 3: {} },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    active2: [
      ...["mwak", "rwak", "msak", "rsak"].map(type => ({ key: `system.bonuses.${type}.attack`, mode: add, value: "+1", priority: 20 })),
      { key: "system.bonuses.mwak.damage", mode: add, value: "+1", priority: 20 },
      { key: "system.bonuses.rwak.damage", mode: add, value: "+1", priority: 20 }
    ],
    active4: [
      { key: "system.attributes.ac.bonus", mode: add, value: "2", priority: 20 },
      { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
    ],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "radiant", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "psychic", priority: 20 }
    ],
    signature: [
      { key: "system.attributes.ac.bonus", mode: add, value: "2", priority: 20 },
      { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 },
      { key: "system.bonuses.abilities.check", mode: add, value: `+${bonus}`, priority: 20 },
      { key: "system.bonuses.mwak.attack", mode: add, value: "+2", priority: 20 },
      { key: "system.bonuses.rwak.attack", mode: add, value: "+2", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active2: { selfEffect: true },
    active3: { itemUses: { identifier: "bardic-inspiration", amount: 2 } },
    active4: { selfEffect: true, tempHp: "10+bonus" },
    avatar: { selfEffect: true, note: "While First Song Incarnate lasts, giving Bardic Inspiration doesn't take a bonus action, and a creature can use it after a successful roll too. Your healing songs restore extra hit points equal to the relic bonus." },
    signature: { selfEffect: true, condition: "charmed", targetName: "Charmed — The First Song", rounds: 10, seconds: 60 }
  })
};
