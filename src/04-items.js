function TFRNormalizeStage(stage) {
  return TFR_STAGES.includes(stage) ? stage : "dormant";
}

function TFRStageRank(stage) {
  return TFR_STAGES.indexOf(TFRNormalizeStage(stage));
}

function TFRStageAtLeast(stage, minimum) {
  return TFRStageRank(stage) >= TFRStageRank(minimum);
}

function TFRRequiredStageForSlot(slot) {
  const required = {
    active1: "dormant",
    active2: "dormant",
    active3: "awakened",
    active4: "awakened",
    avatar: "exalted",
    signature: "signature"
  };
  return required[slot] || "dormant";
}

function TFRIsAbilitySlotUnlocked(stage, slot, signatureUnlocked = false) {
  stage = TFRNormalizeStage(stage);
  if (slot === "signature") return !!signatureUnlocked;
  const required = TFRRequiredStageForSlot(slot);
  return TFRStageAtLeast(stage, required);
}

function TFRUnlockedActivitySlots(stage = "dormant", signatureUnlocked = false) {
  stage = TFRNormalizeStage(stage);
  const slots = ["active1", "active2"];
  if (TFRStageAtLeast(stage, "awakened")) slots.push("active3", "active4");
  if (TFRStageAtLeast(stage, "exalted")) slots.push("avatar");
  if (signatureUnlocked) slots.push("signature");
  return slots;
}

function TFRActivityKeyFromDocument(activity) {
  if (!activity) return null;
  return activity.id || activity._id || activity.key || activity.name || null;
}

function TFRActivityKeys(itemOrActivities) {
  const acts = itemOrActivities?.system?.activities ?? itemOrActivities;
  if (!acts) return [];

  const keys = [];
  const push = value => {
    if (value !== null && value !== undefined && value !== "") keys.push(String(value));
  };

  if (typeof acts.keys === "function") {
    try { for (const key of acts.keys()) push(key); } catch (err) {}
  }

  if (Array.isArray(acts.contents)) {
    for (const activity of acts.contents) push(TFRActivityKeyFromDocument(activity));
  }

  if (typeof acts.entries === "function") {
    try { for (const [key, activity] of acts.entries()) push(key || TFRActivityKeyFromDocument(activity)); } catch (err) {}
  }

  if (typeof acts.toObject === "function") {
    try { for (const key of Object.keys(acts.toObject() || {})) push(key); } catch (err) {}
  }

  if (Array.isArray(acts)) {
    for (const activity of acts) push(TFRActivityKeyFromDocument(activity));
  } else if (typeof acts === "object" && !Array.isArray(acts.contents)) {
    for (const key of Object.keys(acts)) push(key);
  }

  return Array.from(new Set(keys));
}

function TFRActivityDeletePatch(itemOrActivities, keepSlots = []) {
  const keep = new Set(keepSlots);
  const keys = new Set([...TFR_ACTIVITY_SLOTS, ...TFRActivityKeys(itemOrActivities)]);
  const patch = {};
  for (const key of keys) {
    if (keep.has(key)) continue;
    patch[`system.activities.-=${key}`] = null;
  }
  return patch;
}

async function TFRClearLockedActivities(item, keepSlots = []) {
  if (!item?.update) return false;
  const patch = TFRActivityDeletePatch(item, keepSlots);
  if (!Object.keys(patch).length) return false;
  await item.update(patch);
  return true;
}

function TFRRelicItemStage(item) {
  return TFRNormalizeStage(item?.getFlag?.("the-first-relics", "stage") || item?.flags?.["the-first-relics"]?.stage || "dormant");
}

function TFRRelicItemSignatureUnlocked(item) {
  return !!(item?.getFlag?.("the-first-relics", "signatureUnlocked") || item?.flags?.["the-first-relics"]?.signatureUnlocked);
}

