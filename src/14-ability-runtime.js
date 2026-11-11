function TFRActorTotalLevel(actor) {
  const direct = Number(actor?.system?.details?.level);
  if (Number.isFinite(direct) && direct > 0) return direct;
  let total = 0;
  for (const item of actor?.items || []) {
    if (item.type === "class") total += Number(item.system?.levels || 0) || 0;
  }
  return total || Number(actor?.system?.details?.cr) || 1;
}

async function TFRApplyTempHp(actor, amount, label = "Temporary Hit Points") {
  if (!actor || !Number.isFinite(Number(amount))) return false;
  const current = Number(actor.system?.attributes?.hp?.temp || 0) || 0;
  const next = Math.max(current, Number(amount));
  if (next > current) await actor.update({ "system.attributes.hp.temp": next });
  ui.notifications.info(TFRT("{label}: {actorName} has {next} temp HP.", { label: label, actorName: actor.name, next: next }));
  return true;
}

async function TFRApplyVerdantSnare(actor, targetActor = null, item = null, options = {}) {
  const targetToken = TFRGetSelectedTargetToken();
  const target = targetActor || targetToken?.actor || null;
  if (!target) {
    ui.notifications.warn(TFRT("Briar Snare: target one creature first."));
    return null;
  }

  const effect = await TFRApplyRestrainedCondition(actor, targetToken || target, item);
  const note = options.fromDnd5eCard
    ? TFRT("dnd5e consumed the resource. Restrained was applied as a GM helper; remove it if the target succeeds its save.")
    : TFRT("Restrained was applied as a GM helper; remove it if the target succeeds its save.");

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ ability: "verdantSnare", targetActorId: target.id }),
    content: `<h2>${TFRT("Briar Snare")}</h2><p>${TFRT("Target: {target}.", { target: target.name })} ${note}</p>`
  });
}


async function TFRApplyCloakMark(sourceActor, targetActor) {
  if (!sourceActor || !targetActor) {
    ui.notifications.warn(TFRT("{TFR_CLOAK_DISPLAY_NAME}: select a target token first.", { TFR_CLOAK_DISPLAY_NAME: TFR_CLOAK_DISPLAY_NAME }));
    return null;
  }
  const effect = TFREffectData(
    `Marked by the First Hunt (${sourceActor.name})`,
    "modules/the-first-relics/art/icons/cloak-feywilds.svg",
    [{ key: "flags.the-first-relics.markedByFirstHunt", mode: TFRMode("OVERRIDE"), value: sourceActor.id, priority: 20 }],
    10, 60
  );
  const created = await TFRApplyOrRefreshEffect(targetActor, effect);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
    flags: TFRChatFlags({ ability: "arrowFirstHunt", targetActorId: targetActor.id }),
    content: `<h2>${TFRT("Marked by the First Hunt")}</h2><p>${TFRT("{target} is marked by {source}. Resolve invisibility denial, tracking, Avatar advantage, and Signature interactions manually where needed.", { target: targetActor.name, source: sourceActor.name })}</p>`
  });
  return created;
}

async function TFRApplyNaturePursuit(actor, item) {
  const effect = TFREffectData(
    "Nature's Pursuit",
    item?.img || "modules/the-first-relics/art/icons/cloak-feywilds.svg",
    [{ key: "system.attributes.movement.walk", mode: TFRMode("ADD"), value: "10", priority: 20 }],
    10, 60, item?.uuid
  );
  await TFRApplyOrRefreshEffect(actor, effect);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ ability: "naturesPursuit" }),
    content: `<h2>${TFRT("Nature's Pursuit")}</h2><p>${TFRT("{actor}'s speed increases by 10 ft for 1 minute. Ignore nonmagical difficult terrain and long-range disadvantage manually where needed.", { actor: actor.name })}</p>`
  });
}

