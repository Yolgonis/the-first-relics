const TFR_FEATURE_ITEM_FOLDER = "The First Relics — Feature Items";

async function TFRGetOrCreateFeatureItemFolder(type = "Item") {
  let folder = game.folders.find(f => f.type === type && f.name === TFR_FEATURE_ITEM_FOLDER);
  if (!folder) folder = await Folder.create({ name: TFR_FEATURE_ITEM_FOLDER, type });
  return folder;
}

async function TFRFindSystemItemTemplateByName(name) {
  const wanted = String(name || "").toLowerCase();

  const worldItem = game.items.find(i => i.name?.toLowerCase() === wanted);
  if (worldItem) return worldItem;

  const packs = game.packs.filter(p => p.documentName === "Item");
  for (const pack of packs) {
    try {
      const index = await pack.getIndex({ fields: ["name", "type"] });
      const hit = index.find(e => e.name?.toLowerCase() === wanted);
      if (!hit) continue;
      return await pack.getDocument(hit._id);
    } catch (err) {
      console.warn(`The First Relics: could not search pack ${pack.collection}`, err);
    }
  }

  return null;
}

function TFRPrepareFeatureItemData(templateItem, {
  name,
  img,
  description,
  relicId,
  slot,
  sourceTemplate,
  charges = 0,
  range = null,
  activation = null,
  targetType = null
} = {}) {
  const data = templateItem.toObject ? templateItem.toObject() : foundry.utils.deepClone(templateItem);
  delete data._id;
  data.name = name || data.name;
  if (img) data.img = img;

  data.flags = data.flags || {};
  data.flags["the-first-relics"] = {
    ...(data.flags["the-first-relics"] || {}),
    relicFeatureItem: true,
    relicId,
    slot,
    sourceTemplate,
    architecture: "item-template",
    architectureVersion: "0.19.0"
  };

  data.system = data.system || {};
  data.system.description = data.system.description || {};
  data.system.description.value = description || data.system.description.value || "";
  data.system.source = "The First Relics";

  // Do not consume spell slots on relic feature items.
  if (data.system.preparation) {
    data.system.preparation.mode = "atwill";
    data.system.preparation.prepared = true;
  }

  if (data.system.level !== undefined) data.system.level = 0;
  if (data.system.method !== undefined) data.system.method = "atwill";

  // Relic feature items use item charges where possible.
  data.system.uses = data.system.uses || {};
  data.system.uses.spent = 0;
  data.system.uses.max = data.system.uses.max || "";
  data.system.uses.recovery = data.system.uses.recovery || [];

  if (data.system.activities) {
    const activities = data.system.activities;
    for (const [key, activity] of Object.entries(activities)) {
      activity.name = name || activity.name;
      activity.description = activity.description || {};
      activity.description.value = description || activity.description.value || "";
      activity.activation = activity.activation || {};
      if (activation) activity.activation.type = activation;

      if (range !== null) {
        activity.range = activity.range || {};
        activity.range.value = String(range);
        activity.range.units = "ft";
        activity.range.override = true;
      }

      if (targetType) {
        activity.target = activity.target || {};
        activity.target.affects = activity.target.affects || {};
        activity.target.affects.type = targetType;
        activity.target.affects.count = "1";
        activity.target.override = true;
        activity.target.prompt = true;
      }

      activity.consumption = activity.consumption || {};
      activity.consumption.targets = charges ? [{
        type: "itemUses",
        value: String(charges),
        target: ""
      }] : [];
      activity.consumption.scaling = { allowed: false };

      activity.uses = activity.uses || {};
      activity.uses.spent = 0;
      activity.uses.max = "";
      activity.uses.recovery = [];

      activity.flags = activity.flags || {};
      activity.flags["the-first-relics"] = {
        ...(activity.flags["the-first-relics"] || {}),
        relicFeatureItem: true,
        relicId,
        slot,
        sourceTemplate,
        architecture: "item-template"
      };
    }
  }

  return data;
}

