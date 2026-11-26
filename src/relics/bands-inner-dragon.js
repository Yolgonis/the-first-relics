/**
 * Bands of the Inner Dragon (Monk): the game definitions the module code reads.
 * Lore, feature text, stages and affinity events are in data/relics.json.
 */
export default {
  id: "bands_inner_dragon",
  /** Damage type of the relic's damage abilities. */
  damageType: "force",
  /** The six abilities by slot: what the item's activities are built from. */
  abilities: {
    active1: { name: "Dragon Seizes", type: "damage", activation: "reaction", charges: 1, range: 5, target: "creature", damage: { formula: "2@scale.monk.die", type: "force" } },
    active2: { name: "Still Breath", type: "utility", activation: "bonus", charges: 2, range: 0, target: "self" },
    active3: { name: "Coiled Scales", type: "utility", activation: "reaction", charges: 3, range: 0, target: "self" },
    active4: { name: "Perfect Strike", type: "damage", activation: "special", charges: 4, range: 5, target: "creature", damage: { formula: "4@scale.monk.die", type: "force" } },
    avatar: { name: "Inner Dragon Manifest", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Dragon Unbound", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
  },
  /** Per-slot overrides on top of `abilities` that describe how each activity is automated. */
  automation: {
    active1: { role: "bonus-damage", note: "Force damage (2 Martial Arts dice) to a creature that hits or misses you with a melee attack." },
    active2: { role: "focus-recovery", note: "Regains relic bonus + 1 Focus Points." },
    active3: { role: "self-protection", note: "+5 AC until the start of your next turn." },
    active4: { role: "bonus-damage", note: "Extra force damage (4 Martial Arts dice) after a hit." },
    avatar: { role: "self-buff", effect: true, note: "Flight, hover, extra force damage; 1 Focus Point at the start of each of your turns." },
    signature: { role: "self-buff", note: "Regains all Focus Points; resistances, immunities, 19-20 critical range." }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    // dnd5e has no unarmed-only damage bonus, so the bonus applies to all melee weapon attacks.
    3: { changes: [["system.bonuses.mwak.damage", "ADD", "+{bonus}[force]"]], note: "meleeWeapon" }
  },
  /** Passives run by hooks in 27-passive-triggers.js: passive index -> { note? }. */
  passiveTriggers: { 2: {} },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override, custom }) => ({
    active3: [{ key: "system.attributes.ac.bonus", mode: add, value: "+5", priority: 20 }],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
      { key: "system.attributes.movement.hover", mode: custom, value: "true", priority: 20 },
      { key: "system.bonuses.mwak.damage", mode: add, value: "+1d10[force]", priority: 20 },
      { key: "flags.the-first-relics.innerDragonFocus", mode: override, value: "true", priority: 20 }
    ],
    signature: [
      ...["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "radiant", "slashing", "thunder"]
        .map(type => ({ key: "system.traits.dr.value", mode: add, value: type, priority: 20 })),
      ...["grappled", "restrained", "stunned"].map(status => ({ key: "system.traits.ci.value", mode: add, value: status, priority: 20 })),
      { key: "flags.dnd5e.weaponCriticalThreshold", mode: override, value: "19", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { note: "If you are grappling the target, it can't escape your grapple until the start of your next turn; track this manually." },
    active2: { focus: "bonus+1" },
    active3: { selfEffect: true, rounds: 1, seconds: 6 },
    avatar: { selfEffect: true },
    signature: { selfEffect: true, focus: "all", note: "While Dragon Unbound lasts, your Monk features cost 1 fewer Focus Point (minimum 0); spend the reduced cost manually." }
  })
};