async function TFRApplyCloakAvatar(actor, item) {
  const effect = TFREffectData(
    "Avatar of the First Hunt",
    item?.img || "modules/the-first-relics/art/icons/cloak-feywilds.svg",
    [
      { key: "system.attributes.movement.fly", mode: TFRMode("UPGRADE"), value: "40", priority: 20 },
      { key: "system.attributes.movement.hover", mode: TFRMode("OVERRIDE"), value: "true", priority: 20 },
      { key: "system.bonuses.abilities.save", mode: TFRMode("ADD"), value: "+1", priority: 20 }
    ],
    10, 60, item?.uuid
  );
  await TFRApplyOrRefreshEffect(actor, effect);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ ability: "avatar" }),
    content: `<h2>${TFRT("Avatar of the First Hunt")}</h2><p>${TFRT("{actor} manifests Sylvara's hunt. Fly 40 ft, hover, and helper bonuses are applied. Resolve marked target advantage, cover ignore, beast behavior, and terrain narration manually.", { actor: actor.name })}</p>`
  });
}


function TFRRelicStageBonusFromItem(relic, item) {
  const stage = item ? TFRRelicItemStage(item) : "dormant";
  return Number(TFRGetStageData(relic, stage)?.bonus || 1) || 1;
}

function TFREffectChangesForRelicAbility(relicId, slot, relic = null, item = null) {
  const bonus = relic ? TFRRelicStageBonusFromItem(relic, item) : 1;
  const add = TFRMode("ADD");
  const upgrade = TFRMode("UPGRADE");
  const override = TFRMode("OVERRIDE");
    const common = {
    cloak_feywilds: {
      active2: [{ key: "flags.the-first-relics.markedByFirstHunt", mode: override, value: "true", priority: 20 }],
      active3: [{ key: "system.attributes.movement.walk", mode: add, value: "10", priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.bonuses.rwak.attack", mode: add, value: `+${bonus}`, priority: 20 }
      ]
    },
    mantle_first_seer: {
      active1: [{ key: "system.bonuses.abilities.check", mode: add, value: `+${bonus}`, priority: 20 }],
      active4: [{ key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.attributes.senses.truesight", mode: upgrade, value: "30", priority: 20 },
        { key: "system.bonuses.abilities.check", mode: add, value: `+${bonus}`, priority: 20 },
        { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
      ]
    },
    girdle_unbroken: {
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.traits.ci.value", mode: add, value: "prone", priority: 20 }
      ],
      signature: [
        { key: "system.traits.ci.value", mode: add, value: "frightened", priority: 20 },
        { key: "system.traits.ci.value", mode: add, value: "paralyzed", priority: 20 },
        { key: "system.traits.ci.value", mode: add, value: "prone", priority: 20 }
      ]
    },
    chains_patron: {
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "necrotic", priority: 20 }
      ]
    },
    aegis_dawn: {
      active1: [{ key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }],
      active2: [{ key: "system.attributes.ac.bonus", mode: add, value: "4", priority: 20 }],
      active3: [{ key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "bludgeoning", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "piercing", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "slashing", priority: 20 },
        { key: "system.bonuses.mwak.damage", mode: add, value: "+2d8[radiant]", priority: 20 },
        { key: "system.bonuses.rwak.damage", mode: add, value: "+2d8[radiant]", priority: 20 }
      ]
    },
    crown_conqueror: {
      active3: [{ key: "system.attributes.ac.bonus", mode: add, value: "2", priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "psychic", priority: 20 },
        { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
      ]
    },
    bands_inner_dragon: {
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
    },
    cloak_shadowfell: {
      active2: [{ key: "flags.midi-qol.advantage.attack.all", mode: override, value: "1", priority: 20 }],
      active3: [{ key: "flags.the-first-relics.livingDarkness", mode: override, value: "true", priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "necrotic", priority: 20 },
        { key: "flags.the-first-relics.ignoreOpportunityAttacks", mode: override, value: "true", priority: 20 }
      ]
    },
    heart_yggdrasil: {
      active3: [
        { key: "system.traits.dr.value", mode: add, value: "acid", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "cold", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "fire", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "lightning", priority: 20 }
      ],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "acid", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "cold", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "fire", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "lightning", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "poison", priority: 20 }
      ]
    },
    vestments_first_saint: {
      active1: [
        { key: "system.bonuses.abilities.save", mode: add, value: "+1d4", priority: 20 },
        { key: "system.bonuses.abilities.check", mode: add, value: "+1d4", priority: 20 },
        { key: "system.bonuses.mwak.attack", mode: add, value: "+1d4", priority: 20 },
        { key: "system.bonuses.rwak.attack", mode: add, value: "+1d4", priority: 20 },
        { key: "system.bonuses.msak.attack", mode: add, value: "+1d4", priority: 20 },
        { key: "system.bonuses.rsak.attack", mode: add, value: "+1d4", priority: 20 }
      ],
      active3: [
        { key: "system.traits.dr.value", mode: add, value: "bludgeoning", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "piercing", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "slashing", priority: 20 }
      ],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "radiant", priority: 20 }
      ]
    },
    blood_first_dragon: {
      active2: [
        { key: "system.bonuses.mwak.damage", mode: add, value: "+2d6[fire]", priority: 20 },
        { key: "system.bonuses.rwak.damage", mode: add, value: "+2d6[fire]", priority: 20 }
      ],
      active3: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "60", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 }
      ],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "80", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "fire", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "cold", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "lightning", priority: 20 },
        { key: "system.bonuses.mwak.damage", mode: add, value: "+2d10[fire]", priority: 20 },
        { key: "system.bonuses.rwak.damage", mode: add, value: "+2d10[fire]", priority: 20 }
      ],
      signature: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "80", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
      ]
    },
    lyre_first_song: {
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
    }
  };
  return foundry.utils.deepClone(common[relicId]?.[slot] || []);
}

