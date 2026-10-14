async function TFRAuditAllRelicEffectAutomation() {
  const relics = await TFRLoadRelics();
  const rows = [];
  for (const relic of relics) {
    for (const slot of TFR_ACTIVITY_SLOTS) {
      const def = TFRGetAbilityDefinition(relic, slot);
      const spec = TFRRelicAbilityRuntimeSpec(relic.id, slot);
      const changes = TFREffectChangesForRelicAbility(relic.id, slot, relic, null);
      rows.push({
        relic: relic.name,
        slot,
        ability: def?.name || "",
        stage: TFRRequiredStageForSlot(slot),
        helper: !!Object.keys(spec || {}).length,
        selfEffect: !!spec.selfEffect,
        targetEffect: !!spec.targetEffect,
        condition: spec.condition || spec.conditionSelf || "",
        save: def?.save || "",
        saveAware: !!(spec.condition && def?.type === "save"),
        teleport: !!spec.teleport,
        cleanup: (spec.removeTarget || spec.removeSelf || []).join(", "),
        changes: changes.length
      });
    }
  }
  console.table(rows);
  ui.notifications.info(TFRT("The First Relics: all relic effect automation audit printed to console."));
  return rows;
}

async function TFRUseCloakAbility(actorOrId, abilityId, options = {}) {
  const actor = TFRResolveActor(actorOrId);
  if (!actor) return ui.notifications.warn(TFRT("{TFR_CLOAK_DISPLAY_NAME}: no actor selected.", { TFR_CLOAK_DISPLAY_NAME: TFR_CLOAK_DISPLAY_NAME }));
  const item = TFRGetActorRelicItem(actor, "cloak_feywilds");
  if (!item) return ui.notifications.warn(TFRT("{actorName} does not have {TFR_CLOAK_DISPLAY_NAME}.", { actorName: actor.name, TFR_CLOAK_DISPLAY_NAME: TFR_CLOAK_DISPLAY_NAME }));

  const abilities = {
    feyStep: { charges: 1, label: "Fey Step", slot: "active1" },
    arrowFirstHunt: { charges: 2, label: "Arrow of the First Hunt", slot: "active2" },
    naturesPursuit: { charges: 3, label: "Nature's Pursuit", slot: "active3" },
    verdantSnare: { charges: 4, label: "Briar Snare", slot: "active4" },
    avatar: { charges: 8, label: "Avatar of the First Hunt", slot: "avatar" },
    signature: { charges: 0, label: "Blessing of Sylvara", slot: "signature" }
  };
  const ability = abilities[abilityId];
  if (!ability) return ui.notifications.warn(TFRT("Unknown Cloak ability: {abilityId}", { abilityId: abilityId }));
  if (TFRBlockRelicFeatureUse(item, ability.label)) return { ok: false, issue: "Attunement refused", actor: actor.name, ability: ability.label };

  const state = await TFRGetRelicState("cloak_feywilds");
  const stage = TFRNormalizeStage(item.getFlag("the-first-relics", "stage") || state?.stage || "dormant");
  const signatureUnlocked = !!item.getFlag("the-first-relics", "signatureUnlocked") || !!state?.signatureUnlocked;

  if (!TFRIsAbilitySlotUnlocked(stage, ability.slot, signatureUnlocked)) {
    const required = ability.slot === "signature"
      ? "Signature unlock / 1000 affinity"
      : `${TFRStageTitle(TFRRequiredStageForSlot(ability.slot))} stage`;
    ui.notifications.warn(TFRT("{abilityLabel} is locked. {itemName} is currently {value}; required: {required}.", { abilityLabel: ability.label, itemName: item.name, value: TFRStageTitle(stage), required: required }));
    return { ok: false, issue: "Locked", actor: actor.name, ability: ability.label, stage, required };
  }

  const spendCharges = options.spendCharges !== false;

  if (abilityId === "feyStep") {
    const token = TFRTokenForActor(actor);
    if (!token) return ui.notifications.warn(TFRT("{TFR_CLOAK_DISPLAY_NAME}: select the bearer's token before using Fey Step.", { TFR_CLOAK_DISPLAY_NAME: TFR_CLOAK_DISPLAY_NAME }));
    return TFRExecuteFeyStep({ token, consumeCharges: spendCharges });
  }

  if (spendCharges && !(await TFRSpendRelicCharges(item, ability.charges))) return { ok: false, issue: "Not enough charges", actor: actor.name, ability: ability.label };

  const target = TFRGetSelectedTargetActor();

  await TFRAutomation.logTimeline("cloak_feywilds", {
    type: "Cloak Quick Use",
    slot: ability.slot,
    actor: actor.name,
    activity: ability.label,
    reason: `${actor.name} used ${ability.label} from the GM Control Panel.${spendCharges ? ` ${ability.charges} charge(s) spent.` : " Charges were already consumed by dnd5e."}`
  });

  if (abilityId === "arrowFirstHunt") {
    await TFRApplyCloakMark(actor, target);
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: TFRChatFlags({ ability: "arrowFirstHunt" }),
      content: `<h2>${TFRT("Arrow of the First Hunt")}</h2><p>${TFRT("Roll the item's damage activity for extra force damage if needed. The target cannot benefit from invisibility against {actor} until the start of {actor}'s next turn.", { actor: actor.name })}</p>`
    });
  }
  if (abilityId === "naturesPursuit") return TFRApplyNaturePursuit(actor, item);
  if (abilityId === "verdantSnare") {
    // Save-based ability: do not apply Restrained immediately. Queue the save resolver instead.
    return TFRUseRelicAbility(actor, "cloak_feywilds", "active4", { ...options, spendCharges: false });
  }
  if (abilityId === "avatar") return TFRApplyCloakAvatar(actor, item);
  if (abilityId === "signature") {
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: TFRChatFlags({ ability: "signature" }),
      content: `<h1>${TFRT("Blessing of Sylvara")}</h1><p>${TFRT("For 1 minute, marked prey cannot hide behind invisibility, mundane hiding, natural terrain, or nonmagical cover. Resolve first-hit extra damage and free Fey Step manually.")}</p>`
    });
  }
}