function TFRBuildActivities(relic, stage = "dormant", index = 1, signatureUnlocked = false) {
  const activities = {};
  const slots = TFRUnlockedActivitySlots(stage, signatureUnlocked);

  let sort = 100000;
  for (const slot of slots) {
    const activity = TFRCreateEngineActivity(relic, slot, stage, signatureUnlocked);
    if (!activity) continue;
    activity.sort = sort;
    if (relic.id === "cloak_feywilds" && slot === "active1") TFRMarkFeyStepExternalAnimationsDisabled(activity);
    sort += 100000;
    activities[slot] = activity;
  }

  return activities;
}



function TFRMarkFeyStepExternalAnimationsDisabled(data) {
  if (!data) return data;
  data.flags = data.flags || {};
  data.flags["autoanimations"] = {
    ...(data.flags["autoanimations"] || {}),
    disabled: true,
    disable: true,
    enabled: false,
    sourceName: ""
  };
  data.flags["the-first-relics"] = {
    ...(data.flags["the-first-relics"] || {}),
    internalTeleportAnimation: true,
    externalAnimationHint: "disabled"
  };
  return data;
}

function TFRBuildEffect(relic, stage, signatureUnlocked = false) {
  const stageData = TFRGetStageData(relic, stage, signatureUnlocked);
  return {
    name: `${relic.name} - ${stageData.title} Relic Bonus`,
    img: relic.icon,
    transfer: true,
    disabled: false,
    changes: TFRBaseChanges(stageData),
    duration: {},
    flags: {
      dae: { transfer: true, stackable: "noneName", specialDuration: [] },
      [TFR_MODULE_ID]: {
        relicBonus: true,
        finalForm: TFRIsFinalForm(stage, signatureUnlocked)
      }
    }
  };
}

function TFRRelicBonusEffect(itemOrData) {
  const effects = itemOrData?.effects?.contents || itemOrData?.effects || [];
  const list = Array.isArray(effects) ? effects : Array.from(effects?.values?.() || Object.values(effects));
  return list.find(effect =>
    effect?.getFlag?.(TFR_MODULE_ID, "relicBonus") ||
    effect?.flags?.[TFR_MODULE_ID]?.relicBonus ||
    /Relic Bonus$/i.test(effect?.name || "")
  ) || null;
}

function TFRHasUniversalRelicBonus(itemOrData, bonus) {
  const effect = TFRRelicBonusEffect(itemOrData);
  if (!effect) return false;
  const expected = TFRBaseChanges({ bonus });
  const actual = effect?.changes?.contents || effect?.changes || [];
  return expected.every(change => actual.some(candidate =>
    candidate?.key === change.key && String(candidate?.value) === String(change.value)
  ));
}

async function TFRSyncRelicBonusEffect(item, relic, stage, signatureUnlocked = false) {
  const next = TFRBuildEffect(relic, stage, signatureUnlocked);
  const existing = TFRRelicBonusEffect(item);
  if (existing?.update) {
    await existing.update(next);
    return existing;
  }
  const [created] = await item.createEmbeddedDocuments("ActiveEffect", [next], { render: false });
  return created;
}

function TFRBuildItemEffects(relic, stage, signatureUnlocked = false) {
  return [
    TFRBuildEffect(relic, stage, signatureUnlocked),
    ...TFRBuildNativeActivityEffects(relic, stage, signatureUnlocked)
  ];
}