async function TFRCreateFeyStepFeatureItemForActor(actor) {
  if (!actor) return { ok: false, issue: "missing actor" };

  const cloak = actor.items.find(TFRIsCloakItem);
  if (!cloak) return { ok: false, actor: actor.name, issue: `actor does not have ${TFR_CLOAK_DISPLAY_NAME}` };

  const existing = actor.items.find(i =>
    i.getFlag("the-first-relics", "relicFeatureItem") &&
    i.getFlag("the-first-relics", "relicId") === "cloak_feywilds" &&
    i.getFlag("the-first-relics", "slot") === "active1"
  );
  if (existing) await existing.delete();

  const template = await TFRFindSystemItemTemplateByName("Misty Step");
  if (!template) return { ok: false, actor: actor.name, issue: "Misty Step template not found" };

  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === "cloak_feywilds");
  const def = TFRGetAbilityDefinition(relic, "active1");

  const description = typeof TFRActivityDescription === "function"
    ? TFRActivityDescription(relic, "active1")
    : "<p>Briefly surrounded by fey mist, you teleport to an unoccupied space you can see.</p>";

  const data = TFRPrepareFeatureItemData(template, {
    name: "Fey Step",
    img: cloak.img,
    description,
    relicId: "cloak_feywilds",
    slot: "active1",
    sourceTemplate: "Misty Step",
    charges: def?.charges ?? 1,
    range: def?.range ?? 60,
    activation: "bonus",
    targetType: "space"
  });

  const [created] = await actor.createEmbeddedDocuments("Item", [data], { render: false, renderSheet: false });

  return {
    ok: true,
    actor: actor.name,
    relic: TFR_CLOAK_DISPLAY_NAME,
    featureItem: created?.name || "Fey Step",
    sourceTemplate: "Misty Step",
    range: "60 ft",
    charges: "1 itemUses"
  };
}

async function TFRCreateFeatureItems() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));

  const actors = game.actors.filter(a => a.items.some(TFRIsCloakItem));
  const rows = [];

  for (const actor of actors) {
    try {
      rows.push(await TFRCreateFeyStepFeatureItemForActor(actor));
    } catch (err) {
      console.error("The First Relics: feature item creation failed", actor, err);
      rows.push({ ok: false, actor: actor.name, issue: err.message || String(err) });
    }
  }

  console.table(rows);
  const failed = rows.filter(r => !r.ok);
  if (failed.length) ui.notifications.warn(TFRT("The First Relics Feature Items: {failedCount} issue(s). Check console.", { failedCount: failed.length }));
  else ui.notifications.info(TFRT("The First Relics Feature Items created for {rowsCount} actor(s).", { rowsCount: rows.length }));
  return rows;
}

async function TFRAuditFeatureItems() {
  const rows = [];

  for (const actor of game.actors) {
    const cloak = actor.items.find(TFRIsCloakItem);
    if (!cloak) continue;

    const feature = actor.items.find(i =>
      i.getFlag("the-first-relics", "relicFeatureItem") &&
      i.getFlag("the-first-relics", "relicId") === "cloak_feywilds" &&
      i.getFlag("the-first-relics", "slot") === "active1"
    );

    const activities = feature ? TFRGetActivitiesArray(feature) : [];
    const activity = activities[0];
    const data = activity?.toObject ? activity.toObject() : activity;

    rows.push({
      actor: actor.name,
      relic: cloak.name,
      featureItem: feature?.name || "",
      hasFeatureItem: !!feature,
      sourceTemplate: feature?.getFlag("the-first-relics", "sourceTemplate") || "",
      activity: data?.name || "",
      activation: data?.activation?.type || "",
      range: `${data?.range?.value || ""} ${data?.range?.units || ""}`.trim(),
      target: data?.target?.affects?.type || "",
      consumption: data?.consumption?.targets?.map(t => `${t.value} ${t.type}`).join(", ") || ""
    });
  }

  console.table(rows);
  const failed = rows.filter(r => !r.hasFeatureItem);
  if (failed.length) ui.notifications.warn(TFRT("The First Relics Feature Item Audit: {failedCount} missing feature item(s).", { failedCount: failed.length }));
  else ui.notifications.info(TFRT("The First Relics Feature Item Audit passed."));
  return rows;
}



