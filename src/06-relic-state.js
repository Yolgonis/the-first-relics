import "./05-journal.js"; // keeps the original load order
import {
  TFRInContentLanguage,
  TFRKnownRelicNames,
  TFRLoadRelics,
  TFRNotifyInfo,
  TFRT,
  TFR_CLOAK_ITEM_NAMES,
  TFR_FINAL_FORM_BONUS,
  TFR_FINAL_FORM_CHARGES,
  TFR_MODULE_ID,
  TFR_RELIC_LOCKS,
  TFR_STAGES,
  TFR_STARTUP_SYNC
} from "./00-core.js";
import {
  TFRDisplayStage,
  TFRGetStageData,
  TFRSealTrueNameText,
  TFRTrueNameLeaks
} from "./01-stages-and-text.js";
import { TFRBuildDescription } from "./03-activities.js";
import {
  TFRBuildItem,
  TFRHasUniversalRelicBonus,
  TFRRelicBonusEffect,
  TFRRelicItemSignatureUnlocked,
  TFRRelicItemStage,
  TFRUpdateRelicItem
} from "./04-items.js";
import { TFRDeleteFeatureItems } from "./22-feature-items.js";

export async function TFRInitActorRelicData(actor, relicId) {
  if (!game.user.isGM || !actor) return;
  const existing = actor.getFlag("the-first-relics", `affinity.${relicId}`);
  if (existing) return existing;
  const data = { value: 0, mood: "Watching", stage: "dormant", questCompleted: false, notes: "", timeline: [] };
  await actor.setFlag("the-first-relics", `affinity.${relicId}`, data);
  return data;
}

export async function TFRSetAffinity(actor, relicId, value, reason = "") {
  if (!game.user.isGM || !actor) return;
  const data = await TFRInitActorRelicData(actor, relicId);
  data.value = Math.clamp(Number(value) || 0, 0, 1000);
  if (reason) data.timeline.push({ time: Date.now(), value: data.value, reason });
  await actor.setFlag("the-first-relics", `affinity.${relicId}`, data);
  ui.notifications.info(TFRT("Affinity updated: {actorName} / {relicId} = {dataValue}", { actorName: actor.name, relicId: relicId, dataValue: data.value }));
}

export async function TFRAdjustAffinity(actor, relicId, delta, reason = "") {
  const data = await TFRInitActorRelicData(actor, relicId);
  const value = (data.value || 0) + Number(delta || 0);
  await TFRSetAffinity(actor, relicId, value, reason);
  return TFRSyncStageFromAffinity(actor, relicId, value, reason || "Affinity adjusted");
}

export async function TFRDeleteAll() {
  await TFRDeleteFeatureItems();
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  const itemIds = game.items.filter(i => i.system?.source?.custom === "The First Relics" || i.flags?.["the-first-relics"]?.relicId).map(i => i.id);
  if (itemIds.length) await Item.deleteDocuments(itemIds);
  for (const j of game.journal.filter(j => j.name === "The First Relics - Lore")) await j.delete();
  for (const actor of game.actors) {
    if (actor.getFlag("the-first-relics", "affinity")) await actor.unsetFlag("the-first-relics", "affinity");
  }
  await TFRSetWorldState({});
  ui.notifications.info(TFRT("The First Relics: deleted all relic items, lore journal, actor affinity data, and world relic state."));
}



