function TFRActivityChargeCost(activity) {
  const targets = activity?.consumption?.targets || [];
  const itemUse = targets.find(target => target?.type === "itemUses") || targets[0];
  return Number(itemUse?.value || 0);
}

function TFRActivityRangeValue(activity) {
  if (!activity?.range || activity.range.units === "self") return 0;
  return Number(activity.range.value || 0);
}

function TFRActivityTargetType(activity) {
  return activity?.target?.affects?.type || "";
}

function TFRActivityDamageSpec(activity) {
  const part = activity?.damage?.parts?.[0];
  if (!part) return "";
  return `${Number(part.number || 0)}d${Number(part.denomination || 0)} ${part.types?.[0] || ""}`.trim();
}

function TFRDefinitionDamageSpec(def) {
  if (!def?.damage) return "";
  return `${Number(def.damage.number || 0)}d${Number(def.damage.denomination || 0)} ${def.damage.type || ""}`.trim();
}

function TFRActivityHealingSpec(activity) {
  if (!activity?.healing) return "";
  return `${Number(activity.healing.number || 0)}d${Number(activity.healing.denomination || 0)}`;
}

function TFRDefinitionHealingSpec(def) {
  if (!def?.healing) return "";
  return `${Number(def.healing.number || 0)}d${Number(def.healing.denomination || 0)}`;
}

function TFRRuntimeCoverageLabels(def = {}, spec = {}) {
  const labels = [];
  if (def?.type === "damage") labels.push("native damage");
  if (def?.type === "heal") labels.push("native healing");
  if (def?.type === "save") labels.push("native save");
  if (TFRRuntimeWorkCoveredByNativeEffects(spec)) labels.push("native tray");
  if (spec.teleport) labels.push("module teleport");
  if (spec.removeSelf?.length || spec.removeTarget?.length || spec.tempHp) labels.push("module helper");
  if (!labels.length && spec.note) labels.push("manual reminder");
  return labels;
}

function TFRRuntimeCoverageKindFromLabels(labels = []) {
  if (labels.includes("manual reminder")) return "manualReminder";
  if (labels.some(label => label.startsWith("module"))) return "module";
  if (labels.some(label => label.startsWith("native"))) return "native";
  return "manualOnly";
}