const TFR_RESOLVED_TEMPLATE_FLAG = "resolvedTemplateItem";

function TFRFeatureTemplateDefinitions() {
  return {
    cloak_feywilds: {
      active1: {
        templateName: "Misty Step",
        displayName: "Fey Step",
        sourceName: "Misty Step",
        charges: 1,
        range: 60,
        activation: "bonus",
        targetType: "space",
        keepAnimationName: true
      }
    }
  };
}

async function TFRResolveTemplate(templateName) {
  const template = await TFRFindSystemItemTemplateByName(templateName);
  if (!template) {
    ui.notifications.warn(TFRT("The First Relics: template not found: {templateName}", { templateName: templateName }));
    return null;
  }

  const data = template.toObject ? template.toObject() : foundry.utils.deepClone(template);
  return {
    ok: true,
    name: template.name,
    type: template.type,
    img: template.img,
    item: template,
    data,
    pack: template.pack || "",
    uuid: template.uuid || ""
  };
}

function TFRPrepareResolvedTemplateItemData(templateResult, {
  relicId,
  slot,
  displayName,
  sourceName,
  description,
  charges = 0,
  range = null,
  activation = null,
  targetType = null,
  keepAnimationName = true
} = {}) {
  const data = foundry.utils.deepClone(templateResult.data);
  delete data._id;

  // Keep source identity available for AA/Midi/Sequencer matching.
  data.name = displayName || data.name;
  data.img = data.img || templateResult.img;

  data.flags = data.flags || {};
  data.flags["the-first-relics"] = {
    ...(data.flags["the-first-relics"] || {}),
    [TFR_RESOLVED_TEMPLATE_FLAG]: true,
    relicId,
    slot,
    displayName,
    sourceName: sourceName || templateResult.name,
    templateName: templateResult.name,
    templateUuid: templateResult.uuid || "",
    architecture: "template-resolver",
    architectureVersion: "0.20.0",
    keepAnimationName
  };

  // Some automation modules inspect these generic flags/names.
  data.flags["midi-qol"] = data.flags["midi-qol"] || {};
  data.flags["autoanimations"] = data.flags["autoanimations"] || {};
  data.flags["autoanimations"].sourceName = sourceName || templateResult.name;

  data.system = data.system || {};
  data.system.source = "The First Relics";
  data.system.description = data.system.description || {};
  data.system.description.value = description || data.system.description.value || "";

  // Make it look like a special/at-will feature rather than a spell slot consumer where possible.
  if (data.system.preparation) {
    data.system.preparation.mode = "atwill";
    data.system.preparation.prepared = true;
  }
  if (data.system.level !== undefined) data.system.level = 0;
  if (data.system.method !== undefined) data.system.method = "atwill";

  data.system.uses = data.system.uses || {};
  data.system.uses.spent = 0;
  data.system.uses.max = data.system.uses.max || "";
  data.system.uses.recovery = data.system.uses.recovery || [];

  if (data.system.activities) {
    for (const [key, activity] of Object.entries(data.system.activities)) {
      activity.name = keepAnimationName ? (sourceName || templateResult.name) : (displayName || activity.name);
      activity.description = activity.description || {};
      activity.description.value = description || activity.description.value || "";

      activity.activation = activity.activation || {};
      if (activation) activity.activation.type = activation;

      if (range !== null) {
        activity.range = activity.range || {};
        activity.range.value = String(range);
        activity.range.units = "ft";
        activity.range.override = true;
      }

      if (targetType) {
        activity.target = activity.target || {};
        activity.target.affects = activity.target.affects || {};
        activity.target.affects.type = targetType;
        activity.target.affects.count = "1";
        activity.target.override = true;
        activity.target.prompt = true;
      }

      activity.consumption = {
        targets: charges ? [{
          type: "itemUses",
          value: String(charges),
          target: ""
        }] : [],
        scaling: { allowed: false }
      };

      activity.uses = {
        spent: 0,
        recovery: [],
        max: ""
      };

      activity.flags = activity.flags || {};
      activity.flags["the-first-relics"] = {
        ...(activity.flags["the-first-relics"] || {}),
        [TFR_RESOLVED_TEMPLATE_FLAG]: true,
        relicId,
        slot,
        displayName,
        sourceName: sourceName || templateResult.name,
        templateName: templateResult.name,
        architecture: "template-resolver",
        architectureVersion: "0.20.0"
      };

      activity.flags["autoanimations"] = activity.flags["autoanimations"] || {};
      activity.flags["autoanimations"].sourceName = sourceName || templateResult.name;
    }
  }

  return data;
}

