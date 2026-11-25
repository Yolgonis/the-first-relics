/**
 * Vestments of the First Saint (Cleric): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "vestments_first_saint",
  /** Damage type of the relic's damage abilities. */
  damageType: "radiant",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Blessing", type: "utility", activation: "bonus", charges: 1, range: 30, target: "creature" },
    active2: { name: "Cleansing Light", type: "utility", activation: "bonus", charges: 2, range: 30, target: "creature" },
    active3: { name: "Steadfast Prayer", type: "utility", activation: "reaction", charges: 3, range: 0, target: "self" },
    active4: { name: "Wings of Mercy", type: "heal", activation: "action", charges: 4, range: 60, target: "creature", healing: { number: 6, denomination: 8 } },
    avatar: { name: "Saint Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Miracle of the First Saint", type: "utility", activation: "special", charges: 0, range: 60, target: "creature" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active3: { role: "concentration-save", note: "Turn the failed concentration save into a success; GM-resolved." },
    avatar: { role: "self-buff", effect: true, note: "Flight, hover and radiant resistance; ally healing each turn is GM-resolved." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    0: { aura: { distance: 30, self: false }, changes: [["system.attributes.death.roll.mode", "ADD", "1"]] }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 1: {}, 2: {}, 3: {} },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    active1: [
      { key: "system.bonuses.abilities.save", mode: add, value: "+1d4", priority: 20 },
      { key: "system.bonuses.abilities.check", mode: add, value: "+1d4", priority: 20 },
      ...["mwak", "rwak", "msak", "rsak"].map(type => ({ key: `system.bonuses.${type}.attack`, mode: add, value: "+1d4", priority: 20 }))
    ],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "radiant", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { targetEffect: true },
    active2: { removeTarget: ["poisoned", "diseased", "frightened", "charmed"], note: "Cleansing Light helper removed common conditions from the selected target." },
    active3: { note: "Steadfast Prayer is manual: the failed concentration saving throw succeeds instead." },
    avatar: { selfEffect: true, note: "While Saint Incarnate lasts, allies near you regain hit points equal to the relic bonus at the start of their turns." },
    signature: { removeTarget: ["poisoned", "diseased", "frightened", "charmed", "paralyzed", "stunned"], note: "Miracle cleanup helper ran on selected target; resurrection/healing remains GM-resolved." }
  })
};