async function TFRAuditRuntimeCoverage() {
  const relics = await TFRLoadRelics();
  const rows = [];
  const issues = [];
  let native = 0;
  let module = 0;
  let manualReminder = 0;
  let manualOnly = 0;

  for (let index = 0; index < relics.length; index++) {
    const relic = relics[index];
    const item = TFRBuildItem(relic, "exalted", index + 1, true);
    const activities = item?.system?.activities || {};

    for (const slot of TFR_ACTIVITY_SLOTS) {
      const def = TFRGetAbilityDefinition(relic, slot);
      const activity = activities[slot];
      const automation = TFRAbilityAutomation(relic.id, slot);
      const spec = TFRRelicAbilityRuntimeSpec(relic.id, slot);
      const labels = TFRRuntimeCoverageLabels(def, spec);
      const coverageKind = TFRRuntimeCoverageKindFromLabels(labels);
      const expectedType = def?.type === "heal" ? "heal" : def?.type || "";
      const actualType = activity?.type || "";
      const expectedActivation = def?.activation || "";
      const actualActivation = activity?.activation?.type || "";
      const expectedTarget = def?.target || "";
      const actualTarget = TFRActivityTargetType(activity);
      const expectedRange = Number(def?.range || 0);
      const actualRange = TFRActivityRangeValue(activity);
      const expectedCharges = Number(def?.charges || 0);
      const actualCharges = TFRActivityChargeCost(activity);
      const expectedSave = def?.save || "";
      const actualSave = activity?.save?.ability || "";
      const expectedDamage = TFRDefinitionDamageSpec(def);
      const actualDamage = TFRActivityDamageSpec(activity);
      const expectedHealing = TFRDefinitionHealingSpec(def);
      const actualHealing = TFRActivityHealingSpec(activity);
      const rowIssues = [];

      if (!def) rowIssues.push("missing definition");
      if (!activity) rowIssues.push("missing generated activity");
      if (def && activity) {
        if (actualType !== expectedType) rowIssues.push(`type ${actualType || "blank"} != ${expectedType}`);
        if (actualActivation !== expectedActivation) rowIssues.push(`activation ${actualActivation || "blank"} != ${expectedActivation}`);
        if (actualTarget !== expectedTarget) rowIssues.push(`target ${actualTarget || "blank"} != ${expectedTarget}`);
        if (actualRange !== expectedRange) rowIssues.push(`range ${actualRange} != ${expectedRange}`);
        if (actualCharges !== expectedCharges) rowIssues.push(`charges ${actualCharges} != ${expectedCharges}`);
        if (expectedSave && actualSave !== expectedSave) rowIssues.push(`save ${actualSave || "blank"} != ${expectedSave}`);
        if (expectedDamage && actualDamage !== expectedDamage) rowIssues.push(`damage ${actualDamage || "blank"} != ${expectedDamage}`);
        if (expectedHealing && actualHealing !== expectedHealing) rowIssues.push(`healing ${actualHealing || "blank"} != ${expectedHealing}`);
      }
      if (def && automation) {
        if (automation.type !== def.type) rowIssues.push(`automation type ${automation.type || "blank"} != ${def.type}`);
        if (automation.activation !== expectedActivation) rowIssues.push(`automation activation ${automation.activation || "blank"} != ${expectedActivation}`);
        if (automation.target !== expectedTarget) rowIssues.push(`automation target ${automation.target || "blank"} != ${expectedTarget}`);
        if (Number(automation.range || 0) !== expectedRange) rowIssues.push(`automation range ${Number(automation.range || 0)} != ${expectedRange}`);
        if (Number(automation.charges || 0) !== expectedCharges) rowIssues.push(`automation charges ${Number(automation.charges || 0)} != ${expectedCharges}`);
      }
      if (coverageKind === "manualOnly") rowIssues.push("no native/module/manual runtime coverage label");

      const row = {
        relic: relic.name,
        slot,
        ability: def?.name || "",
        stage: TFRRequiredStageForSlot(slot),
        definitionType: def?.type || "",
        activityType: actualType,
        activation: `${actualActivation || "blank"} / ${expectedActivation || "blank"}`,
        target: `${actualTarget || "blank"} / ${expectedTarget || "blank"}`,
        range: `${actualRange} / ${expectedRange}`,
        charges: `${actualCharges} / ${expectedCharges}`,
        save: expectedSave ? `${actualSave || "blank"} / ${expectedSave}` : "",
        damage: expectedDamage ? `${actualDamage || "blank"} / ${expectedDamage}` : "",
        healing: expectedHealing ? `${actualHealing || "blank"} / ${expectedHealing}` : "",
        coverageKind,
        runtimeCoverage: labels.length ? labels.join(" + ") : "manual/metadata",
        runtimeNote: spec.note || "",
        ok: rowIssues.length === 0,
        issues: rowIssues.join("; ")
      };

      if (coverageKind === "native") native++;
      else if (coverageKind === "module") module++;
      else if (coverageKind === "manualReminder") manualReminder++;
      else manualOnly++;

      if (rowIssues.length) issues.push({ relic: relic.name, slot, ability: def?.name || "", issues: rowIssues.join("; ") });
      rows.push(row);
    }
  }

  const summary = {
    relics: relics.length,
    activities: rows.length,
    native,
    module,
    manualReminder,
    manualOnly,
    issues: issues.length,
    status: issues.length ? "NEEDS ATTENTION" : "RUNTIME COVERAGE READY"
  };

  console.log("========== THE FIRST RELICS RUNTIME COVERAGE AUDIT ==========");
  console.table(rows);
  console.table([summary]);
  if (issues.length) console.table(issues);
  if (issues.length) TFRNotifyWarn(TFRT("The First Relics Runtime Coverage Audit: {issuesCount} issue(s). Check console.", { issuesCount: issues.length }));
  else TFRNotifyInfo(TFRT("The First Relics Runtime Coverage Audit passed: {rowsCount} activities checked.", { rowsCount: rows.length }));
  return { summary, rows, issues };
}


async function TFRResetRelicWorldState(value = 0, stage = "dormant", signatureUnlocked = false) {
  const relics = await TFRLoadRelics();
  const state = {};
  for (const relic of relics) {
    state[relic.id] = {
      value,
      mood: TFRMoodFromAffinity(value),
      stage,
      signatureUnlocked,
      questCompleted: false,
      notes: "",
      timeline: [],
      requirements: {},
      dreamsSent: {},
      memoriesUnlocked: {}
    };
  }
  await game.settings.set("the-first-relics", "relicState", state);
  return state;
}