function TFRRelicAbilityEffectData(relic, slot, item = null, actor = null) {
  if (!relic || !slot) return null;
  const def = TFRGetAbilityDefinition(relic, slot);
  const changes = TFREffectChangesForRelicAbility(relic.id, slot, relic, item);
  const img = item?.img || relic.icon || "icons/svg/aura.svg";
  const name = def?.name || slot;
  if (!changes.length && !["signature", "avatar"].includes(slot)) return null;
  return TFREffectData(`${name} — ${relic.name}`, img, changes, 10, 60, item?.uuid || null);
}

function TFRRelicAbilityRuntimeSpec(relicId, slot) {
  const specs = {
    cloak_feywilds: {
      active1: { teleport: true }, active2: { targetEffect: true, note: "Marked prey helper applied." }, active3: { selfEffect: true },
      active4: { condition: "restrained", targetName: "Restrained — Briar Snare", rounds: 1, seconds: 6 }, avatar: { selfEffect: true }, signature: { selfEffect: true }
    },
    mantle_first_seer: {
      active1: { selfEffect: true, rounds: 2, seconds: 12 },
      active2: { note: "Moment of Clarity is manual: after the d20 is rolled but before the outcome, add or subtract the relic bonus." },
      active3: { note: "Threads of Fate is manual: force the visible d20 result to be rerolled, then resolve the chosen result." },
      active4: { selfEffect: true, rounds: 1, seconds: 6 },
      avatar: { selfEffect: true },
      signature: { note: "Chronicle Unwritten is manual: after seeing the d20 result but before the outcome, force a reroll and choose the final result." }
    },
    girdle_unbroken: {
      active1: { removeSelf: ["prone"], tempHp: "level+bonus", rounds: 1, seconds: 6 },
      active3: { note: "Refuse the Fall is manual: reroll the failed Strength, Constitution, or Wisdom save and use the new result." },
      active4: { note: "Hold the World is manual: protect the chosen creature within 10 ft, then resolve the AC bonus, movement, or intercepted effect with the GM." },
      avatar: { selfEffect: true },
      signature: { selfEffect: true }
    },
    chains_patron: {
      active1: { note: "Patron's Glance is manual: the GM reveals pact, curse, oath, or binding information about the target." },
      active3: { condition: "restrained", targetName: "Restrained — Chain of Binding", rounds: 1, seconds: 6 },
      active4: { note: "Pay the Difference is manual: take the approved necrotic cost, then reroll the failed saving throw." },
      avatar: { selfEffect: true },
      signature: { condition: "restrained", targetName: "Restrained — Price of Eternity", extraTargetChanges: [{ key: "flags.the-first-relics.teleportBlocked", mode: TFRMode("OVERRIDE"), value: "true", priority: 20 }, { key: "flags.the-first-relics.invisibilityBlocked", mode: TFRMode("OVERRIDE"), value: "true", priority: 20 }], rounds: 10, seconds: 60 }
    },
    aegis_dawn: { active1: { selfEffect: true, rounds: 1, seconds: 6 }, active2: { targetEffect: true, rounds: 1, seconds: 6 }, active3: { selfEffect: true }, active4: { condition: "blinded", targetName: "Blinded — Break the Darkness", rounds: 1, seconds: 6 }, avatar: { selfEffect: true }, signature: { removeTarget: ["frightened", "charmed"], note: "Last Sunrise healing/refusal is GM-resolved; fear/charm cleanup helper ran on the selected target if any." } },
    crown_conqueror: {
      active1: { note: "Rally is manual: choose the ally, then apply the relic's morale/leadership benefit for the current scene." },
      active2: { condition: "charmed", targetName: "Compelled — Royal Decree", rounds: 1, seconds: 6 },
      active3: { selfEffect: true },
      active4: { note: "March of Kings is manual: move or reposition the chosen ally/creature as the table resolves the command." },
      avatar: { selfEffect: true },
      signature: { condition: "frightened", targetName: "Kneeling — The World Shall Kneel", rounds: 10, seconds: 60, extraTargetChanges: [{ key: "system.attributes.movement.walk", mode: TFRMode("OVERRIDE"), value: "0", priority: 20 }, { key: "system.attributes.movement.fly", mode: TFRMode("OVERRIDE"), value: "0", priority: 20 }, { key: "system.attributes.movement.climb", mode: TFRMode("OVERRIDE"), value: "0", priority: 20 }, { key: "flags.midi-qol.noReactions", mode: TFRMode("OVERRIDE"), value: "1", priority: 20 }], alsoProne: true }
    },
    bands_inner_dragon: {
      active1: { selfEffect: true },
      active2: { note: "Iron Soul is manual: use the reaction benefit against the triggering effect, then resolve the reduced or resisted result." },
      active3: { selfEffect: true },
      active4: { selfEffect: true, rounds: 2, seconds: 12 },
      avatar: { selfEffect: true },
      signature: { selfEffect: true }
    },
    cloak_shadowfell: { active1: { teleport: true }, active2: { conditionSelf: "invisible", selfName: "Invisible — Fade Away", rounds: 1, seconds: 6, expireOnTurnEnd: true }, active3: { selfEffect: true, note: "Living Darkness template/area still needs GM placement; darkness state helper applied to bearer." }, avatar: { selfEffect: true }, signature: { teleport: true, note: "One Step Behind damage is rolled by the activity; teleport helper can be used for shadow movement." } },
    heart_yggdrasil: { active1: { note: "Verdant Bloom is manual: place and resolve the plant/terrain growth area with the GM." }, active3: { selfEffect: true }, active4: { condition: "restrained", targetName: "Restrained — Roots of Eternity", rounds: 10, seconds: 60 }, avatar: { selfEffect: true }, signature: { removeTarget: ["poisoned", "diseased", "frightened", "charmed"], note: "World Reborn healing/damage is GM-resolved; cleanup helper ran on selected target if any." } },
    vestments_first_saint: { active1: { targetEffect: true }, active2: { removeTarget: ["poisoned", "diseased", "frightened", "charmed"], note: "Cleansing Light helper removed common conditions from the selected target." }, active3: { selfEffect: true }, avatar: { selfEffect: true }, signature: { removeTarget: ["poisoned", "diseased", "frightened", "charmed", "paralyzed", "stunned"], note: "Miracle cleanup helper ran on selected target; resurrection/healing remains GM-resolved." } },
    blood_first_dragon: { active1: { condition: "frightened", targetName: "Frightened — Draconic Roar", rounds: 1, seconds: 6 }, active2: { selfEffect: true }, active3: { selfEffect: true }, avatar: { selfEffect: true }, signature: { selfEffect: true } },
    lyre_first_song: { active2: { selfEffect: true }, active3: { condition: "silenced", targetName: "Silenced — Verse of Silence", rounds: 10, seconds: 60 }, active4: { selfEffect: true, tempHp: "10+bonus" }, avatar: { selfEffect: true }, signature: { selfEffect: true, condition: "charmed", targetName: "Charmed — The First Song", rounds: 10, seconds: 60 } }
  };
  return specs[relicId]?.[slot] || {};
}

