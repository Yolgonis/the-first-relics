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
    active1: { name: "Dragon Breath", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self" },
    active2: { name: "Iron Soul", type: "utility", activation: "reaction", charges: 2, range: 0, target: "self" },
    active3: { name: "Hundred Forms", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
    active4: { name: "Perfect Strike", type: "utility", activation: "action", charges: 4, range: 0, target: "self" },
    avatar: { name: "Inner Dragon Manifest", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
    signature: { name: "Dragon Unbound", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
  },
  /** Always-on passives as Active Effects: passive index -> { changes, aura?, note? }. */
  passiveEffects: {
    0: { changes: [["system.attributes.concentration.roll.mode", "ADD", "1"]] },
    // dnd5e derives jump distance after effects apply, so only the speed bonus is automated.
    2: { changes: [["system.attributes.movement.walk", "ADD", "10"]], note: "speedOnly" }
  },
  /** Active Effect changes applied when an ability is used, by slot. `bonus` is the stage bonus. */
  abilityEffects: ({ bonus, add, upgrade, override }) => ({
    active1: [
      { key: "system.attributes.movement.walk", mode: add, value: "10", priority: 20 },
      { key: "system.attributes.movement.climb", mode: upgrade, value: "30", priority: 20 }
    ],
    active3: [
      { key: "system.attributes.ac.bonus", mode: add, value: "2", priority: 20 },
      { key: "system.bonuses.abilities.check", mode: add, value: `+${bonus}`, priority: 20 }
    ],
    active4: [{ key: "flags.the-first-relics.perfectStrikeReady", mode: override, value: "true", priority: 20 }],
    avatar: [
      { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
      { key: "system.traits.dr.value", mode: add, value: "force", priority: 20 },
      { key: "system.bonuses.mwak.damage", mode: add, value: "+2d10[force]", priority: 20 }
    ],
    signature: [
      { key: "system.attributes.movement.walk", mode: add, value: "30", priority: 20 },
      { key: "system.traits.ci.value", mode: add, value: "stunned", priority: 20 },
      { key: "system.traits.ci.value", mode: add, value: "restrained", priority: 20 }
    ]
  }),
  /** What the module does when an ability is used, by slot (helper effects, conditions, reminders). `mode` gives an Active Effect mode by name. */
  runtime: ({ mode }) => ({
    active1: { selfEffect: true },
    active2: { note: "Iron Soul is manual: use the reaction benefit against the triggering effect, then resolve the reduced or resisted result." },
    active3: { selfEffect: true },
    active4: { selfEffect: true, rounds: 2, seconds: 12 },
    avatar: { selfEffect: true },
    signature: { selfEffect: true }
  })
};