async function TFRResetTestLabSafe() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics Test Lab: GM only."));
  await TFR_STARTUP_SYNC;

  await TFRDeleteTestLab();
  await TFRResetRelicWorldState(0, "dormant", false);

  const relics = await TFRLoadRelics();
  const folder = await TFRGetOrCreateTestFolder("Actor");
  const rows = [];

  // Ensure base world relic items exist.
  const missing = relics.filter(r => !game.items.find(i => i.getFlag("the-first-relics", "relicId") === r.id || i.name === r.name));
  if (missing.length) await TFRCreateAll();

  for (const relic of relics) {
    const actor = await TFRCreateTestActor(relic, folder);
    const oldItems = actor.items.filter(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name);
    if (oldItems.length) await actor.deleteEmbeddedDocuments("Item", oldItems.map(i => i.id));

    let worldItem = game.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name);
    if (!worldItem) {
      ui.notifications.warn(TFRT("The First Relics Test Lab: missing world item for {relicName}.", { relicName: relic.name }));
      continue;
    }

    // Force the source world item to dormant first where the module supports it.
    try {
      await worldItem.setFlag("the-first-relics", "signatureUnlocked", false);
      await TFRUpdateRelicItem(worldItem, "dormant");
    } catch (err) {
      console.warn("The First Relics Test Lab reset: source item dormant sync fallback", err);
    }

    const itemData = worldItem.toObject();
    delete itemData._id;
    itemData.flags = itemData.flags || {};
    itemData.flags["the-first-relics"] = {
      ...(itemData.flags["the-first-relics"] || {}),
      relicId: relic.id,
      stage: "dormant",
      nativeWorkflow: true,
      signatureUnlocked: false,
      testLab: true
    };

    const [item] = await actor.createEmbeddedDocuments("Item", [itemData], { render: false, renderSheet: false });
    try {
      await item.setFlag("the-first-relics", "stage", "dormant");
      await item.setFlag("the-first-relics", "signatureUnlocked", false);
      await TFRUpdateRelicItem(item, "dormant");
    } catch (err) {
      console.warn("The First Relics Test Lab reset: actor item dormant sync fallback", err);
    }

    rows.push({
      actor: actor.name,
      relic: relic.name,
      item: item?.name || "",
      stage: item?.getFlag("the-first-relics", "stage") || "dormant",
      affinity: 0,
      signature: !!item?.getFlag("the-first-relics", "signatureUnlocked"),
      activities: TFRActivityCount(item)
    });
  }

  await TFRResetRelicWorldState(0, "dormant", false);

  console.table(rows);
  ui.notifications.info(TFRT("The First Relics Test Lab reset to dormant / 0 affinity."));
  return rows;
}


async function TFRCreatePlaytestLabSafe() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics Test Lab: GM only."));
  await TFR_STARTUP_SYNC;
  const labFolderIds = game.folders
    .filter(folder => folder.type === "Actor" && folder.name === TFR_TEST_LAB_FOLDER)
    .map(folder => folder.id);
  const hasExistingLab = game.actors.some(actor =>
    actor.getFlag("the-first-relics", "testLab") || labFolderIds.includes(actor.folder?.id)
  );

  // Capture the real campaign state before the lab changes affinity/stage values.
  // A repeated Create while a lab is active must keep its original pre-lab backup;
  // otherwise refresh the snapshot so an abandoned old backup cannot restore stale data.
  if (!hasExistingLab || !TFRGetTestLabBackupState()) {
    await TFRBackupWorldStateForTestLab(true);
  }
  await TFRDeleteTestLab();
  await TFRResetRelicWorldState(1000, "exalted", true);
  const rows = await TFRCreateTestLab({ stage: "exalted", affinity: 1000, preserveBackup: true });
  ui.notifications.info(TFRT("The First Relics Playtest Lab created at exalted / 1000 affinity."));
  return rows;
}


async function TFRRestoreAfterTestLabSafe() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics Test Lab: GM only."));
  return TFRRestoreAfterTestLab();
}


async function TFRDestroyTestLabSafe() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics Test Lab: GM only."));
  await TFRDeleteTestLab();
  ui.notifications.info(TFRT("The First Relics Test Lab destroyed. Relic world state unchanged."));
  return true;
}




function TFRGetActivitiesArray(item) {
  if (!item?.system?.activities) return [];
  const acts = item.system.activities;
  if (acts instanceof Map) return Array.from(acts.values());
  if (typeof acts.contents !== "undefined") return acts.contents;
  if (Array.isArray(acts)) return acts;
  return Object.values(acts);
}

function TFRActivitySummary(activity) {
  const src = activity?.toObject ? activity.toObject() : activity;
  const data = src || {};
  const activation = data.activation?.type || data.activation || "";
  const targetType = data.target?.affects?.type || data.target?.type || "";
  const targetValue = data.target?.affects?.count || data.target?.value || "";
  const rangeValue = data.range?.value ?? "";
  const rangeUnits = data.range?.units || "";
  const uses = data.consumption?.targets?.length
    ? data.consumption.targets.map(t => `${t.value || 0} ${t.type || ""}`).join(", ")
    : data.uses?.spent !== undefined
      ? `${data.uses.spent}/${data.uses.max ?? ""}`
      : "";
  const saveAbility = data.save?.ability?.join?.(", ") || data.save?.ability || "";
  const damageParts = data.damage?.parts || "";
  const healing = data.healing || "";

  return {
    name: data.name || activity?.name || "",
    type: data.type || activity?.type || "",
    activation,
    target: `${targetValue || ""} ${targetType || ""}`.trim(),
    range: rangeUnits === "self" ? "self" : `${rangeValue || ""} ${rangeUnits || ""}`.trim(),
    save: saveAbility,
    damage: Array.isArray(damageParts) ? damageParts.map(p => `${p.number}d${p.denomination} ${(p.types || []).join("/")}`).join(", ") : "",
    healing: healing?.number ? `${healing.number}d${healing.denomination}` : "",
    uses
  };
}