async function TFRExecuteRelicTeleport({ token = null, actor = null, relicId, slot, consumeCharges = false, message = null } = {}) {
  token = token || (actor ? TFRTokenForActor(actor) : TFRSelectedToken());
  if (!token) { ui.notifications.warn(TFRT("Relic teleport: select the bearer's token first.")); return { ok: false, issue: "No token" }; }
  actor = actor || token.actor;
  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === relicId);
  const item = TFRFindActorRelicItem(actor, relicId);
  const def = relic ? TFRGetAbilityDefinition(relic, slot) : null;
  if (!actor || !relic || !item || !def) return { ok: false, issue: "Missing relic teleport data" };
  if (TFRBlockRelicFeatureUse(item, def.name || "Relic teleport")) return { ok: false, issue: "Attunement refused" };
  const range = def.range || 30;
  const from = TFRTokenCenter(token);
  const destination = await TFRPickCanvasPointWithRange({ origin: from, rangeFeet: range, message: message || TFRT("{defName}: click a destination within {range} ft. Press Esc to cancel.", { defName: def.name, range }) });
  if (!destination) return { ok: false, issue: "Cancelled" };
  const distance = TFRDistanceFeet(from, destination);
  if (distance > range + 0.001) { ui.notifications.warn(TFRT("{defName}: destination is {distance} ft away, max is {range} ft.", { defName: def.name, distance: distance.toFixed(1), range: range })); return { ok: false, issue: "Out of range" }; }
  if (consumeCharges && !(await TFRSpendRelicCharges(item, def.charges || 0))) return { ok: false, issue: "Not enough charges" };
  const topLeft = TFRDestinationTopLeftForToken(token, destination);
  const restoreTeleportVisual = await TFRPlaySimpleTeleportAnimation(token, destination);
  await TFRMoveTokenAsTeleport(token, topLeft);
  if (typeof restoreTeleportVisual === "function") await restoreTeleportVisual();
  await TFRLogRelicTimelineSafe(relicId, { type: "Automation Execute", slot, actor: actor.name, activity: def.name, reason: `${actor.name} used ${def.name} (${distance.toFixed(1)} ft).${consumeCharges ? "" : " Charges were already consumed by dnd5e."}` });
  return { ok: true, relic: relic.name, activity: def.name, actor: actor.name, distance: Number(distance.toFixed(2)) };
}