async function TFRCreateResolvedFeyStepForActor(actor) {
  const cloak = actor.items.find(TFRIsCloakItem);
  if (!cloak) return { ok: false, actor: actor.name, issue: `actor does not have ${TFR_CLOAK_DISPLAY_NAME}` };

  const existing = actor.items.filter(i =>
    i.getFlag("the-first-relics", TFR_RESOLVED_TEMPLATE_FLAG) &&
    i.getFlag("the-first-relics", "relicId") === "cloak_feywilds" &&
    i.getFlag("the-first-relics", "slot") === "active1"
  );
  if (existing.length) await actor.deleteEmbeddedDocuments("Item", existing.map(i => i.id));

  const defs = TFRFeatureTemplateDefinitions();
  const def = defs.cloak_feywilds.active1;
  const resolved = await TFRResolveTemplate(def.templateName);
  if (!resolved?.ok) return { ok: false, actor: actor.name, issue: "template resolve failed" };

  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === "cloak_feywilds");
  const description = typeof TFRActivityDescription === "function"
    ? TFRActivityDescription(relic, "active1")
    : "<p>Fey Step.</p>";

  const data = TFRPrepareResolvedTemplateItemData(resolved, {
    relicId: "cloak_feywilds",
    slot: "active1",
    displayName: def.displayName,
    sourceName: def.sourceName,
    description,
    charges: def.charges,
    range: def.range,
    activation: def.activation,
    targetType: def.targetType,
    keepAnimationName: def.keepAnimationName
  });

  // Use relic icon visually, but keep source name in flags/activity for automation matching.
  data.img = cloak.img || data.img;

  const [created] = await actor.createEmbeddedDocuments("Item", [data], { render: false, renderSheet: false });

  return {
    ok: true,
    actor: actor.name,
    created: created?.name || def.displayName,
    visibleName: def.displayName,
    activityName: TFRGetActivitiesArray(created)[0]?.name || "",
    templateName: def.templateName,
    sourceName: def.sourceName,
    range: `${def.range} ft`,
    charges: `${def.charges} itemUses`
  };
}

async function TFRCreateResolvedTemplateItems() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));

  const actors = game.actors.filter(a =>
    a.items.some(TFRIsCloakItem)
  );

  const rows = [];
  for (const actor of actors) {
    try {
      rows.push(await TFRCreateResolvedFeyStepForActor(actor));
    } catch (err) {
      console.error("The First Relics: create resolved template item failed", actor, err);
      rows.push({ ok: false, actor: actor.name, issue: err.message || String(err) });
    }
  }

  console.table(rows);
  const failed = rows.filter(r => !r.ok);
  if (failed.length) ui.notifications.warn(TFRT("The First Relics Resolver: {failedCount} issue(s). Check console.", { failedCount: failed.length }));
  else ui.notifications.info(TFRT("The First Relics Resolver created {rowsCount} resolved template item(s).", { rowsCount: rows.length }));
  return rows;
}

