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
    active1: { name: "Kindled Sorcery", type: "utility", activation: "special", charges: 1, range: 0, target: "self" },
    active2: { name: "Burning Blood", type: "utility", activation: "bonus", charges: 2, range: 0, target: "self" },
    active3: { name: "Blood Tithe", type: "utility", activation: "bonus", charges: 3, range: 0, target: "self" },
    active4: { name: "Primordial Breath", type: "damage", activation: "action", charges: 4, range: 60, target: "creature", damage: { number: 10, denomination: 6, type: "fire" } },
    avatar: { name: "First Dragon Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Heart of the First Flame", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "resource-recovery", note: "Regains one expended use of Innate Sorcery." },
    active2: { role: "self-buff", effect: true, note: "Extra 2d6 fire damage on weapon and spell attacks." },
    active3: { role: "resource-recovery", note: "Regains relic bonus + 2 Sorcery Points." },
    avatar: { role: "self-buff", effect: true, note: "Flight, hover, resistances and extra damage; the Metamagic discount is GM-resolved." },
    signature: { role: "self-buff", effect: true, note: "Regains all Sorcery Points; resistance to all damage and a 19-20 critical range; advantage and exhaustion are GM-resolved." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    1: { changes: [["system.traits.dr.value", "ADD", "fire"], ["system.abilities.con.bonuses.save", "ADD", "+{bonus}"]] }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: {}, 3: {} },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    active2: ["mwak", "rwak", "msak", "rsak"].map(type => ({ key: `system.bonuses.${type}.damage`, mode: add, value: "+2d6[fire]", priority: 20 })),
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
      ...["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"]
        .map(type => ({ key: "system.traits.dr.value", mode: add, value: type, priority: 20 })),
      { key: "flags.dnd5e.weaponCriticalThreshold", mode: override, value: "19", priority: 20 },
      { key: "flags.dnd5e.spellCriticalThreshold", mode: override, value: "19", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { itemUses: { identifier: "innate-sorcery", amount: 1 } },
    active2: { selfEffect: true },
    active3: { itemUses: { identifier: "font-of-magic", amount: "bonus+2" } },
    avatar: { selfEffect: true, note: "While First Dragon Incarnate lasts, your Metamagic options cost 1 fewer Sorcery Point (minimum 0); spend the reduced cost manually." },
    signature: { selfEffect: true, itemUses: { identifier: "font-of-magic", amount: "all" }, note: "Heart of the First Flame: you have advantage on attack rolls and saving throws; when it ends, you gain one level of Exhaustion." }
  })
};