function TFRBuildItem(relic, stage, index, signatureUnlocked = false) {
  const stageData = TFRGetStageData(relic, stage, signatureUnlocked);
  return {
    name: relic.name,
    type: "equipment",
    img: relic.icon,
    system: {
      activities: TFRBuildActivities(relic, stage, index, signatureUnlocked),
      uses: {
        max: String(stageData.charges),
        spent: 0,
        recovery: [{ period: "dawn", type: "recoverAll" }]
      },
      description: { value: TFRBuildDescription(relic, stage, signatureUnlocked), chat: "" },
      identifier: relic.id,
      source: { custom: "The First Relics", revision: 1, rules: "2024" },
      identified: true,
      unidentified: { description: "" },
      container: null,
      quantity: 1,
      weight: { value: 1, units: "lb" },
      price: { value: 0, denomination: "gp" },
      rarity: "artifact",
      attunement: TFRAttunementForStage(stage),
      attuned: false,
      equipped: false,
      crew: { value: [] },
      armor: { value: null, dex: null },
      proficient: null,
      properties: ["mgc"],
      strength: null,
      type: { value: "wondrous", baseItem: "" }
    },
    effects: TFRBuildItemEffects(relic, stage, signatureUnlocked),
    folder: null,
    flags: {
      dnd5e: { riders: { activity: [] } },
      "the-first-relics": {
        relicId: relic.id,
        stage,
        signatureUnlocked: !!signatureUnlocked,
        finalForm: TFRIsFinalForm(stage, signatureUnlocked),
        nativeWorkflow: true,
        [TFR_ATTUNEMENT_REFUSAL_FLAG]: false
      }
    }
  };
}

async function TFRCreateRelics() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  const relics = await TFRLoadRelics();
  const worldState = TFRGetWorldState();
  const toCreate = [];
  let index = 1;
  for (const relic of relics) {
    if (!game.items.getName(relic.name)) {
      const itemData = TFRBuildItem(relic, "dormant", index);
      itemData.flags[TFR_MODULE_ID][TFR_ATTUNEMENT_REFUSAL_FLAG] = !!worldState[relic.id]?.refusesAttunement;
      toCreate.push(itemData);
    }
    index++;
  }
  if (!toCreate.length) return ui.notifications.info(TFRT("The First Relics: No new relics to create."));
  const created = await Item.createDocuments(toCreate, { renderSheet: false, render: false });
  ui.notifications.info(TFRT("The First Relics: {createdCount} living relic items created.", { createdCount: created.length }));
  return created;
}

function TFRCloneRelicItemDataForStage(relic, stage, index, sourceItem = null, signatureUnlocked = false) {
  const data = TFRBuildItem(relic, stage, index, signatureUnlocked);
  data.flags = foundry.utils.mergeObject(data.flags || {}, foundry.utils.deepClone(sourceItem?.flags || {}), { inplace: false });
  data.flags["the-first-relics"] = {
    ...(data.flags["the-first-relics"] || {}),
    relicId: relic.id,
    stage,
    signatureUnlocked: !!signatureUnlocked,
    finalForm: TFRIsFinalForm(stage, signatureUnlocked),
    nativeWorkflow: true,
    rebuiltAt: Date.now(),
    rebuildReason: "stage-sync"
  };

  data.system.activities = TFRBuildActivities(relic, stage, index, signatureUnlocked);
  data.system.description.value = TFRBuildDescription(relic, stage, signatureUnlocked);
  data.system.attunement = TFRAttunementForStage(stage);

  if (sourceItem) {
    const oldSystem = sourceItem.system || {};
    data.folder = sourceItem.folder?.id || sourceItem.folder || null;
    data.sort = sourceItem.sort ?? data.sort;
    data.ownership = foundry.utils.deepClone(sourceItem.ownership || data.ownership || {});

    if (oldSystem.quantity !== undefined) data.system.quantity = oldSystem.quantity;
    if (oldSystem.weight !== undefined) data.system.weight = foundry.utils.deepClone(oldSystem.weight);
    if (oldSystem.attuned !== undefined) data.system.attuned = oldSystem.attuned;
    if (oldSystem.equipped !== undefined) data.system.equipped = oldSystem.equipped;

    const spent = Number(oldSystem.uses?.spent ?? 0) || 0;
    const max = Number(data.system.uses?.max ?? 0) || 0;
    data.system.uses.spent = Math.clamp(spent, 0, max);
  }

  if (TFRRelicRefusesAttunement(data)) {
    data.system.attuned = false;
    data.system.attunement = "required";
  }

  return data;
}


