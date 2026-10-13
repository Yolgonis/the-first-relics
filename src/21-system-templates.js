async function TFRFindSystemItemTemplate(name) {
  const wanted = String(name || "").toLowerCase();

  const worldItem = game.items.find(i => i.name?.toLowerCase() === wanted);
  if (worldItem) return worldItem;

  const packs = game.packs.filter(p => p.documentName === "Item");
  for (const pack of packs) {
    try {
      const index = await pack.getIndex({ fields: ["name", "type"] });
      const hit = index.find(e => e.name?.toLowerCase() === wanted);
      if (!hit) continue;
      const doc = await pack.getDocument(hit._id);
      if (doc) return doc;
    } catch (err) {
      console.warn(`The First Relics: could not search pack ${pack.collection}`, err);
    }
  }

  return null;
}

function TFRGetFirstTemplateActivityData(item) {
  const activities = TFRGetActivitiesArray(item);
  const activity = activities[0];
  if (!activity) return null;
  const data = activity.toObject ? activity.toObject() : foundry.utils.deepClone(activity);
  delete data._id;
  return data;
}

function TFRRelicActivityDescription(relic, slot) {
  if (typeof TFRActivityDescription === "function") return TFRActivityDescription(relic, slot);
  return "";
}

function TFRCloneTemplateActivity(templateActivity, relic, slot, def) {
  const activity = foundry.utils.deepClone(templateActivity);
  const oldDescription = TFRRelicActivityDescription(relic, slot);

  delete activity._id;
  activity.name = def.name || activity.name;
  activity.description = activity.description || {};
  activity.description.value = oldDescription || activity.description.value || "";
  activity.description.chatFlavor = activity.description.chatFlavor || "";

  activity.activation = {
    ...(activity.activation || {}),
    type: def.activation || activity.activation?.type || "action",
    value: null,
    condition: ""
  };

  activity.duration = {
    ...(activity.duration || {}),
    units: "inst",
    value: null
  };

  if (def.range) {
    activity.range = {
      ...(activity.range || {}),
      value: String(def.range),
      units: "ft",
      override: true
    };
  }

  activity.target = {
    ...(activity.target || {}),
    template: {
      ...(activity.target?.template || {}),
      contiguous: false,
      stationary: false,
      units: "ft"
    },
    affects: {
      ...(activity.target?.affects || {}),
      type: def.target === "space" ? "space" : def.target === "self" ? "self" : "creature",
      count: "1",
      choice: false
    },
    override: true,
    prompt: true
  };

  // Replace spell slot consumption with relic charge consumption.
  activity.consumption = {
    targets: def.charges ? [{
      type: "itemUses",
      value: String(def.charges),
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
    relicId: relic.id,
    slot,
    systemTemplate: true,
    systemTemplateSource: "Misty Step",
    systemTemplateVersion: "0.18.0",
    templateFamily: "teleport",
    teleport: true,
    teleportRange: def.range || 30
  };

  return activity;
}

async function TFRApplyMistyStepTemplateToRelicItem(item) {
  if (!item) return { ok: false, issue: "missing item" };

  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === "cloak_feywilds");
  const def = TFRGetAbilityDefinition(relic, "active1");

  const misty = await TFRFindSystemItemTemplate("Misty Step");
  if (!misty) {
    return { ok: false, item: item.name, issue: "Misty Step template not found in world items or item compendiums" };
  }

  const templateActivity = TFRGetFirstTemplateActivityData(misty);
  if (!templateActivity) {
    return { ok: false, item: item.name, issue: "Misty Step has no activity to clone" };
  }

  const cloned = TFRCloneTemplateActivity(templateActivity, relic, "active1", def);

  await item.update({
    "system.activities.active1": cloned
  });

  return {
    ok: true,
    item: item.name,
    relic: relic.name,
    slot: "active1",
    ability: "Fey Step",
    template: misty.name,
    range: "60 ft",
    consumption: "1 itemUses"
  };
}

async function TFRApplySystemTemplates() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));

  const targets = [];

  for (const item of game.items) {
    if (TFRIsCloakItem(item)) {
      targets.push(item);
    }
  }

  for (const actor of game.actors) {
    for (const item of actor.items) {
      if (TFRIsCloakItem(item)) {
        targets.push(item);
      }
    }
  }

  const rows = [];
  for (const item of targets) {
    try {
      rows.push(await TFRApplyMistyStepTemplateToRelicItem(item));
    } catch (err) {
      console.error("The First Relics: failed to apply system template", item, err);
      rows.push({ ok: false, item: item?.name || "", issue: err.message || String(err) });
    }
  }

  console.table(rows);
  const failed = rows.filter(r => !r.ok);
  if (failed.length) ui.notifications.warn(TFRT("The First Relics System Templates: {failedCount} issue(s). Check console.", { failedCount: failed.length }));
  else ui.notifications.info(TFRT("The First Relics System Templates applied to {rowsCount} item(s).", { rowsCount: rows.length }));
  return rows;
}

async function TFRAuditSystemTemplates() {
  const rows = [];

  for (const actor of game.actors) {
    for (const item of actor.items) {
      if (!TFRIsCloakItem(item)) continue;
      const activity = TFRGetActivitiesArray(item).find(a => {
        const data = a.toObject ? a.toObject() : a;
        return data.flags?.["the-first-relics"]?.slot === "active1" || data.name === "Fey Step";
      });
      const data = activity?.toObject ? activity.toObject() : activity;
      rows.push({
        actor: actor.name,
        item: item.name,
        activity: data?.name || "",
        systemTemplate: !!data?.flags?.["the-first-relics"]?.systemTemplate,
        source: data?.flags?.["the-first-relics"]?.systemTemplateSource || "",
        range: `${data?.range?.value || ""} ${data?.range?.units || ""}`.trim(),
        target: data?.target?.affects?.type || "",
        consumption: data?.consumption?.targets?.map(t => `${t.value} ${t.type}`).join(", ") || ""
      });
    }
  }

  console.table(rows);
  return rows;
}