async function TFRAuditCloakAutomation() {
  const checks = [
    ["TFRUseCloakAbility", typeof TFRUseCloakAbility === "function"],
    ["TFRApplyCloakMark", typeof TFRApplyCloakMark === "function"],
    ["TFRApplyNaturePursuit", typeof TFRApplyNaturePursuit === "function"],
    ["TFRApplyCloakAvatar", typeof TFRApplyCloakAvatar === "function"],
    ["TFRApplyVerdantSnare", typeof TFRApplyVerdantSnare === "function"],
    ["TFRApplyRestrainedCondition", typeof TFRApplyRestrainedCondition === "function"],
    ["TFRSpendRelicCharges", typeof TFRSpendRelicCharges === "function"]
  ];
  console.table(checks.map(([name, ok]) => ({ name, ok })));
  if (checks.some(c => !c[1])) ui.notifications.warn(TFRT("Cloak automation audit failed. Check console."));
  else ui.notifications.info(TFRT("Cloak automation helpers are available."));
  return checks;
}



async function TFRAuditNative() {
  const relics = await TFRLoadRelics();
  const rows = [];
  let index = 1;
  for (const relic of relics) {
    const item = TFRBuildItem(relic, "exalted", index, true);
    const activities = item.system.activities;
    const itemEffectIds = new Set((item.effects || []).map(e => e?._id).filter(Boolean));
    for (const [slot, activity] of Object.entries(activities)) {
      const cfg = TFRAbilityAutomation(relic.id, slot);
      const hasMacro = !!(activity.macroData?.command || activity.macroData?.name);
      const consumes = (activity.consumption?.targets || []).length > 0 || slot === "signature";
      const typeOK = activity.type === cfg.type;
      const damageParts = activity.damage?.parts || [];
      const hasDamageParts = Array.isArray(damageParts) && damageParts.length > 0;
      const damageOK = cfg.type !== "damage" || hasDamageParts;
      const healOK = cfg.type !== "heal" || !!activity.healing;
      const noWrongDamage = cfg.type === "damage" || !hasDamageParts;
      const saveOK = cfg.type !== "save" || (activity.save?.ability === cfg.save);
      const targetOK = (cfg.target === "self" && activity.target?.affects?.type === "self")
        || (cfg.target === "creature" && activity.target?.affects?.type === "creature")
        || (cfg.target === "space" && activity.target?.affects?.type === "space")
        || !cfg.target;
      const effectRefs = activity.effects || [];
      const missingEffectRefs = effectRefs.filter(ref => !itemEffectIds.has(ref._id));
      rows.push({
        relic: relic.name, slot, name: activity.name, role: cfg.role,
        expectedType: cfg.type, type: activity.type, typeOK, damageOK, noWrongDamage,
        healOK, saveOK, targetOK, macroOK: !hasMacro, consumeOK: consumes,
        saveAbility: activity.save?.ability || "", targetType: activity.target?.affects?.type || "",
        damage: hasDamageParts, healing: !!activity.healing, effects: effectRefs.length, nativeEffectOK: !missingEffectRefs.length,
        effectRefs: effectRefs.map(ref => `${ref._id}${ref.onSave === false ? ":failed-save" : ref.onSave === true ? ":always" : ""}`).join(", "),
        charges: activity.consumption?.targets?.[0]?.value || "0", note: cfg.note || ""
      });
    }
    index++;
  }
  console.table(rows);
  const failed = rows.filter(r => !r.typeOK || !r.damageOK || !r.healOK || !r.noWrongDamage || !r.saveOK || !r.targetOK || !r.macroOK || !r.consumeOK || !r.nativeEffectOK);
  if (failed.length) ui.notifications.warn(TFRT("The First Relics Native Audit: {failedCount} issue(s). Check console.", { failedCount: failed.length }));
  else ui.notifications.info(TFRT("The First Relics Native Audit: ability design mapping is valid."));
  return rows;
}




