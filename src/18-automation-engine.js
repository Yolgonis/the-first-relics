import "./17-coverage-audits.js"; // keeps the original load order
import { TFRLoadRelics, TFRT } from "./00-core.js";
import { TFRGetAbilityDefinition } from "./03-activities.js";
import { TFRGetRelicState, TFRSetRelicState } from "./06-relic-state.js";
import { TFRActivitySummary, TFRGetActivitiesArray } from "./17-coverage-audits.js";

function TFRFallbackAbilityAutomation(relicId, slot) {
  const cfg = {
    aegis_dawn: {
      active1: { type: "utility", activation: "bonus", target: "self", range: "self" },
      active2: { type: "utility", activation: "reaction", target: "creature", range: "30 ft" },
      active3: { type: "utility", activation: "action", target: "self", range: "self" },
      active4: { type: "save", activation: "action", target: "creature", range: "30 ft", save: "con" },
      avatar: { type: "utility", activation: "bonus", target: "self", range: "self" },
      signature: { type: "utility", activation: "special", target: "creature", range: "30 ft" }
    },
    crown_conqueror: {
      active1: { type: "damage", activation: "special", target: "creature", range: "5 ft", damage: "3d8 radiant" },
      active2: { type: "save", activation: "bonus", target: "creature", range: "60 ft", save: "wis" },
      active3: { type: "utility", activation: "special", target: "self", range: "self" },
      active4: { type: "utility", activation: "bonus", target: "creature", range: "30 ft" },
      avatar: { type: "utility", activation: "bonus", target: "self", range: "self" },
      signature: { type: "save", activation: "action", target: "creature", range: "60 ft", save: "wis" }
    },
    bands_inner_dragon: {
      active1: { type: "utility", activation: "reaction", target: "creature", range: "5 ft" },
      active2: { type: "utility", activation: "bonus", target: "self", range: "self" },
      active3: { type: "utility", activation: "reaction", target: "self", range: "self" },
      active4: { type: "damage", activation: "special", target: "creature", range: "5 ft", damage: "4 Martial Arts dice force" },
      avatar: { type: "utility", activation: "bonus", target: "self", range: "self" },
      signature: { type: "utility", activation: "special", target: "self", range: "self" }
    },
    cloak_shadowfell: {
      active1: { type: "utility", activation: "bonus", target: "space", range: "30 ft" },
      active2: { type: "utility", activation: "reaction", target: "creature", range: "30 ft" },
      active3: { type: "utility", activation: "reaction", target: "self", range: "self" },
      active4: { type: "damage", activation: "special", target: "creature", range: "5 ft", damage: "8d6 necrotic" },
      avatar: { type: "utility", activation: "bonus", target: "self", range: "self" },
      signature: { type: "damage", activation: "special", target: "creature", range: "60 ft", damage: "10d6 necrotic" }
    },
    heart_yggdrasil: {
      active1: { type: "utility", activation: "action", target: "space", range: "60 ft" },
      active2: { type: "heal", activation: "bonus", target: "creature", range: "30 ft", healing: "4d8" },
      active3: { type: "utility", activation: "action", target: "self", range: "self" },
      active4: { type: "save", activation: "action", target: "creature", range: "60 ft", save: "str" },
      avatar: { type: "utility", activation: "bonus", target: "self", range: "self" },
      signature: { type: "utility", activation: "special", target: "creature", range: "60 ft" }
    },
    vestments_first_saint: {
      active1: { type: "utility", activation: "bonus", target: "creature", range: "30 ft" },
      active2: { type: "utility", activation: "action", target: "creature", range: "30 ft" },
      active3: { type: "utility", activation: "action", target: "self", range: "self" },
      active4: { type: "heal", activation: "action", target: "creature", range: "60 ft", healing: "6d8" },
      avatar: { type: "utility", activation: "bonus", target: "self", range: "self" },
      signature: { type: "utility", activation: "special", target: "creature", range: "60 ft" }
    },
    blood_first_dragon: {
      active1: { type: "utility", activation: "special", target: "self", range: "self" },
      active2: { type: "utility", activation: "bonus", target: "self", range: "self" },
      active3: { type: "utility", activation: "bonus", target: "self", range: "self" },
      active4: { type: "damage", activation: "action", target: "creature", range: "60 ft", damage: "10d6 fire" },
      avatar: { type: "utility", activation: "bonus", target: "self", range: "self" },
      signature: { type: "utility", activation: "special", target: "self", range: "self" }
    },
    lyre_first_song: {
      active1: { type: "heal", activation: "action", target: "creature", range: "30 ft", healing: "2d8" },
      active2: { type: "utility", activation: "bonus", target: "self", range: "self" },
      active3: { type: "save", activation: "action", target: "creature", range: "60 ft", save: "wis" },
      active4: { type: "utility", activation: "action", target: "self", range: "self" },
      avatar: { type: "utility", activation: "bonus", target: "self", range: "self" },
      signature: { type: "save", activation: "special", target: "creature", range: "60 ft", save: "wis" }
    }
  };

  return cfg[relicId]?.[slot] || {
    type: "utility",
    activation: slot === "avatar" ? "bonus" : slot === "signature" ? "special" : "action",
    target: "self",
    range: "self"
  };
}