async function TFRApplyRelicAbilityRuntime(actor, relicId, slot, options = {}) {
  if (!actor || !relicId || !slot) return null;
  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === relicId);
  const item = TFRFindActorRelicItem(actor, relicId);
  if (!relic || !item) return null;
  const def = TFRGetAbilityDefinition(relic, slot);
  if (TFRBlockRelicFeatureUse(item, def?.name || "Relic ability")) return { ok: false, issue: "Attunement refused" };
  const spec = TFRRelicAbilityRuntimeSpec(relicId, slot);
  const targetToken = TFRGetSelectedTargetToken();
  const targetActor = targetToken?.actor || TFRGetSelectedTargetActor();
  const effect = TFRRelicAbilityEffectData(relic, slot, item, actor);
  let applied = false;

  if (TFRShouldPreferNativeActivityEffects(relic, slot, options) && TFRRuntimeWorkCoveredByNativeEffects(spec)) {
    await TFRLogRelicTimelineSafe(relicId, {
      type: "Native Activity Effect",
      slot,
      actor: actor.name,
      activity: def?.name || slot,
      reason: `${actor.name} used ${def?.name || slot}. Effects are available on the native dnd5e chat card.`
    });
    return null;
  }

  if (spec.teleport) { const token = TFRTokenFromChatMessage(options.message, actor) || TFRTokenForActor(actor) || TFRSelectedToken(); await TFRExecuteRelicTeleport({ token, actor, relicId, slot, consumeCharges: options.spendCharges === true }); applied = true; }
  if (spec.removeSelf?.length) { await TFRRemoveActorConditions(actor, spec.removeSelf); applied = true; }
  if (spec.selfEffect && effect) { if (spec.rounds || spec.seconds) effect.duration = { ...(effect.duration || {}), rounds: spec.rounds, seconds: spec.seconds }; await TFRApplyOrRefreshEffect(actor, effect); applied = true; }
  if (spec.conditionSelf) { await TFRApplyStatusCondition(actor, actor, item, spec.conditionSelf, spec.selfName || `${def?.name} — ${relic.name}`, spec.rounds || 10, spec.seconds || 60, [], { expireOnTurnEnd: !!spec.expireOnTurnEnd }); applied = true; }
  if (spec.targetEffect) { if (!targetActor) ui.notifications.warn(TFRT("{value}: target one creature first for the helper effect.", { value: def?.name || "Relic ability" })); else if (effect) { if (spec.rounds || spec.seconds) effect.duration = { ...(effect.duration || {}), rounds: spec.rounds, seconds: spec.seconds }; await TFRApplyOrRefreshEffect(targetActor, effect); applied = true; } }
  let saveQueued = false;
  let saveQueueResult = null;
  if (spec.condition) {
    const saveConditionNeedsResolver = def?.type === "save" && options.forceApplyCondition !== true;
    if (saveConditionNeedsResolver) {
      saveQueueResult = await TFRQueueSaveAwareCondition(actor, relicId, slot, options);
      saveQueued = !!saveQueueResult?.queued;
      applied = applied || saveQueued;
    } else if (!targetActor) {
      ui.notifications.warn(TFRT("{value}: target one creature first for the condition helper.", { value: def?.name || "Relic ability" }));
    } else {
      const changes = foundry.utils.deepClone(spec.extraTargetChanges || []);
      await TFRApplyStatusCondition(actor, targetToken || targetActor, item, spec.condition, spec.targetName || `${def?.name} — ${relic.name}`, spec.rounds || 10, spec.seconds || 60, changes, { expireOnTurnEnd: !!spec.expireOnTurnEnd });
      if (spec.alsoProne) await TFRApplyStatusCondition(actor, targetToken || targetActor, item, "prone", "Prone — The World Shall Kneel", spec.rounds || 10, spec.seconds || 60, [], { expireOnTurnEnd: !!spec.expireOnTurnEnd });
      applied = true;
    }
  }
  if (spec.removeTarget?.length) { if (!targetActor) ui.notifications.warn(TFRT("{value}: target a creature to run cleanup helper.", { value: def?.name || "Relic ability" })); else { await TFRRemoveActorConditions(targetActor, spec.removeTarget); applied = true; } }
  if (spec.tempHp) { const bonus = TFRRelicStageBonusFromItem(relic, item); let amount = 0; if (spec.tempHp === "level+bonus") amount = TFRActorTotalLevel(actor) + bonus; else if (spec.tempHp === "10+bonus") amount = 10 + bonus; else amount = Number(spec.tempHp) || 0; if (amount > 0) { await TFRApplyTempHp(actor, amount, def?.name || "Relic Temp HP"); applied = true; } }

  if (saveQueued) {
    await TFRLogRelicTimelineSafe(relicId, { type: "Save Resolver Queued", slot, actor: actor.name, activity: def?.name || slot, reason: `${actor.name} used ${def?.name || slot}. Waiting for save result or manual resolver before applying ${spec.condition}.` });
    if (!spec.note || !applied) return saveQueueResult?.chatMessage || null;
  }

  if (applied || spec.note) {
    await TFRLogRelicTimelineSafe(relicId, { type: "Ability Helper", slot, actor: actor.name, activity: def?.name || slot, reason: `${actor.name} used ${def?.name || slot}. Helper effects ${applied ? "applied/queued" : "not required"}.` });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: TFRChatFlags({ abilityHelper: true, relicId, slot, helperKind: TFRAbilityHelperKind({ applied, saveQueued, spec }) }),
      content: TFRAbilityHelperChatContent({ relic, def, spec, applied, saveQueued })
    });
  }
  return null;
}