function TFRRenderApplicationSafe(app) {
  if (!app?.render) return;
  try { app.render(true); return; } catch (err) {}
  try { app.render({ force: true }); return; } catch (err) {}
  try { app.render(false); } catch (err) {}
}

function TFRRefreshActorAndItemSheets(actor, oldItemId = null, newItem = null) {
  const oldId = oldItemId ? String(oldItemId) : null;
  const newId = newItem?.id ? String(newItem.id) : null;
  const actorUuid = actor?.uuid;

  const refresh = () => {
    // Do not call actor.sheet.render(...) directly here. In Foundry that can open a
    // closed character sheet while the Test Lab or a stage rebuild is running. Only
    // refresh applications that are already present in ui.windows.
    for (const app of Object.values(ui.windows || {})) {
      const doc = app?.document || app?.object || null;
      const appActor = app?.actor || doc?.parent || null;

      const isActorSheet = !!actor && (
        doc?.uuid === actorUuid || doc?.id === actor.id || appActor?.uuid === actorUuid || appActor?.id === actor.id
      ) && doc?.documentName !== "Item";

      const isOldItemSheet = oldId && doc?.documentName === "Item" && String(doc.id) === oldId && (
        !actor || doc?.parent?.id === actor.id || appActor?.id === actor.id
      );

      const isNewItemSheet = newId && doc?.documentName === "Item" && String(doc.id) === newId && (
        !actor || doc?.parent?.id === actor.id || appActor?.id === actor.id
      );

      try {
        if (isOldItemSheet && !isNewItemSheet) app.close?.();
        else if (isActorSheet || isNewItemSheet) TFRRenderApplicationSafe(app);
      } catch (err) {}
    }

    try { ui.actors?.render?.(true); } catch (err) {}
    try { ui.items?.render?.(true); } catch (err) {}
  };

  refresh();
  setTimeout(refresh, 75);
  setTimeout(refresh, 300);
  setTimeout(refresh, 750);
}

function TFRReplacementActivitySlot(activity) {
  const data = activity?.toObject ? activity.toObject() : activity;
  return activity?.getFlag?.(TFR_MODULE_ID, "slot") || data?.flags?.[TFR_MODULE_ID]?.slot || "";
}