const TFR_SPRINT_1_RELICS = ["cloak_feywilds", "mantle_first_seer"];

function TFRSprint1Expected() {
  return {
    cloak_feywilds: {
      active1: { name: "Fey Step", type: "utility", activation: "bonus", range: "60 ft", target: "space", charges: "1 itemUses" },
      active2: { name: "Arrow of the First Hunt", type: "damage", activation: "special", range: "120 ft", target: "creature", damage: "4d8 force", charges: "2 itemUses" },
      active3: { name: "Glamour Veil", type: "utility", activation: "reaction", range: "self", target: "self", charges: "3 itemUses" },
      active4: { name: "Briar Snare", type: "save", activation: "special", range: "120 ft", target: "creature", save: "str", charges: "4 itemUses" },
      avatar: { name: "Avatar of The Hunt", type: "utility", activation: "bonus", range: "self", target: "self", charges: "8 itemUses" },
      signature: { name: "Signature of The Hunt", type: "utility", activation: "special", range: "self", target: "self", charges: "0/" }
    },
    mantle_first_seer: {
      active1: { name: "Echo of Tomorrow", type: "utility", activation: "bonus", range: "self", target: "self", charges: "1 itemUses" },
      active2: { name: "Moment of Clarity", type: "utility", activation: "reaction", range: "60 ft", target: "creature", charges: "2 itemUses" },
      active3: { name: "Threads of Fate", type: "utility", activation: "reaction", range: "60 ft", target: "creature", charges: "3 itemUses" },
      active4: { name: "Spell Insight", type: "utility", activation: "reaction", range: "120 ft", target: "creature", charges: "4 itemUses" },
      avatar: { name: "Avatar of Understanding", type: "utility", activation: "bonus", range: "self", target: "self", charges: "8 itemUses" },
      signature: { name: "Signature of Understanding", type: "utility", activation: "reaction", range: "120 ft", target: "creature", charges: "0/" }
    }
  };
}

export async function TFRAuditSprint1() {
  const relics = await TFRLoadRelics();
  const expected = TFRSprint1Expected();
  const rows = [];

  for (const relicId of TFR_SPRINT_1_RELICS) {
    const relic = relics.find(r => r.id === relicId);
    if (!relic) {
      rows.push({ relic: relicId, slot: "", ok: false, issue: "Missing relic data" });
      continue;
    }

    const actor = game.actors.getName(`TFR Test — ${relic.name}`);
    const item = actor?.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name)
      || game.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name);

    if (!item) {
      rows.push({ relic: relic.name, slot: "", ok: false, issue: "Missing item" });
      continue;
    }

    const acts = TFRGetActivitiesArray(item);
    const byName = new Map(acts.map(a => [TFRActivitySummary(a).name, TFRActivitySummary(a)]));

    for (const [slot, exp] of Object.entries(expected[relicId])) {
      const got = byName.get(exp.name);
      const issues = [];
      if (!got) {
        issues.push("missing activity");
      } else {
        if (got.type !== exp.type) issues.push(`type ${got.type} != ${exp.type}`);
        if (got.activation !== exp.activation) issues.push(`activation ${got.activation} != ${exp.activation}`);
        if (exp.range && got.range !== exp.range) issues.push(`range ${got.range} != ${exp.range}`);
        if (exp.target && !String(got.target).includes(exp.target)) issues.push(`target ${got.target} missing ${exp.target}`);
        if (exp.save && got.save !== exp.save) issues.push(`save ${got.save} != ${exp.save}`);
        if (exp.damage && got.damage !== exp.damage) issues.push(`damage ${got.damage} != ${exp.damage}`);
        if (exp.charges && got.uses !== exp.charges) issues.push(`charges ${got.uses} != ${exp.charges}`);
      }

      rows.push({
        relic: relic.name,
        slot,
        name: exp.name,
        ok: issues.length === 0,
        issue: issues.join("; ")
      });
    }
  }

  console.table(rows);
  const failed = rows.filter(r => !r.ok);
  if (failed.length) ui.notifications.warn(TFRT("The First Relics Sprint 1 Audit: {failedCount} issue(s). Check console.", { failedCount: failed.length }));
  else ui.notifications.info(TFRT("The First Relics Sprint 1 Audit passed."));
  return rows;
}



