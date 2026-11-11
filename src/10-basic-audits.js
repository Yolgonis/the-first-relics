import "./09-dashboard.js"; // keeps the original load order
import { TFRLoadRelics, TFRT, TFR_CLOAK_DISPLAY_NAME } from "./00-core.js";
import { TFRBuildActivities } from "./04-items.js";

export async function TFRAuditRelics() {
  const relics = await TFRLoadRelics();
  const required = [
    "id", "name", "class", "virtue", "theme", "trueName", "personality",
    "moodMap", "affinityEvents", "hiddenRequirements", "features",
    "dreams", "memories", "quotes", "signatureCeremony", "lore"
  ];

  const rows = relics.map(r => {
    const missing = required.filter(k => {
      const v = r[k];
      if (Array.isArray(v)) return v.length === 0;
      if (typeof v === "object" && v !== null) return Object.keys(v).length === 0;
      return !v;
    });

    const featureIssues = [];
    if (!r.features?.passives?.length) featureIssues.push("missing passives");
    if (!r.features?.actives?.length) featureIssues.push("missing actives");
    if (!r.features?.avatar) featureIssues.push("missing avatar");
    if (!r.features?.signature) featureIssues.push("missing signature");

    return {
      id: r.id,
      name: r.name,
      status: r.releaseStatus || "unknown",
      missing,
      featureIssues,
      ok: missing.length === 0 && featureIssues.length === 0
    };
  });

  console.table(rows.map(r => ({
    id: r.id,
    name: r.name,
    status: r.status,
    ok: r.ok,
    missing: r.missing.join(", "),
    featureIssues: r.featureIssues.join(", ")
  })));

  const failed = rows.filter(r => !r.ok);
  if (failed.length) {
    ui.notifications.warn(TFRT("The First Relics Audit: {failedCount} relic(s) have missing data. Check console.", { failedCount: failed.length }));
  } else {
    ui.notifications.info(TFRT("The First Relics Audit: all loaded relics have required data."));
  }

  return rows;
}




export async function TFRAuditMidiEffects() {
  const relics = await TFRLoadRelics();
  const cloak = relics.find(r => r.id === "cloak_feywilds");
  if (!cloak) {
    ui.notifications.warn(TFRT("{TFR_CLOAK_DISPLAY_NAME} not found.", { TFR_CLOAK_DISPLAY_NAME: TFR_CLOAK_DISPLAY_NAME }));
    return [];
  }
  const acts = TFRBuildActivities(cloak, "exalted", 1, true);
  const rows = Object.entries(acts).map(([slot, a]) => ({
    slot,
    name: a.name,
    type: a.type,
    effects: a.effects?.length || 0,
    chooseEffects: !!a.midiProperties?.chooseEffects,
    damage: !!a.damage
  }));
  console.table(rows);
  ui.notifications.info(TFRT("Midi effect audit complete. Check console."));
  return rows;
}


export async function TFRAuditActivities() {
  const relics = await TFRLoadRelics();
  const rows = [];
  const stage = "exalted";
  let index = 1;

  for (const relic of relics) {
    const acts = TFRBuildActivities(relic, stage, index, true);
    for (const [slot, a] of Object.entries(acts)) {
      rows.push({
        relic: relic.name,
        slot,
        name: a.name,
        type: a.type,
        activation: a.activation?.type || "",
        damage: !!a.damage,
        saveAbility: a.save?.ability || "",
        saveDC: a.save?.dc?.calculation || "",
        damageFormula: a.damage?.parts?.map(p => `${p.number}d${p.denomination} ${p.types?.join("/")}`).join(", ") || "",
        charges: a.consumption?.targets?.[0]?.value || "0"
      });
    }
    index++;
  }

  console.table(rows);
  ui.notifications.info(TFRT("The First Relics Activity Audit complete. Check console."));
  return rows;
}