async function TFRUseSelectedRelicAbility(relicId, slot, options = {}) {
  if (!relicId) {
    ui.notifications.warn(TFRT("Selected Relic Quick Actions: select a relic in the dashboard first."));
    return { ok: false, issue: "No relic selected" };
  }
  const actor = TFRSelectedActor();
  if (!actor) {
    ui.notifications.warn(TFRT("Selected Relic Quick Actions: select the bearer's token."));
    return { ok: false, issue: "No actor selected" };
  }
  const item = TFRFindActorRelicItem(actor, relicId);
  if (!item) {
    const relic = await TFRGetRelicById(relicId);
    ui.notifications.warn(TFRT("{value} was not found on {actorName}.", { value: relic?.name || relicId, actorName: actor.name }));
    return { ok: false, issue: "Actor does not have selected relic" };
  }
  return TFRUseRelicAbility(actor, relicId, slot, options);
}

async function TFRUseRelicAbility(actorOrId, relicId, slot, options = {}) {
  const actor = TFRResolveActor(actorOrId);
  if (!actor) return ui.notifications.warn(TFRT("The First Relics: no actor selected."));
  const item = TFRFindActorRelicItem(actor, relicId);
  if (!item) return ui.notifications.warn(TFRT("{actorName} does not have {relicId}.", { actorName: actor.name, relicId: relicId }));
  if (TFRBlockRelicFeatureUse(item, slot || "Relic ability")) return { ok: false, issue: "Attunement refused" };
  const stage = TFRRelicItemStage(item);
  const signatureUnlocked = TFRRelicItemSignatureUnlocked(item);
  if (!TFRIsAbilitySlotUnlocked(stage, slot, signatureUnlocked)) { const required = slot === "signature" ? "Signature unlock / 1000 affinity" : `${TFRStageTitle(TFRRequiredStageForSlot(slot))} stage`; ui.notifications.warn(TFRT("{slot} is locked. {itemName} is currently {value}; required: {required}.", { slot: slot, itemName: item.name, value: TFRStageTitle(stage), required: required })); return { ok: false, issue: "Locked" }; }
  if (options.spendCharges === true) { const relics = await TFRLoadRelics(); const relic = relics.find(r => r.id === relicId); const def = relic ? TFRGetAbilityDefinition(relic, slot) : null; if (def?.charges && !(await TFRSpendRelicCharges(item, def.charges))) return { ok: false, issue: "Not enough charges" }; }
  return TFRApplyRelicAbilityRuntime(actor, relicId, slot, options);
}