export const TFRAutomation = {
  version: "0.17.1",

  activitySlots: ["active1", "active2", "active3", "active4", "avatar", "signature"],

  getRelic(relicId) {
    return TFRLoadRelics().then(relics => relics.find(r => r.id === relicId));
  },

  getDefinition(relic, slot) {
    if (!relic || !slot) return null;
    return TFRGetAbilityDefinition(relic, slot);
  },

  findTestActor(relic) {
    return game.actors.getName(`TFR Test — ${relic.name}`);
  },

  findRelicItem(relic, actor = null) {
    return actor?.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name)
      || game.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name);
  },

  getActivities(item) {
    return TFRGetActivitiesArray(item);
  },

  findActivity(item, slot) {
    const activities = this.getActivities(item);
    return activities.find(a => {
      const data = a?.toObject ? a.toObject() : a;
      return data?.flags?.["the-first-relics"]?.slot === slot;
    }) || activities[["active1", "active2", "active3", "active4", "avatar", "signature"].indexOf(slot)];
  },

  summarize(relic, slot, actor = null) {
    const item = this.findRelicItem(relic, actor);
    const activity = this.findActivity(item, slot);
    const definition = this.getDefinition(relic, slot);
    const summary = TFRActivitySummary(activity);
    return {
      relicId: relic.id,
      relic: relic.name,
      slot,
      actor: actor?.name || "",
      item: item?.name || "",
      activity: summary.name || "",
      type: summary.type || "",
      activation: summary.activation || "",
      range: summary.range || "",
      target: summary.target || "",
      save: summary.save || "",
      damage: summary.damage || "",
      healing: summary.healing || "",
      charges: definition?.charges ?? 0,
      uses: summary.uses || "",
      engineReady: !!(item && activity && definition)
    };
  },

  async logTimeline(relicId, entry) {
    const state = await TFRGetRelicState(relicId);
    state.timeline = state.timeline || [];
    state.timeline.push({
      time: Date.now(),
      type: entry.type || "Automation",
      reason: entry.reason || "",
      value: state.value ?? 0,
      slot: entry.slot || "",
      actor: entry.actor || "",
      activity: entry.activity || ""
    });
    await TFRSetRelicState(relicId, state);
    return state;
  },

  async dryRun(relicId, slot, options = {}) {
    const relics = await TFRLoadRelics();
    const relic = relics.find(r => r.id === relicId || r.name === relicId);
    if (!relic) throw new Error(`Relic not found: ${relicId}`);

    const actor = options.actor || this.findTestActor(relic);
    const summary = this.summarize(relic, slot, actor);

    if (!summary.engineReady) {
      await this.logTimeline(relic.id, {
        type: "Automation Dry Run Failed",
        slot,
        actor: actor?.name || "",
        activity: summary.activity || "",
        reason: `Automation dry run failed for ${relic.name} / ${slot}`
      });
      return { ok: false, ...summary, issue: "Missing item, activity, or definition" };
    }

    await this.logTimeline(relic.id, {
      type: "Automation Dry Run",
      slot,
      actor: actor?.name || "",
      activity: summary.activity,
      reason: `Dry run: ${relic.name} / ${summary.activity}`
    });

    return {
      ok: true,
      mode: "dry-run",
      ...summary,
      note: "No game effect was applied. Engine metadata and timeline logging are working."
    };
  }
};

export async function TFRAuditAutomationEngine() {
  const relics = await TFRLoadRelics();
  const rows = [];

  for (const relic of relics) {
    const actor = TFRAutomation.findTestActor(relic);
    for (const slot of TFRAutomation.activitySlots) {
      const summary = TFRAutomation.summarize(relic, slot, actor);
      const issues = [];
      if (!summary.item) issues.push("missing item");
      if (!summary.activity) issues.push("missing activity");
      if (!TFRGetAbilityDefinition(relic, slot)) issues.push("missing definition");
      rows.push({
        relic: relic.name,
        slot,
        activity: summary.activity,
        type: summary.type,
        activation: summary.activation,
        charges: summary.charges,
        ready: issues.length === 0,
        issue: issues.join("; ")
      });
    }
  }

  console.table(rows);
  const failed = rows.filter(r => !r.ready);
  if (failed.length) ui.notifications.warn(TFRT("The First Relics Automation Engine: {failedCount} issue(s). Check console.", { failedCount: failed.length }));
  else ui.notifications.info(TFRT("The First Relics Automation Engine audit passed."));
  return rows;
}

export async function TFRTestAutomationEngine(relicId, slot = "active1") {
  const result = await TFRAutomation.dryRun(relicId, slot);
  console.table([result]);
  if (result.ok) ui.notifications.info(TFRT("Automation dry run OK: {relic} / {activity}", { relic: result.relic, activity: result.activity }));
  else ui.notifications.warn(TFRT("Automation dry run failed: {value} / {slot}", { value: result.relic || relicId, slot: slot }));
  return result;
}