async function TFRAuditResolvedTemplateItems() {
  const rows = [];

  for (const actor of game.actors) {
    for (const item of actor.items) {
      if (!item.getFlag("the-first-relics", TFR_RESOLVED_TEMPLATE_FLAG)) continue;
      const activity = TFRGetActivitiesArray(item)[0];
      const data = activity?.toObject ? activity.toObject() : activity;

      rows.push({
        actor: actor.name,
        item: item.name,
        itemSourceName: item.getFlag("the-first-relics", "sourceName") || "",
        activity: data?.name || "",
        activitySourceName: data?.flags?.["the-first-relics"]?.sourceName || "",
        template: item.getFlag("the-first-relics", "templateName") || "",
        range: `${data?.range?.value || ""} ${data?.range?.units || ""}`.trim(),
        target: data?.target?.affects?.type || "",
        consumption: data?.consumption?.targets?.map(t => `${t.value} ${t.type}`).join(", ") || "",
        architecture: item.getFlag("the-first-relics", "architecture") || ""
      });
    }
  }

  console.table(rows);
  if (!rows.length) ui.notifications.warn(TFRT("The First Relics Resolver Audit: no resolved template items found."));
  else ui.notifications.info(TFRT("The First Relics Resolver Audit complete."));
  return rows;
}



const TFR_SPELLBOOK_FEATURE_FLAG = "spellbookFeature";

function TFRSpellbookFeatureDefinitions() {
  return {
    cloak_feywilds: {
      active1: {
        templateName: "Misty Step",
        displayName: "Fey Step",
        animationName: "Misty Step",
        charges: 1,
        range: 60,
        activation: "bonus",
        targetType: "space",
        spellLevel: 2,
        school: "con"
      }
    }
  };
}

function TFRCloneSpellTemplateData(templateResult, {
  relic,
  slot,
  displayName,
  animationName,
  charges = 0,
  range = null,
  activation = null,
  targetType = null,
  spellLevel = null,
  school = null
} = {}) {
  const data = foundry.utils.deepClone(templateResult.data);
  delete data._id;

  data.name = displayName || data.name;
  data.type = "spell";

  data.flags = data.flags || {};
  data.flags["the-first-relics"] = {
    ...(data.flags["the-first-relics"] || {}),
    [TFR_SPELLBOOK_FEATURE_FLAG]: true,
    relicId: relic.id,
    slot,
    displayName,
    animationName: animationName || templateResult.name,
    templateName: templateResult.name,
    templateUuid: templateResult.uuid || "",
    architecture: "spellbook-feature",
    architectureVersion: "0.21.0"
  };

  // Hints for animation modules that match by original spell name.
  data.flags["autoanimations"] = data.flags["autoanimations"] || {};
  data.flags["autoanimations"].sourceName = animationName || templateResult.name;
  data.flags["midi-qol"] = data.flags["midi-qol"] || {};
  if (relic?.id === "cloak_feywilds" && slot === "active1") TFRMarkFeyStepExternalAnimationsDisabled(data);

  data.system = data.system || {};
  data.system.source = "The First Relics";
  data.system.description = data.system.description || {};
  data.system.description.value = typeof TFRActivityDescription === "function"
    ? TFRActivityDescription(relic, slot)
    : data.system.description.value;

  // Keep it as a real spell, but make it at-will/prepared so it does not consume spell slots.
  data.system.level = spellLevel ?? data.system.level ?? 2;
  data.system.school = school || data.system.school || "con";

  data.system.preparation = data.system.preparation || {};
  data.system.preparation.mode = "atwill";
  data.system.preparation.prepared = true;

  data.system.method = data.system.method || "atwill";

  data.system.uses = data.system.uses || {};
  data.system.uses.spent = 0;
  data.system.uses.max = data.system.uses.max || "";
  data.system.uses.recovery = data.system.uses.recovery || [];

  if (data.system.activities) {
    for (const [key, activity] of Object.entries(data.system.activities)) {
      // Visible activity name can remain Fey Step, but original name is kept in flags.
      activity.name = displayName || activity.name;

      activity.description = activity.description || {};
      activity.description.value = data.system.description.value || activity.description.value || "";

      activity.activation = activity.activation || {};
      if (activation) activity.activation.type = activation;

      if (range !== null) {
        activity.range = activity.range || {};
        activity.range.value = String(range);
        activity.range.units = "ft";
        activity.range.override = true;
      }

      if (targetType) {
        activity.target = activity.target || {};
        activity.target.affects = activity.target.affects || {};
        activity.target.affects.type = targetType;
        activity.target.affects.count = "1";
        activity.target.override = true;
        activity.target.prompt = true;
      }

      // Keep spell item workflow, but remove spell slot consumption.
      activity.consumption = {
        targets: charges ? [{
          type: "itemUses",
          value: String(charges),
          target: ""
        }] : [],
        scaling: { allowed: false }
      };

      activity.uses = {
        spent: 0,
        recovery: [],
        max: ""
      };

      activity.flags = activity.flags || {};
      activity.flags["the-first-relics"] = {
        ...(activity.flags["the-first-relics"] || {}),
        [TFR_SPELLBOOK_FEATURE_FLAG]: true,
        relicId: relic.id,
        slot,
        displayName,
        animationName: animationName || templateResult.name,
        templateName: templateResult.name,
        architecture: "spellbook-feature"
      };

      activity.flags["autoanimations"] = activity.flags["autoanimations"] || {};
      activity.flags["autoanimations"].sourceName = animationName || templateResult.name;
      if (relic?.id === "cloak_feywilds" && slot === "active1") TFRMarkFeyStepExternalAnimationsDisabled(activity);
    }
  }

  return data;
}