function TFRValidateRelicReplacement(item, relic, stage, signatureUnlocked = false) {
  if (!item?.id || item.deleted) throw new Error("replacement item was not created");
  const relicId = item.getFlag?.(TFR_MODULE_ID, "relicId") || item.flags?.[TFR_MODULE_ID]?.relicId;
  const itemStage = TFRNormalizeStage(item.getFlag?.(TFR_MODULE_ID, "stage") || item.flags?.[TFR_MODULE_ID]?.stage || "dormant");
  const itemSignature = !!(item.getFlag?.(TFR_MODULE_ID, "signatureUnlocked") || item.flags?.[TFR_MODULE_ID]?.signatureUnlocked);
  const itemFinalForm = !!(item.getFlag?.(TFR_MODULE_ID, "finalForm") || item.flags?.[TFR_MODULE_ID]?.finalForm);
  const expectedFinalForm = TFRIsFinalForm(stage, signatureUnlocked);
  if (relicId !== relic.id) throw new Error(`replacement relic id ${relicId || "missing"} != ${relic.id}`);
  if (itemStage !== stage) throw new Error(`replacement stage ${itemStage} != ${stage}`);
  if (itemSignature !== !!signatureUnlocked) throw new Error(`replacement signature flag ${itemSignature} != ${!!signatureUnlocked}`);
  if (itemFinalForm !== expectedFinalForm) throw new Error(`replacement final-form flag ${itemFinalForm} != ${expectedFinalForm}`);
  const expectedStageData = TFRGetStageData(relic, stage, signatureUnlocked);
  const expectedBonus = expectedStageData.bonus;
  const expectedCharges = Number(expectedStageData.charges) || 0;
  if (!TFRHasUniversalRelicBonus(item, expectedBonus)) throw new Error(`replacement universal relic bonus is not +${expectedBonus}`);
  const itemCharges = Number(item.system?.uses?.max) || 0;
  if (itemCharges !== expectedCharges) throw new Error(`replacement maximum charges ${itemCharges} != ${expectedCharges}`);

  const activities = TFRGetActivitiesArray(item);
  const expectedSlots = TFRUnlockedActivitySlots(stage, signatureUnlocked);
  const actualSlots = activities.map(TFRReplacementActivitySlot).filter(Boolean);
  const missingSlots = expectedSlots.filter(slot => !actualSlots.includes(slot));
  const unexpectedSlots = actualSlots.filter(slot => !expectedSlots.includes(slot));
  const invalidIds = activities
    .map(activity => String(activity?.id || activity?._id || ""))
    .filter(id => !/^[A-Za-z0-9]{16}$/.test(id));
  if (activities.length !== expectedSlots.length || missingSlots.length || unexpectedSlots.length || invalidIds.length) {
    throw new Error(
      `replacement activities invalid: expected ${expectedSlots.length}, got ${activities.length}; ` +
      `missing [${missingSlots.join(", ")}], unexpected [${unexpectedSlots.join(", ")}], invalid ids ${invalidIds.length}`
    );
  }

  return { itemId: item.id, relicId, stage: itemStage, signatureUnlocked: itemSignature, finalForm: itemFinalForm, bonus: expectedBonus, charges: itemCharges, activities: activities.length };
}

async function TFRRollbackReplacementItem(created, parentActor = null) {
  if (!created?.id) return true;
  try {
    if (parentActor?.items?.get?.(created.id)) {
      await parentActor.deleteEmbeddedDocuments("Item", [created.id], { render: false });
    } else if (created.delete) {
      await created.delete({ render: false });
    }
    return true;
  } catch (rollbackError) {
    console.error(`The First Relics | Could not roll back replacement item ${created.uuid || created.id}.`, rollbackError);
    return false;
  }
}

async function TFRCreateValidatedRelicReplacement(data, relic, stage, signatureUnlocked, parentActor = null) {
  const replacementData = foundry.utils.deepClone(data);
  delete replacementData._id;
  let created = null;
  try {
    if (parentActor) {
      [created] = await parentActor.createEmbeddedDocuments("Item", [replacementData], { render: false, renderSheet: false });
    } else {
      created = await Item.create(replacementData, { render: false, renderSheet: false });
    }
    TFRValidateRelicReplacement(created, relic, stage, signatureUnlocked);
    return created;
  } catch (createError) {
    const rolledBack = await TFRRollbackReplacementItem(created, parentActor);
    const rollbackNote = rolledBack ? "temporary replacement rolled back" : "temporary replacement rollback failed";
    throw new Error(`could not create a valid replacement; original item kept; ${rollbackNote}`, { cause: createError });
  }
}

async function TFRRebuildRelicItemDocument(item, relic, stage, signatureUnlocked = false) {
  const relics = await TFRLoadRelics();
  const index = relics.findIndex(r => r.id === relic.id) + 1;
  const data = TFRCloneRelicItemDataForStage(relic, stage, index, item, signatureUnlocked);
  const parentActor = item?.parent?.documentName === "Actor" || (typeof Actor !== "undefined" && item?.parent instanceof Actor)
    ? item.parent
    : null;
  const oldId = item?.id || null;

  // Create and validate the replacement while the original still exists. A creation or
  // validation failure therefore leaves the original item untouched.
  const created = await TFRCreateValidatedRelicReplacement(data, relic, stage, signatureUnlocked, parentActor);

  try {
    if (parentActor) await parentActor.deleteEmbeddedDocuments("Item", [oldId], { render: false });
    else await item.delete({ render: false });
  } catch (deleteError) {
    const originalStillExists = parentActor
      ? !!parentActor.items?.get?.(oldId)
      : !!game.items?.get?.(oldId);
    if (originalStillExists) {
      const rolledBack = await TFRRollbackReplacementItem(created, parentActor);
      const rollbackNote = rolledBack ? "replacement rolled back" : "replacement rollback failed; duplicate may remain";
      throw new Error(`could not delete original item; original kept; ${rollbackNote}`, { cause: deleteError });
    }
    console.warn(`The First Relics | Original item ${oldId} disappeared despite a delete error; keeping its validated replacement.`, deleteError);
  }

  TFRRefreshActorAndItemSheets(parentActor, oldId, created);
  return created;
}