function TFRTextHasNeedle(haystack, needle) {
  const value = String(needle || "").trim().toLowerCase();
  if (!value) return false;
  return String(haystack || "").toLowerCase().includes(value);
}

function TFRNormalizeChatHaystack(message) {
  const text = TFRChatMessagePlainText(message).toLowerCase();
  let flagText = "";
  try { flagText = JSON.stringify(message?.flags || {}).toLowerCase(); } catch (err) {}
  return `${text} ${flagText}`.replace(/\s+/g, " ").trim();
}

function TFRChatMentionsRelicItem(message, actor, relicId, item, haystack = null) {
  haystack = haystack ?? TFRNormalizeChatHaystack(message);
  const names = [
    item?.name,
    relicId,
    String(relicId || "").replaceAll("_", " "),
    item?.getFlag?.(TFR_MODULE_ID, "relicId")
  ].filter(Boolean);
  if (names.some(n => TFRTextHasNeedle(haystack, n))) return true;

  let flagText = "";
  try { flagText = JSON.stringify(message?.flags || {}).toLowerCase(); } catch (err) {}
  const ids = [item?.id, item?._id, item?.uuid].filter(Boolean).map(x => String(x).toLowerCase());
  return ids.some(id => id && flagText.includes(id));
}

function TFRActivityBadgeScore(def, slot, haystack) {
  if (!def) return 0;
  const h = ` ${String(haystack || "").toLowerCase().replace(/\s+/g, " ")} `;
  let score = 0;

  const name = String(def.name || "").toLowerCase();
  if (name && h.includes(name)) score += 100;

  // Some dnd5e v5 item chat cards show only the item name plus badge chips, not the activity name.
  // These badge matches identify the used activity without depending on fragile HTML structure.
  const activation = String(def.activation || "").toLowerCase();
  if (activation === "bonus" && (h.includes(" bonus action ") || h.includes(" bonus "))) score += 12;
  else if (activation === "reaction" && h.includes(" reaction ")) score += 12;
  else if (activation === "action" && h.includes(" action ") && !h.includes(" bonus action ")) score += 8;
  else if (activation === "special" && h.includes(" special ")) score += 8;

  const range = Number(def.range || 0);
  if (range > 0) {
    const rangeBits = [`${range} ft`, `${range}ft`, `${range} feet`];
    if (rangeBits.some(bit => h.includes(bit))) score += 12;
  }

  const target = String(def.target || "").toLowerCase();
  if (target === "space" && h.includes(" space ")) score += 12;
  else if (target === "self" && h.includes(" self ")) score += 12;
  else if (target === "creature" && h.includes(" creature ")) score += 8;

  // Newer dnd5e flags often include the activity id/key directly. If present, trust it strongly.
  if (h.includes(`"${slot}"`) || h.includes(`/${slot}`) || h.includes(`.${slot}`)) score += 80;
  return score;
}

