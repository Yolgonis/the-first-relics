/**
 * Aegis of the Dawn (Fighter): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "aegis_dawn",
  /** Damage type of the relic's damage abilities. */
  damageType: "radiant",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Tactical Renewal", type: "utility", activation: "special", charges: 1, range: 0, target: "self" },
    active2: { name: "Dawn Barrier", type: "utility", activation: "reaction", charges: 2, range: 30, target: "creature" },
    active3: { name: "Surge of Dawn", type: "utility", activation: "special", charges: 3, range: 0, target: "self" },
    active4: { name: "Sunbreak Strike", type: "damage", activation: "special", charges: 4, range: 5, target: "creature", damage: { number: 4, denomination: 8, type: "radiant" } },
    avatar: { name: "Dawn Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Last Sunrise", type: "utility", activation: "special", charges: 0, range: 30, target: "creature" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "resource-recovery", note: "Regains a Superiority Die or Psionic Energy die, or a use of Second Wind." },
    active3: { role: "resource-recovery", note: "Regains one expended use of Action Surge." },
    active4: { role: "bonus-damage", note: "Extra radiant damage after a weapon hit; blinding a fiend or undead is GM-resolved." },
    avatar: { role: "self-buff", effect: true, note: "Flight, hover, resistances and radiant damage; the second Weapon Mastery property is GM-resolved." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    2: { changes: [["system.bonuses.mwak.damage", "ADD", "+{bonus}[radiant]"], ["system.bonuses.rwak.damage", "ADD", "+{bonus}[radiant]"]] }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 0: {}, 3: {} },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    active2: [{ key: "system.attributes.ac.bonus", mode: add, value: "4", priority: 20 }],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "bludgeoning", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "piercing", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "slashing", priority: 20 },
      { key: "system.bonuses.mwak.damage", mode: add, value: "+2d8[radiant]", priority: 20 },
      { key: "system.bonuses.rwak.damage", mode: add, value: "+2d8[radiant]", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { itemUses: { identifier: ["combat-superiority", "psionic-power", "second-wind"], amount: 1 } },
    active2: { targetEffect: true, rounds: 1, seconds: 6 },
    active3: { itemUses: { identifier: "action-surge", amount: 1 } },
    active4: { note: "Sunbreak Strike: a fiend or undead hit by it is blinded until the end of your next turn." },
    avatar: { selfEffect: true, note: "While Dawn Incarnate lasts, you can give your weapon a second Weapon Mastery property you know." },
    signature: { removeTarget: ["frightened", "charmed"], note: "Last Sunrise healing/refusal is GM-resolved; fear/charm cleanup helper ran on the selected target if any." }
  })
};