async function TFRCreateSpellbookFeyStepForActor(actor) {
  const cloak = actor.items.find(TFRIsCloakItem);
  if (!cloak) return { ok: false, actor: actor.name, issue: `actor does not have ${TFR_CLOAK_DISPLAY_NAME}` };

  const existing = actor.items.filter(i =>
    i.getFlag("the-first-relics", TFR_SPELLBOOK_FEATURE_FLAG) &&
    i.getFlag("the-first-relics", "relicId") === "cloak_feywilds" &&
    i.getFlag("the-first-relics", "slot") === "active1"
  );
  if (existing.length) await actor.deleteEmbeddedDocuments("Item", existing.map(i => i.id));

  const defs = TFRSpellbookFeatureDefinitions();
  const def = defs.cloak_feywilds.active1;

  const resolved = await TFRResolveTemplate(def.templateName);
  if (!resolved?.ok) return { ok: false, actor: actor.name, issue: "Misty Step template resolve failed" };

  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === "cloak_feywilds");

  const data = TFRCloneSpellTemplateData(resolved, {
    relic,
    slot: "active1",
    displayName: def.displayName,
    animationName: def.animationName,
    charges: def.charges,
    range: def.range,
    activation: def.activation,
    targetType: def.targetType,
    spellLevel: def.spellLevel,
    school: def.school
  });

  data.img = cloak.img || data.img;

  const [created] = await actor.createEmbeddedDocuments("Item", [data], { render: false, renderSheet: false });
  const activity = TFRGetActivitiesArray(created)[0];
  const a = activity?.toObject ? activity.toObject() : activity;

  return {
    ok: true,
    actor: actor.name,
    item: created?.name || "",
    type: created?.type || "",
    template: def.templateName,
    animationName: def.animationName,
    activity: a?.name || "",
    activation: a?.activation?.type || "",
    range: `${a?.range?.value || ""} ${a?.range?.units || ""}`.trim(),
    target: a?.target?.affects?.type || "",
    consumption: a?.consumption?.targets?.map(t => `${t.value} ${t.type}`).join(", ") || "",
    architecture: "spellbook-feature"
  };
}