export function TFRRegisterWorldState() {
  game.settings.register("the-first-relics", "relicState", {
    name: "Relic State",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register("the-first-relics", "testLabBackupState", {
    name: "Test Lab Backup State",
    scope: "world",
    config: false,
    type: Object,
    default: null
  });
}

export function TFRGetWorldState() {
  return foundry.utils.deepClone(game.settings.get("the-first-relics", "relicState") || {});
}

export async function TFRSetWorldState(state) {
  return game.settings.set("the-first-relics", "relicState", state || {});
}

/** Relic ids that were renamed: old id -> current id. */
export const TFR_LEGACY_RELIC_IDS = { manacles_unbroken: "girdle_unbroken" };

/** Moves world state, items and lore pages saved under a renamed relic id to the current id. */
export async function TFRMigrateLegacyRelicIds() {
  if (!game.users?.activeGM?.isSelf) return { state: 0, items: 0, pages: 0 };
  const result = { state: 0, items: 0, pages: 0 };

  const state = TFRGetWorldState();
  for (const [oldId, newId] of Object.entries(TFR_LEGACY_RELIC_IDS)) {
    if (!(oldId in state)) continue;
    // Never overwrite state already saved under the new id.
    if (!(newId in state)) state[newId] = state[oldId];
    delete state[oldId];
    result.state += 1;
  }
  if (result.state) await TFRSetWorldState(state);

  // shortcut: unlinked token actors are not scanned, add scene token deltas if relics are ever placed on them.
  const items = [...game.items, ...game.actors.contents.flatMap(actor => actor.items.contents)];
  for (const item of items) {
    const update = {};
    const newId = TFR_LEGACY_RELIC_IDS[item.flags?.[TFR_MODULE_ID]?.relicId];
    if (newId) update[`flags.${TFR_MODULE_ID}.relicId`] = newId;
    const newIdentifier = TFR_LEGACY_RELIC_IDS[item._source?.system?.identifier];
    if (newIdentifier) update["system.identifier"] = newIdentifier;
    for (const [activityId, activity] of Object.entries(item._source?.system?.activities || {})) {
      const activityRelicId = TFR_LEGACY_RELIC_IDS[activity?.flags?.[TFR_MODULE_ID]?.relicId];
      if (activityRelicId) update[`system.activities.${activityId}.flags.${TFR_MODULE_ID}.relicId`] = activityRelicId;
    }
    if (!Object.keys(update).length) continue;
    await item.update(update);
    result.items += 1;
  }

  for (const journal of game.journal) {
    for (const page of journal.pages) {
      const newId = TFR_LEGACY_RELIC_IDS[page.flags?.[TFR_MODULE_ID]?.lorePageId];
      if (!newId) continue;
      await page.update({ [`flags.${TFR_MODULE_ID}.lorePageId`]: newId });
      result.pages += 1;
    }
  }

  if (result.state || result.items || result.pages) {
    console.log(`The First Relics | Migrated renamed relic ids: ${result.state} state record(s), ${result.items} item(s), ${result.pages} lore page(s).`);
  }
  return result;
}

function TFRDefaultRelicState() {
  return {
    value: 0,
    mood: "Watching",
    stage: "dormant",
    refusesAttunement: false,
    signatureUnlocked: false,
    questCompleted: false,
    notes: "",
    timeline: [],
    requirements: {},
    dreamsSent: {},
    memoriesUnlocked: {}
  };
}

export async function TFRGetRelicState(relicId) {
  const state = TFRGetWorldState();
  if (!state[relicId]) {
    state[relicId] = TFRDefaultRelicState();
    await TFRSetWorldState(state);
  }
  return state[relicId];
}

export async function TFRSetRelicState(relicId, data) {
  const state = TFRGetWorldState();
  state[relicId] = data;
  await TFRSetWorldState(state);
  return data;
}

export async function TFRAdjustRelicAffinity(relicId, delta, reason = "") {
  const data = await TFRGetRelicState(relicId);
  const value = Math.clamp((Number(data.value) || 0) + Number(delta || 0), 0, 1000);
  return TFRSetRelicAffinity(relicId, value, reason || `Adjusted by ${delta}`);
}


export function TFRFindAllRelicItemCopies(relic) {
  const items = [];
  if (!relic?.id || !relic?.name) return items;
  const matches = item => {
    const relicId = item?.getFlag?.(TFR_MODULE_ID, "relicId") || item?.flags?.[TFR_MODULE_ID]?.relicId;
    if (relicId === relic.id || item?.name === relic.name) return true;
    return relic.id === "cloak_feywilds" && TFR_CLOAK_ITEM_NAMES.has(item?.name);
  };

  items.push(...(game.items?.filter?.(matches) || []));

  for (const actor of game.actors?.contents || []) {
    items.push(...(actor.items?.filter?.(matches) || []));
  }

  // de-duplicate by uuid
  return Array.from(new Map(items.map(i => [i.uuid, i])).values());
}

export function TFRRelicForItem(item, relics) {
  const relicId = item?.getFlag?.(TFR_MODULE_ID, "relicId") || item?.flags?.[TFR_MODULE_ID]?.relicId;
  if (relicId) return relics.find(relic => relic.id === relicId) || null;
  if (TFR_CLOAK_ITEM_NAMES.has(item?.name)) return relics.find(relic => relic.id === "cloak_feywilds") || null;
  return relics.find(relic => relic.name === item?.name) || null;
}

export function TFRAllWorldAndActorItems() {
  const items = [...(game.items?.contents || [])];
  for (const actor of game.actors?.contents || []) items.push(...(actor.items?.contents || []));
  return Array.from(new Map(items.filter(Boolean).map(item => [item.uuid || item.id, item])).values());
}

export async function TFRSyncSealedTrueNameDescriptions() {
  const result = { ok: true, checked: 0, updated: 0, skippedUnlocked: 0, failures: [] };
  if (!game.user?.isGM) return result;

  const relics = await TFRLoadRelics();
  for (const item of TFRAllWorldAndActorItems()) {
    const relic = TFRRelicForItem(item, relics);
    if (!relic?.trueName) continue;
    result.checked += 1;

    if (TFRRelicItemSignatureUnlocked(item)) {
      result.skippedUnlocked += 1;
      continue;
    }

    const current = String(item.system?.description?.value || "");
    const leaks = TFRTrueNameLeaks(relic, current);
    if (!leaks.length) continue;

    const stage = TFRRelicItemStage(item);
    const repaired = current.includes("first-relics-item-description")
      ? TFRBuildDescription(relic, stage, false)
      : TFRSealTrueNameText(relic, current, false);
    try {
      await item.update({ "system.description.value": repaired });
      result.updated += 1;
    } catch (error) {
      result.ok = false;
      result.failures.push({ item: item.uuid || item.name, relicId: relic.id, leaks });
      console.error(`The First Relics | Could not seal the true name in ${item.uuid || item.name}.`, error);
    }
  }

  if (result.updated) {
    console.log(`The First Relics | Sealed premature true names in ${result.updated} existing item description(s).`);
  }
  return result;
}

export async function TFRSyncProgressiveAppearanceDescriptions() {
  const result = { ok: true, checked: 0, updated: 0, skippedCustom: 0, failures: [] };
  if (!game.user?.isGM) return result;

  const relics = await TFRLoadRelics();
  const knownNames = await TFRKnownRelicNames();
  for (const item of TFRAllWorldAndActorItems()) {
    const relicId = item?.getFlag?.(TFR_MODULE_ID, "relicId") || item?.flags?.[TFR_MODULE_ID]?.relicId;
    const relic = relics.find(candidate => candidate.id === relicId);
    if (!relic) continue;

    result.checked += 1;
    const current = String(item.system?.description?.value || "");
    if (current && !current.includes("first-relics-item-description")) {
      result.skippedCustom += 1;
      continue;
    }

    const stage = TFRRelicItemStage(item);
    const signatureUnlocked = TFRRelicItemSignatureUnlocked(item);
    const expected = TFRBuildDescription(relic, stage, signatureUnlocked);
    // A generated name in another content language follows the description; custom names stay.
    const renamed = item.name !== relic.name && knownNames.get(relic.id)?.has(item.name);
    if (current === expected && !renamed) continue;

    try {
      await item.update({ "system.description.value": expected, ...(renamed ? { name: relic.name } : {}) });
      result.updated += 1;
    } catch (error) {
      result.ok = false;
      result.failures.push({ item: item.uuid || item.name, error: error?.message || String(error) });
      console.error(`The First Relics | Could not synchronize progressive manifestations for ${item.uuid || item.name}.`, error);
    }
  }

  if (result.updated) console.log(`The First Relics | Updated progressive manifestations in ${result.updated} item description(s).`);
  return result;
}

export async function TFRAuditTrueNameSealing() {
  const relics = await TFRLoadRelics();
  const rows = [];
  for (const relic of relics) {
    for (const stage of TFR_STAGES) {
      const description = TFRBuildDescription(relic, stage, false);
      const leaks = TFRTrueNameLeaks(relic, description);
      rows.push({
        relicId: relic.id,
        relic: relic.name,
        stage,
        sealed: leaks.length === 0,
        leaks: leaks.join(", ")
      });
    }
  }
  const failed = rows.filter(row => !row.sealed);
  console.table(rows);
  return { ok: failed.length === 0, checked: rows.length, failed, rows };
}

export async function TFRAuditProgressiveAppearanceUnlocks() {
  const relics = await TFRLoadRelics();
  const cases = [
    { stage: "dormant", signatureUnlocked: false, expectedCount: 1, label: "Dormant" },
    { stage: "awakened", signatureUnlocked: false, expectedCount: 2, label: "Awakened" },
    { stage: "exalted", signatureUnlocked: false, expectedCount: 3, label: "Exalted" },
    { stage: "exalted", signatureUnlocked: true, expectedCount: 4, label: "Final Form" }
  ];
  const rows = [];

  for (const relic of relics) {
    const appearanceTexts = [
      relic.lore?.appearanceDormant,
      relic.lore?.appearanceAwakened,
      relic.lore?.appearanceExalted,
      relic.lore?.appearanceSignature
    ];

    for (const testCase of cases) {
      const description = TFRBuildDescription(relic, testCase.stage, testCase.signatureUnlocked);
      const issues = [];
      appearanceTexts.forEach((text, index) => {
        if (!text) {
          issues.push(`appearance ${index + 1} missing from relic data`);
          return;
        }
        const visibleText = TFRSealTrueNameText(relic, text, testCase.signatureUnlocked);
        const shown = description.includes(visibleText);
        const shouldShow = index < testCase.expectedCount;
        if (shown !== shouldShow) issues.push(`${["Dormant", "Awakened", "Exalted", "Final Form"][index]} appearance ${shown ? "visible early" : "missing"}`);
      });
      if (relic.lore?.origin && description.includes(relic.lore.origin)) issues.push("GM origin leaked into player description");
      if (relic.lore?.hiddenSorrow && description.includes(relic.lore.hiddenSorrow)) issues.push("GM hidden sorrow leaked into player description");
      if (!testCase.signatureUnlocked && TFRTrueNameLeaks(relic, description).length) issues.push("true name leaked before 1000");

      rows.push({
        relic: relic.name,
        form: testCase.label,
        appearances: testCase.expectedCount,
        ok: issues.length === 0,
        issues: issues.join("; ")
      });
    }
  }

  const failed = rows.filter(row => !row.ok);
  console.log("========== THE FIRST RELICS PROGRESSIVE MANIFESTATION AUDIT ==========");
  console.table(rows);
  return { ok: failed.length === 0, checked: rows.length, failed, rows };
}

/** True when a description shows the charge count, in English or the relic content language. */
function TFRDescriptionShowsCharges(html, charges) {
  const text = String(html || "");
  const localized = TFRInContentLanguage(() => TFRT("The relic has <strong>{charges} charges</strong> and regains all expended charges daily at dawn.", { charges })).match(/<strong>[^<]*<\/strong>/)?.[0];
  return text.includes(`<strong>${charges} charges</strong>`) || (!!localized && text.includes(localized));
}

export async function TFRAuditFinalFormBonuses() {
  const relics = await TFRLoadRelics();
  const rows = [];

  for (let index = 0; index < relics.length; index++) {
    const relic = relics[index];
    const exalted = TFRBuildItem(relic, "exalted", index + 1, false);
    const finalForm = TFRBuildItem(relic, "exalted", index + 1, true);
    const exaltedBonus = TFRGetStageData(relic, "exalted", false).bonus;
    const finalBonus = TFRGetStageData(relic, "exalted", true).bonus;
    const exaltedCharges = Number(exalted.system?.uses?.max) || 0;
    const finalCharges = Number(finalForm.system?.uses?.max) || 0;
    const issues = [];

    if (exaltedBonus !== 3) issues.push(`750-999 bonus ${exaltedBonus} != 3`);
    if (finalBonus !== TFR_FINAL_FORM_BONUS) issues.push(`1000 bonus ${finalBonus} != ${TFR_FINAL_FORM_BONUS}`);
    if (exaltedCharges !== 10) issues.push(`750-999 charges ${exaltedCharges} != 10`);
    if (finalCharges !== TFR_FINAL_FORM_CHARGES) issues.push(`1000 charges ${finalCharges} != ${TFR_FINAL_FORM_CHARGES}`);
    if (!TFRHasUniversalRelicBonus(exalted, 3)) issues.push("Exalted effect is not +3");
    if (!TFRHasUniversalRelicBonus(finalForm, TFR_FINAL_FORM_BONUS)) issues.push(`Final Form effect is not +${TFR_FINAL_FORM_BONUS}`);
    if (exalted.flags?.[TFR_MODULE_ID]?.finalForm) issues.push("Final Form unlocks before 1000");
    if (!finalForm.flags?.[TFR_MODULE_ID]?.finalForm) issues.push("Final Form flag missing at 1000");
    if (!/Final Form Relic Bonus$/i.test(TFRRelicBonusEffect(finalForm)?.name || "")) issues.push("Final Form effect name missing");
    if (!finalForm.system?.description?.value?.includes(`<strong>+${TFR_FINAL_FORM_BONUS} AC</strong>`)) issues.push(`Final Form description does not show +${TFR_FINAL_FORM_BONUS} AC`);
    if (!TFRDescriptionShowsCharges(finalForm.system?.description?.value, TFR_FINAL_FORM_CHARGES)) issues.push(`Final Form description does not show ${TFR_FINAL_FORM_CHARGES} charges`);
    if (exalted.system?.description?.value?.includes(`<strong>+${TFR_FINAL_FORM_BONUS} AC</strong>`)) issues.push(`+${TFR_FINAL_FORM_BONUS} appears before 1000`);
    if (TFRDescriptionShowsCharges(exalted.system?.description?.value, TFR_FINAL_FORM_CHARGES)) issues.push(`${TFR_FINAL_FORM_CHARGES} charges appear before 1000`);

    rows.push({
      relic: relic.name,
      exaltedBonus,
      finalBonus,
      exaltedCharges,
      finalCharges,
      finalForm: !!finalForm.flags?.[TFR_MODULE_ID]?.finalForm,
      effect: TFRRelicBonusEffect(finalForm)?.name || "",
      ok: issues.length === 0,
      issues: issues.join("; ")
    });
  }

  const failed = rows.filter(row => !row.ok);
  console.log("========== THE FIRST RELICS FINAL FORM BONUS AUDIT ==========");
  console.table(rows);
  return { ok: failed.length === 0, checked: rows.length, failed, rows };
}

/** Runs fn after every earlier rebuild of the same relic has finished. */
export function TFRWithRelicLock(relicId, fn) {
  const previous = TFR_RELIC_LOCKS.get(relicId) || Promise.resolve();
  const run = previous.then(fn);
  TFR_RELIC_LOCKS.set(relicId, run.catch(() => {}));
  return run;
}

export async function TFRSyncFinalFormItems() {
  if (!game.user?.isGM) return [];
  const relics = await TFRLoadRelics();
  const rows = [];

  for (const relic of relics) {
    const state = await TFRGetRelicState(relic.id);
    if (!TFRSignatureUnlockedFromAffinity(state?.value)) continue;

    if (state.stage !== "exalted" || !state.signatureUnlocked) {
      state.stage = "exalted";
      state.signatureUnlocked = true;
      state.mood = TFRMoodFromAffinity(state.value);
      await TFRSetRelicState(relic.id, state);
    }

    // Copies are looked up inside the lock, after any earlier rebuild replaced them.
    await TFRWithRelicLock(relic.id, async () => {
      for (const item of TFRFindAllRelicItemCopies(relic)) {
        const ready = TFRRelicItemStage(item) === "exalted"
          && TFRRelicItemSignatureUnlocked(item)
          && !!item.getFlag(TFR_MODULE_ID, "finalForm")
          && TFRHasUniversalRelicBonus(item, TFR_FINAL_FORM_BONUS)
          && Number(item.system?.uses?.max) === TFR_FINAL_FORM_CHARGES
          && String(item.system?.description?.value || "").includes(`<strong>+${TFR_FINAL_FORM_BONUS} AC</strong>`)
          && TFRDescriptionShowsCharges(String(item.system?.description?.value || ""), TFR_FINAL_FORM_CHARGES);
        if (ready) continue;
        const rebuilt = await TFRUpdateRelicItem(item, "exalted", true);
        rows.push({ relic: relic.name, location: item.parent?.name || "World Item Directory", item: rebuilt?.name || item.name, synced: !!rebuilt });
      }
    });
  }

  if (rows.length) TFRNotifyInfo(TFRT("The First Relics: {rowsCount} Final Form item copy/copies synchronized to +{TFR_FINAL_FORM_BONUS} and {TFR_FINAL_FORM_CHARGES} charges.", { rowsCount: rows.length, TFR_FINAL_FORM_BONUS: TFR_FINAL_FORM_BONUS, TFR_FINAL_FORM_CHARGES: TFR_FINAL_FORM_CHARGES }));
  return rows;
}

export async function TFRUpdateAllRelicCopies(relic, stage, signatureUnlocked = false) {
  await TFR_STARTUP_SYNC;
  return TFRWithRelicLock(relic.id, () => TFRUpdateAllRelicCopiesNow(relic, stage, signatureUnlocked));
}

async function TFRUpdateAllRelicCopiesNow(relic, stage, signatureUnlocked) {
  // Copies are looked up inside the lock, after any earlier rebuild replaced them.
  const copies = TFRFindAllRelicItemCopies(relic);
  if (!copies.length) {
    ui.notifications.warn(TFRT("The First Relics: No item copies found for {relicName}.", { relicName: relic.name }));
    return [];
  }

  const updated = [];
  for (const item of copies) {
    // Do not call setFlag before rebuilding: with stale dnd5e Activity documents even a flag-only
    // update can trigger data preparation and throw cachedSpell errors. The rebuild writes the flag
    // into fresh item data atomically.
    const rebuilt = await TFRUpdateRelicItem(item, stage, !!signatureUnlocked);
    if (rebuilt) updated.push(rebuilt);
  }

  return updated;
}


export async function TFRSetRelicAffinity(relicId, value, reason = "") {
  await TFR_STARTUP_SYNC;
  const relic = await TFRGetRelicById(relicId);
  if (!relic) return ui.notifications.warn(TFRT("The First Relics: Relic not found: {relicId}", { relicId: relicId }));

  const data = await TFRGetRelicState(relicId);
  const previousStage = data.stage || "dormant";

  data.value = Math.clamp(Number(value) || 0, 0, 1000);
  data.mood = TFRMoodFromAffinity(data.value);
  data.stage = TFRStageFromAffinity(data.value);
  data.timeline = data.timeline || [];

  const wasSignatureUnlocked = !!data.signatureUnlocked;
  data.signatureUnlocked = TFRSignatureUnlockedFromAffinity(data.value);

  if (reason) {
    data.timeline.push({
      time: Date.now(),
      value: data.value,
      reason: `${reason}; stage ${previousStage} → ${data.stage}`
    });
  }

  if (!wasSignatureUnlocked && data.signatureUnlocked) {
    data.timeline.push({
      time: Date.now(),
      value: data.value,
      reason: TFRT("Final Form awakened. Universal relic bonuses increased to +{bonus}, maximum charges increased to {charges}, the Signature Ability unlocked, and the relic revealed its true name.", { bonus: TFR_FINAL_FORM_BONUS, charges: TFR_FINAL_FORM_CHARGES })
    });

    ChatMessage.create({
      content: `<div class="first-relics-note"><h1>${TFRT("Final Form Awakened")}</h1><h2>${relic.name}</h2><p>${TFRT("The relic reaches perfect harmony at 1000 Affinity. Its Universal Relic Bonus becomes +{bonus}, its maximum charges become {charges}, its true name is revealed, and its Signature Ability is no longer sealed.", { bonus: TFR_FINAL_FORM_BONUS, charges: TFR_FINAL_FORM_CHARGES })}</p></div>`
    });
  }

  await TFRSetRelicState(relicId, data);

  const copies = await TFRUpdateAllRelicCopies(relic, data.stage, data.signatureUnlocked);
  if (copies.length) {
    ui.notifications.info(TFRT("{relicName}: stage synced to {value} on {copiesCount} item copy/copies.", { relicName: relic.name, value: TFRDisplayStage(data.stage, data.signatureUnlocked), copiesCount: copies.length }));
  }

  return data;
}

export async function TFRGetRelicById(relicId) {
  const relics = await TFRLoadRelics();
  return relics.find(r => r.id === relicId);
}

export function TFRMoodFromAffinity(value) {
  value = Number(value) || 0;
  if (value <= 50) return "Rejected";
  if (value <= 200) return "Silent";
  if (value <= 399) return "Watching";
  if (value <= 649) return "Curious";
  if (value <= 849) return "Satisfied";
  return "Resonating";
}

/** Display label for a stored mood id (moods are saved in English in relic state). */
export function TFRMoodLabel(mood) {
  const labels = {
    Rejected: TFRT("Rejected"),
    Silent: TFRT("Silent"),
    Watching: TFRT("Watching"),
    Curious: TFRT("Curious"),
    Satisfied: TFRT("Satisfied"),
    Resonating: TFRT("Resonating")
  };
  return labels[mood] ?? mood;
}

export function TFRStageFromAffinity(value) {
  value = Number(value) || 0;
  if (value >= 750) return "exalted";
  if (value >= 300) return "awakened";
  return "dormant";
}


export function TFRSignatureUnlockedFromAffinity(value) {
  return (Number(value) || 0) >= 1000;
}



async function TFRFindRelicItem(actor, relic) {
  if (!relic) return null;
  const matches = item => {
    const relicId = item?.getFlag?.(TFR_MODULE_ID, "relicId") || item?.flags?.[TFR_MODULE_ID]?.relicId;
    if (relicId === relic.id || item?.name === relic.name) return true;
    return relic.id === "cloak_feywilds" && TFR_CLOAK_ITEM_NAMES.has(item?.name);
  };
  return actor?.items?.find?.(matches) || game.items?.find?.(matches) || null;
}

export async function TFRSyncStageFromAffinity(actor, relicId, value, reason = "Affinity threshold sync") {
  if (!game.user.isGM || !actor) return null;

  const relic = await TFRGetRelicById(relicId);
  if (!relic) {
    ui.notifications.warn(TFRT("The First Relics: Relic data not found for {relicId}", { relicId: relicId }));
    return null;
  }

  const stage = TFRStageFromAffinity(value);
  const data = await TFRInitActorRelicData(actor, relicId);
  const previousStage = data.stage || "dormant";

  data.value = Math.clamp(Number(value) || 0, 0, 1000);
  data.mood = TFRMoodFromAffinity(data.value);
  data.stage = stage;
  data.signatureUnlocked = TFRSignatureUnlockedFromAffinity(data.value);
  data.timeline = data.timeline || [];
  data.timeline.push({
    time: Date.now(),
    value: data.value,
    reason: `${reason}; stage ${previousStage} → ${stage}`
  });
  await actor.setFlag("the-first-relics", `affinity.${relicId}`, data);

  const item = await TFRFindRelicItem(actor, relic);
  if (item) {
    const itemStage = item.getFlag("the-first-relics", "stage") || "dormant";
    const itemSignatureUnlocked = !!item.getFlag("the-first-relics", "signatureUnlocked");
    if (itemStage !== stage || itemSignatureUnlocked !== data.signatureUnlocked) {
      await TFRUpdateRelicItem(item, stage, data.signatureUnlocked);
      ui.notifications.info(TFRT("{relicName}: Affinity threshold reached. Stage set to {value}.", { relicName: relic.name, value: TFRDisplayStage(stage, data.signatureUnlocked) }));
    }
  } else {
    ui.notifications.warn(TFRT("The First Relics: Relic item not found for {relicName}. Stage saved on actor only.", { relicName: relic.name }));
  }

  return stage;
}