async function TFRAuditTargeting() {
  const relics = await TFRLoadRelics();
  const rows = [];
  let index = 1;

  for (const relic of relics) {
    const activities = TFRBuildActivities(relic, "exalted", index, true);
    for (const [slot, activity] of Object.entries(activities)) {
      rows.push({
        relic: relic.name,
        slot,
        name: activity.name,
        range: activity.range?.value ? `${activity.range.value} ${activity.range.units}` : activity.range?.units || "",
        prompt: !!activity.target?.prompt,
        targetType: activity.target?.affects?.type || "",
        targetCount: activity.target?.affects?.count || "",
        templateType: activity.target?.template?.type || ""
      });
    }
    index++;
  }

  console.table(rows);
  ui.notifications.info(TFRT("The First Relics Targeting Audit complete. Check console."));
  return rows;
}



async function TFRAuditInventorySync() {
  const relics = await TFRLoadRelics();
  const rows = [];

  for (const relic of relics) {
    const state = await TFRGetRelicState(relic.id);
    const copies = TFRFindAllRelicItemCopies(relic);

    for (const item of copies) {
      rows.push({
        relic: relic.name,
        location: item.parent?.name || "World Item Directory",
        itemStage: item.getFlag("the-first-relics", "stage") || "none",
        stateStage: state?.stage || "none",
        signature: !!item.getFlag("the-first-relics", "signatureUnlocked"),
        uuid: item.uuid
      });
    }

    if (!copies.length) {
      rows.push({
        relic: relic.name,
        location: "NO COPIES FOUND",
        itemStage: "",
        stateStage: state?.stage || "none",
        signature: "",
        uuid: ""
      });
    }
  }

  console.table(rows);
  ui.notifications.info(TFRT("The First Relics Inventory Sync Audit complete. Check console."));
  return rows;
}

async function TFRSyncAllInventoryStages() {
  await TFR_STARTUP_SYNC;
  const relics = await TFRLoadRelics();
  const result = [];

  for (const relic of relics) {
    const state = await TFRGetRelicState(relic.id);
    const stage = state?.stage || TFRStageFromAffinity(state?.value || 0);
    const copies = await TFRUpdateAllRelicCopies(relic, stage, !!state?.signatureUnlocked);
    result.push({ relic: relic.name, stage, copies: copies.length });
  }

  console.table(result);
  ui.notifications.info(TFRT("The First Relics: all inventory relic stages synced."));
  return result;
}