async function TFRCreateSpellbookFeatures() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));

  const actors = game.actors.filter(a =>
    a.items.some(TFRIsCloakItem)
  );

  const rows = [];
  for (const actor of actors) {
    try {
      rows.push(await TFRCreateSpellbookFeyStepForActor(actor));
    } catch (err) {
      console.error("The First Relics: create spellbook feature failed", actor, err);
      rows.push({ ok: false, actor: actor.name, issue: err.message || String(err) });
    }
  }

  console.table(rows);
  const failed = rows.filter(r => !r.ok);
  if (failed.length) ui.notifications.warn(TFRT("The First Relics Spellbook Features: {failedCount} issue(s). Check console.", { failedCount: failed.length }));
  else ui.notifications.info(TFRT("The First Relics Spellbook Features created for {rowsCount} actor(s).", { rowsCount: rows.length }));
  return rows;
}

async function TFRAuditSpellbookFeatures() {
  const rows = [];

  for (const actor of game.actors) {
    for (const item of actor.items) {
      if (!item.getFlag("the-first-relics", TFR_SPELLBOOK_FEATURE_FLAG)) continue;
      const activity = TFRGetActivitiesArray(item)[0];
      const a = activity?.toObject ? activity.toObject() : activity;

      rows.push({
        actor: actor.name,
        item: item.name,
        type: item.type,
        template: item.getFlag("the-first-relics", "templateName") || "",
        animationName: item.getFlag("the-first-relics", "animationName") || "",
        activity: a?.name || "",
        activation: a?.activation?.type || "",
        range: `${a?.range?.value || ""} ${a?.range?.units || ""}`.trim(),
        target: a?.target?.affects?.type || "",
        consumption: a?.consumption?.targets?.map(t => `${t.value} ${t.type}`).join(", ") || "",
        architecture: item.getFlag("the-first-relics", "architecture") || ""
      });
    }
  }

  console.table(rows);
  if (!rows.length) ui.notifications.warn(TFRT("The First Relics Spellbook Feature Audit: no spellbook features found."));
  else ui.notifications.info(TFRT("The First Relics Spellbook Feature Audit complete."));
  return rows;
}



function TFRIsRelicGeneratedActorItem(item) {
  if (!item) return false;
  const flags = item.flags?.["the-first-relics"] || {};

  return Boolean(
    flags.spellbookFeature ||
    flags.resolvedTemplateItem ||
    flags.relicFeatureItem ||
    flags.architecture === "spellbook-feature" ||
    flags.architecture === "template-resolver" ||
    flags.architecture === "item-template"
  );
}

async function TFRDeleteFeatureItems() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));

  const rows = [];

  for (const actor of game.actors) {
    const items = actor.items.filter(i => TFRIsRelicGeneratedActorItem(i));
    if (!items.length) continue;

    await actor.deleteEmbeddedDocuments("Item", items.map(i => i.id));
    rows.push({
      actor: actor.name,
      deleted: items.length,
      items: items.map(i => i.name).join(", ")
    });
  }

  console.table(rows);
  ui.notifications.info(TFRT("The First Relics: deleted {value} generated feature item(s).", { value: rows.reduce((n, r) => n + r.deleted, 0) }));
  return rows;
}

async function TFRAuditGeneratedFeatureItems() {
  const rows = [];

  for (const actor of game.actors) {
    for (const item of actor.items) {
      if (!TFRIsRelicGeneratedActorItem(item)) continue;
      rows.push({
        actor: actor.name,
        item: item.name,
        type: item.type,
        relicId: item.getFlag("the-first-relics", "relicId") || "",
        slot: item.getFlag("the-first-relics", "slot") || "",
        architecture: item.getFlag("the-first-relics", "architecture") || "",
        spellbookFeature: !!item.getFlag("the-first-relics", "spellbookFeature"),
        resolvedTemplateItem: !!item.getFlag("the-first-relics", "resolvedTemplateItem"),
        relicFeatureItem: !!item.getFlag("the-first-relics", "relicFeatureItem")
      });
    }
  }

  console.table(rows);
  if (!rows.length) ui.notifications.info(TFRT("The First Relics: no generated feature items found."));
  else ui.notifications.warn(TFRT("The First Relics: {rowsCount} generated feature item(s) found.", { rowsCount: rows.length }));
  return rows;
}
