function TFRInferRelicSlotFromChatBadges(relicId, item, haystack) {
  const defs = TFRAbilityDefinitions()[relicId] || {};
  const stage = TFRRelicItemStage(item);
  const signatureUnlocked = TFRRelicItemSignatureUnlocked(item);
  const allowed = TFRUnlockedActivitySlots(stage, signatureUnlocked);
  let best = null;
  let tied = false;

  for (const slot of allowed) {
    const def = defs[slot];
    if (!def) continue;
    const score = TFRActivityBadgeScore(def, slot, haystack);
    if (!best || score > best.score) {
      best = { relicId, slot, name: def.name, score };
      tied = false;
    } else if (best && score === best.score && score > 0) {
      tied = true;
    }
  }

  // 20+ normally means at least two reliable badge hits, or a direct name/slot hit.
  if (best && best.score >= 20 && !tied) return best;
  return null;
}

function TFRRelicAbilityFromChatMessage(message, actor = null) {
  if (!message || !actor) return null;
  if (message.getFlag?.(TFR_MODULE_ID, "tfrAutomationMessage")) return null;
  if (message.getFlag?.(TFR_MODULE_ID, "genericRelicAutomationHandled")) return null;

  const haystack = TFRNormalizeChatHaystack(message);
  const defs = TFRAbilityDefinitions();

  for (const [relicId, slots] of Object.entries(defs)) {
    const item = TFRFindActorRelicItem(actor, relicId);
    if (!item) continue;
    if (!TFRChatMentionsRelicItem(message, actor, relicId, item, haystack)) continue;

    // Infer by explicit ability names, activity ids, and dnd5e badge chips such as
    // REACTION + SELF or BONUS ACTION + 30 FT + 1 SPACE.
    const inferred = TFRInferRelicSlotFromChatBadges(relicId, item, haystack);
    if (inferred) return inferred;

    // Fallback for translated worlds, where ability names and badge text are not English:
    // dnd5e records the used activity on its chat card, and the activity carries its slot flag.
    const activityId = TFRContentLanguage() !== "en" ? message.flags?.dnd5e?.activity?.id : null;
    const flaggedActivity = activityId ? item.system?.activities?.get?.(activityId) : null;
    const flaggedSlot = flaggedActivity ? TFRGetActivitySlot(flaggedActivity) : null;
    if (flaggedSlot && slots[flaggedSlot]) {
      return { relicId, slot: flaggedSlot, name: flaggedActivity.name || slots[flaggedSlot].name, score: 100 };
    }
  }
  return null;
}


