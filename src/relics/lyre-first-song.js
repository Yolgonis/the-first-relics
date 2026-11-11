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
    active1: { name: "Song of Rest", type: "heal", activation: "action", charges: 1, range: 30, target: "creature", healing: { number: 2, denomination: 8 } },
    active2: { name: "Ballad of Heroes", type: "utility", activation: "bonus", charges: 2, range: 0, target: "self" },
    active3: { name: "Verse of Silence", type: "save", activation: "action", charges: 3, range: 60, target: "creature", save: "wis" },
    active4: { name: "Chorus of Creation", type: "utility", activation: "action", charges: 4, range: 0, target: "self" },
    avatar: { name: "First Song Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "The First Song", type: "save", activation: "special", charges: 0, range: 60, target: "creature", save: "wis" }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    0: { aura: { distance: 30, self: false }, changes: [["system.bonuses.abilities.check", "ADD", "+{bonus}"]] },
    1: { aura: { distance: 30, self: false }, changes: [["system.traits.ci.value", "ADD", "frightened"]] },
    // @prof resolves against each ally, so an ally of a different level adds their own proficiency bonus.
    2: { aura: { distance: 30, self: false }, changes: [["system.bonuses.abilities.save", "ADD", "+@prof"]] }
  },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override }) => ({
    active2: [
      { key: "system.bonuses.mwak.attack", mode: add, value: "+1", priority: 20 },
      { key: "system.bonuses.rwak.attack", mode: add, value: "+1", priority: 20 },
      { key: "system.bonuses.msak.attack", mode: add, value: "+1", priority: 20 },
      { key: "system.bonuses.rsak.attack", mode: add, value: "+1", priority: 20 },
      { key: "system.bonuses.mwak.damage", mode: add, value: "+1", priority: 20 },
      { key: "system.bonuses.rwak.damage", mode: add, value: "+1", priority: 20 }
    ],
    active4: [
      { key: "system.attributes.ac.bonus", mode: add, value: "2", priority: 20 },
      { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
    ],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
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
  runtime: ({ mode }) => ({ active2: { selfEffect: true }, active3: { condition: "silenced", targetName: "Silenced — Verse of Silence", rounds: 10, seconds: 60 }, active4: { selfEffect: true, tempHp: "10+bonus" }, avatar: { selfEffect: true }, signature: { selfEffect: true, condition: "charmed", targetName: "Charmed — The First Song", rounds: 10, seconds: 60 } })
};