async function TFRUpdateRelicItem(item, stage, signatureUnlockedOverride = null) {
  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.name === item.name || item.getFlag("the-first-relics", "relicId") === r.id);
  if (!relic) return null;

  stage = TFRNormalizeStage(stage);
  const index = relics.findIndex(r => r.id === relic.id) + 1;
  const signatureUnlocked = signatureUnlockedOverride !== null ? !!signatureUnlockedOverride : !!item.getFlag("the-first-relics", "signatureUnlocked");
  const stageData = TFRGetStageData(relic, stage, signatureUnlocked);
  const activities = TFRBuildActivities(relic, stage, index, signatureUnlocked);
  const allowedSlots = Object.keys(activities);

  // dnd5e 5.x can keep stale Activity documents inside the item collection when activity maps are
  // merged repeatedly. Those stale docs sometimes surface as undefined Cast activities and break
  // upgrades with "cachedSpell" errors. Rebuild the item as clean stage data instead of mutating the
  // existing activity collection in place.
  try {
    const rebuilt = await TFRRebuildRelicItemDocument(item, relic, stage, signatureUnlocked);
    ui.notifications.info(TFRT("{relicName} rebuilt as {stageDataTitle}.", { relicName: relic.name, stageDataTitle: stageData.title }));
    return rebuilt;
  } catch (rebuildError) {
    console.warn("The First Relics | Clean item rebuild failed, falling back to field update.", rebuildError);
  }

  await TFRClearLockedActivities(item, []);
  await item.update({
    "name": relic.name,
    "system.rarity": stageData.rarity || item.system?.rarity,
    "system.price.value": stageData.price || item.system?.price?.value || 0,
    "system.uses.max": String(stageData.charges),
    "system.description.value": TFRBuildDescription(relic, stage, signatureUnlocked),
    "system.attunement": TFRAttunementForStage(stage),
    "system.activities": activities,
    "flags.the-first-relics.stage": stage,
    "flags.the-first-relics.relicId": relic.id,
    "flags.the-first-relics.signatureUnlocked": signatureUnlocked,
    "flags.the-first-relics.finalForm": TFRIsFinalForm(stage, signatureUnlocked),
    "flags.the-first-relics.nativeWorkflow": true
  });
  await TFRSyncRelicBonusEffect(item, relic, stage, signatureUnlocked);
  await TFRClearLockedActivities(item, allowedSlots);

  ui.notifications.info(TFRT("{relicName} upgraded to {stageDataTitle}.", { relicName: relic.name, stageDataTitle: stageData.title }));
  return item;
}

async function TFRUpgradeItem(item) {
  const current = item?.getFlag("the-first-relics", "stage") || "dormant";
  const next = current === "dormant" ? "awakened" : current === "awakened" ? "exalted" : "exalted";
  return TFRUpdateRelicItem(item, next);
}

async function TFRDowngradeItem(item) {
  const current = item?.getFlag("the-first-relics", "stage") || "dormant";
  const prev = current === "exalted" ? "awakened" : current === "awakened" ? "dormant" : "dormant";
  return TFRUpdateRelicItem(item, prev);
}