async function TFRAuditActivitiesDetailed() {
  const relics = await TFRLoadRelics();
  const rows = [];
  const summaryRows = [];
  let totalExpected = 0;
  let totalActual = 0;

  for (const relic of relics) {
    const actor = game.actors.getName(`TFR Test — ${relic.name}`);
    const item = actor?.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name)
      || game.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name);

    const activities = TFRGetActivitiesArray(item);
    if (!item) {
      rows.push({ relic: relic.name, issue: "MISSING ITEM" });
      summaryRows.push({ relic: relic.name, item: "", source: "", stage: "", signature: false, expectedActivities: 0, actualActivities: 0, activityOK: false, issue: "MISSING ITEM" });
      continue;
    }

    const stage = TFRRelicItemStage(item);
    const signature = TFRRelicItemSignatureUnlocked(item);
    const expectedActivities = TFRUnlockedActivitySlots(stage, signature).length;
    const actualActivities = activities.length;
    totalExpected += expectedActivities;
    totalActual += actualActivities;

    summaryRows.push({
      relic: relic.name,
      item: item.name,
      source: actor ? "test actor" : "world item",
      stage,
      signature,
      expectedActivities,
      actualActivities,
      activityOK: actualActivities === expectedActivities,
      issue: actualActivities === expectedActivities ? "" : "ACTIVITY COUNT MISMATCH"
    });

    if (!activities.length) {
      rows.push({ relic: relic.name, item: item.name, stage, signature, issue: "NO ACTIVITIES" });
      continue;
    }

    for (const activity of activities) {
      const summary = TFRActivitySummary(activity);
      rows.push({
        relic: relic.name,
        item: item.name,
        stage,
        signature,
        ...summary,
        issue: summary.name && summary.type ? "" : "INCOMPLETE"
      });
    }
  }

  console.log("========== THE FIRST RELICS ACTIVITY COVERAGE ==========");
  console.table(summaryRows);
  console.table(rows);
  const coverage = {
    relics: relics.length,
    currentActivities: `${totalActual}/${totalExpected}`,
    fullBuildReference: `${relics.length * TFR_ACTIVITY_SLOTS.length}/${relics.length * TFR_ACTIVITY_SLOTS.length}`,
    note: "Detailed Activity Audit reads current world/test items. Use 12 Relic QA Matrix for full exalted/signature build coverage."
  };
  console.table([coverage]);
  const issues = rows.filter(r => r.issue).concat(summaryRows.filter(r => r.issue));
  if (issues.length) ui.notifications.warn(TFRT("The First Relics Activity Audit: {issuesCount} issue(s). Check console.", { issuesCount: issues.length }));
  else ui.notifications.info(TFRT("The First Relics Activity Audit passed: {totalActual}/{totalExpected} current item activities checked.", { totalActual: totalActual, totalExpected: totalExpected }));
  return { coverage, summaryRows, rows, issues };
}

async function TFRInspectRelicActivities(relicIdOrName) {
  const relics = await TFRLoadRelics();
  const query = String(relicIdOrName || "").toLowerCase();
  const relic = relics.find(r => r.id.toLowerCase() === query || r.name.toLowerCase() === query || r.name.toLowerCase().includes(query));

  if (!relic) {
    ui.notifications.warn(TFRT("The First Relics: relic not found for \"{relicIdOrName}\".", { relicIdOrName: relicIdOrName }));
    return [];
  }

  const actor = game.actors.getName(`TFR Test — ${relic.name}`);
  const item = actor?.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name)
    || game.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name);

  if (!item) {
    ui.notifications.warn(TFRT("The First Relics: item not found for {relicName}.", { relicName: relic.name }));
    return [];
  }

  const rows = TFRGetActivitiesArray(item).map(activity => ({
    relic: relic.name,
    item: item.name,
    ...TFRActivitySummary(activity)
  }));

  console.table(rows);
  ui.notifications.info(TFRT("The First Relics: inspected {rowsCount} activities for {relicName}.", { rowsCount: rows.length, relicName: relic.name }));
  return rows;
}