async function TFRAuditStageSyncSafety() {
  const relics = await TFRLoadRelics();
  const rows = [];

  const rebuildSource = TFRRebuildRelicItemDocument.toString();
  const createIndex = rebuildSource.indexOf("TFRCreateValidatedRelicReplacement");
  const actorDeleteIndex = rebuildSource.indexOf('parentActor.deleteEmbeddedDocuments("Item", [oldId]');
  const worldDeleteIndex = rebuildSource.indexOf("else await item.delete");
  const rollbackIndex = rebuildSource.indexOf("TFRRollbackReplacementItem");
  const validatesReplacement = TFRCreateValidatedRelicReplacement.toString().includes("TFRValidateRelicReplacement");
  const strategyIssues = [];
  if (createIndex < 0) strategyIssues.push("validated create step missing");
  if (actorDeleteIndex < createIndex || worldDeleteIndex < createIndex) strategyIssues.push("original deletion is not after replacement creation");
  if (rollbackIndex < 0) strategyIssues.push("delete-failure rollback missing");
  if (!validatesReplacement) strategyIssues.push("replacement validation missing");
  rows.push({
    relic: "MODULE REBUILD STRATEGY",
    location: "create → validate → delete; rollback on failure",
    effects: "",
    stage: "all",
    nativeWorkflow: true,
    activities: "",
    validActivityIds: true,
    ok: strategyIssues.length === 0,
    issues: strategyIssues.join("; ")
  });

  for (const relic of relics) {
    const copies = TFRFindAllRelicItemCopies(relic);
    for (const item of copies) {
      const stage = TFRRelicItemStage(item);
      const signatureUnlocked = TFRRelicItemSignatureUnlocked(item);
      const activities = TFRGetActivitiesArray(item);
      const expectedSlots = TFRUnlockedActivitySlots(stage, signatureUnlocked);
      const actualSlots = activities.map(TFRReplacementActivitySlot).filter(Boolean);
      const missingSlots = expectedSlots.filter(slot => !actualSlots.includes(slot));
      const invalidIds = activities
        .map(activity => String(activity?.id || activity?._id || ""))
        .filter(id => !/^[A-Za-z0-9]{16}$/.test(id));
      const itemIssues = [];
      if (activities.length !== expectedSlots.length) itemIssues.push(`activities ${activities.length}/${expectedSlots.length}`);
      if (missingSlots.length) itemIssues.push(`missing ${missingSlots.join(", ")}`);
      if (invalidIds.length) itemIssues.push(`${invalidIds.length} invalid activity id(s)`);
      rows.push({
        relic: relic.name,
        location: item.parent?.name || "World Item Directory",
        effects: item.effects?.size || item.effects?.length || 0,
        stage,
        nativeWorkflow: !!item.getFlag("the-first-relics", "nativeWorkflow"),
        activities: `${activities.length}/${expectedSlots.length}`,
        validActivityIds: invalidIds.length === 0,
        ok: itemIssues.length === 0,
        issues: itemIssues.join("; ")
      });
    }
  }

  console.table(rows);
  const failed = rows.filter(row => !row.ok);
  if (failed.length) ui.notifications.warn(TFRT("Stage sync safety audit found {failedCount} issue(s). Check console.", { failedCount: failed.length }));
  else ui.notifications.info(TFRT("Stage sync safety audit passed."));
  return rows;
}



async function TFRAuditAbilityDesign() {
  const relics = await TFRLoadRelics();
  const rows = [];
  let index = 1;
  for (const relic of relics) {
    const acts = TFRBuildActivities(relic, "exalted", index, true);
    for (const [slot, activity] of Object.entries(acts)) {
      const cfg = TFRAbilityAutomation(relic.id, slot);
      rows.push({
        relic: relic.name,
        slot,
        ability: activity.name,
        role: cfg.role,
        foundryType: activity.type,
        activation: activity.activation?.type || "",
        target: activity.target?.affects?.type || "",
        range: activity.range?.value ? `${activity.range.value} ${activity.range.units}` : activity.range?.units || "",
        save: activity.save?.ability || "",
        damage: activity.damage?.parts?.map(p => `${p.number}d${p.denomination} ${p.types?.join("/")}`).join(", ") || "",
        charges: activity.consumption?.targets?.[0]?.value || "0",
        note: cfg.note || ""
      });
    }
    index++;
  }
  console.table(rows);
  ui.notifications.info(TFRT("Ability design audit complete. Check console."));
  return rows;
}



async function TFRAuditProgression() {
  const relics = await TFRLoadRelics();
  const rows = [];
  for (const relic of relics) {
    const data = await TFRGetRelicState(relic.id);
    const progress = TFRRequirementProgress(relic, data);
    rows.push({
      relic: relic.name,
      affinity: data.value || 0,
      stage: data.stage || "dormant",
      requirements: `${progress.done}/${progress.total}`,
      dreamsSent: Object.keys(data.dreamsSent || {}).length,
      memoriesUnlocked: Object.keys(data.memoriesUnlocked || {}).length,
      timelineEntries: (data.timeline || []).length
    });
  }
  console.table(rows);
  ui.notifications.info(TFRT("The First Relics Progression Audit complete. Check console."));
  return rows;
}



