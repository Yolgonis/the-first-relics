import "./12-conditions.js"; // keeps the original load order
import {
  TFRT,
  TFR_SAVE_AWARE_AUTO_APPLY,
  TFR_SAVE_AWARE_NATIVE_DELAY_MS,
  TFR_SAVE_AWARE_PENDING,
  TFR_SAVE_AWARE_TIMEOUT_MS,
  TFR_SAVE_AWARE_WORKFLOWS,
  TFR_SAVE_AWARE_WORKFLOW_CACHE_MS
} from "./00-core.js";
import { TFRConditionLabel, TFRGetAbilityDefinition } from "./03-activities.js";
import { TFRGetRelicById } from "./06-relic-state.js";
import { TFREscapeHtml } from "./08-affinity-events.js";
import { TFRChatFlags } from "./11-effect-helpers.js";
import {
  TFRApplyConditionSpecToRefs,
  TFRExtractWorkflowFailedSaveRefs,
  TFRUniqueActorTokenRefs,
  TFRWorkflowMatchesPending
} from "./12-conditions.js";
import { TFRRelicAbilityRuntimeSpec } from "./14-ability-runtime.js";
import { TFRFindActorRelicItem } from "./19-fey-step.js";
import { TFRLogRelicTimelineSafe } from "./24-chat-and-gates.js";

async function TFRCreateManualSaveResolverCard(pending) {
  if (!pending || pending.resolverMessageId) return null;
  const actor = game.actors?.get?.(pending.actorId) || game.actors?.getName?.(pending.actorName) || null;
  const relic = await TFRGetRelicById(pending.relicId);
  const def = relic ? TFRGetAbilityDefinition(relic, pending.slot) : null;
  const spec = TFRRelicAbilityRuntimeSpec(pending.relicId, pending.slot);
  if (!actor || !relic || !def || !spec?.condition) return null;

  const saveText = def.save ? TFRT("{ability} save", { ability: String(def.save).toUpperCase() }) : TFRT("saving throw");
  const conditionText = TFREscapeHtml(TFRConditionLabel(spec.condition));
  const abilityText = TFREscapeHtml(def.name);
  const itemText = TFREscapeHtml(relic.name);
  let resolverMessage = null;
  try {
    resolverMessage = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: TFRChatFlags({ saveAwareManualResolver: true, relicId: pending.relicId, slot: pending.slot, pendingId: pending.id, sourceMessageId: pending.messageId }),
      content: `
        <div class="tfr-save-resolver" data-tfr-save-pending="${pending.id}">
          <h2>${abilityText}</h2>
          <p>${TFRT("<strong>{item}</strong> requires a {save} before applying <strong>{condition}</strong>.", { item: itemText, save: TFREscapeHtml(saveText), condition: conditionText })}</p>
          <p>${TFRT("After the save roll is visible, target only the creature(s) that failed, then press the apply button. If all targets succeeded, clear it.")}</p>
          <div class="tfr-save-resolver-buttons" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
            <button type="button" data-tfr-save-action="apply-targets" data-tfr-pending-id="${pending.id}">${TFRT("Apply {condition} to Targeted Failed Save(s)", { condition: conditionText })}</button>
            <button type="button" data-tfr-save-action="clear" data-tfr-pending-id="${pending.id}">${TFRT("No Effect / Clear")}</button>
          </div>
        </div>`
    });
    pending.resolverMessageId = resolverMessage?.id || null;
    TFR_SAVE_AWARE_PENDING.set(pending.id, pending);
  } catch (err) {
    console.warn("The First Relics | could not create manual save resolver card", err);
  }
  return resolverMessage;
}

export async function TFRQueueSaveAwareCondition(actor, relicId, slot, options = {}) {
  const relic = await TFRGetRelicById(relicId);
  const item = TFRFindActorRelicItem(actor, relicId);
  const def = relic ? TFRGetAbilityDefinition(relic, slot) : null;
  const spec = TFRRelicAbilityRuntimeSpec(relicId, slot);
  if (!actor || !relic || !item || !def || !spec?.condition) return { queued: false, reason: "missing data" };

  const id = foundry.utils.randomID?.() || `${Date.now()}-${Math.random()}`;
  const pending = {
    id,
    created: Date.now(),
    actorId: actor.id,
    actorUuid: actor.uuid,
    actorName: actor.name,
    relicId,
    slot,
    itemId: item.id,
    itemUuid: item.uuid,
    itemName: item.name,
    abilityName: def.name,
    save: def.save || "",
    condition: spec.condition,
    messageId: options.message?.id || null,
    resolverMessageId: null,
    warned: false,
    nativeResolved: false
  };
  TFR_SAVE_AWARE_PENDING.set(id, pending);

  if (TFR_SAVE_AWARE_AUTO_APPLY) {
    window.setTimeout(async () => {
      try { await TFRTryResolvePendingFromNativeWorkflow(id, { fallbackToManual: true }); }
      catch (err) { console.warn("The First Relics | native-like save resolver failed", err); }
    }, TFR_SAVE_AWARE_NATIVE_DELAY_MS);
  } else {
    // Safe/manual mode: show a resolver shortly after the item card/save request,
    // but do not apply any condition until the GM presses the button.
    window.setTimeout(async () => {
      const stillPending = TFR_SAVE_AWARE_PENDING.get(id);
      if (!stillPending || stillPending.warned || stillPending.nativeResolved) return;
      stillPending.warned = true;
      TFR_SAVE_AWARE_PENDING.set(id, stillPending);
      await TFRCreateManualSaveResolverCard(stillPending);
    }, TFR_SAVE_AWARE_NATIVE_DELAY_MS);
  }

  window.setTimeout(async () => {
    const stillPending = TFR_SAVE_AWARE_PENDING.get(id);
    if (!stillPending || stillPending.warned || stillPending.nativeResolved) return;
    stillPending.warned = true;
    TFR_SAVE_AWARE_PENDING.set(id, stillPending);
    await TFRCreateManualSaveResolverCard(stillPending);
    ui.notifications.warn(TFRT("{defName}: save resolver is pending. Target failed save creature(s), then use the resolver card.", { defName: def.name }));
  }, TFR_SAVE_AWARE_TIMEOUT_MS);

  return { queued: true, id, ability: def.name, chatMessage: null };
}

function TFRCurrentTargetRefs() {
  return TFRUniqueActorTokenRefs(Array.from(game.user?.targets || []));
}

export async function TFRResolveSaveAwareManual(pendingId, action = "apply-targets") {
  if (!game.user?.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  const pending = TFR_SAVE_AWARE_PENDING.get(pendingId);
  if (!pending) {
    ui.notifications.warn(TFRT("The First Relics: this save resolver is no longer pending. It may have already resolved automatically or been cleared."));
    return { ok: false, issue: "not pending" };
  }
  const actor = game.actors?.get?.(pending.actorId) || game.actors?.getName?.(pending.actorName) || null;
  const relic = await TFRGetRelicById(pending.relicId);
  const item = actor ? TFRFindActorRelicItem(actor, pending.relicId) : null;
  const def = relic ? TFRGetAbilityDefinition(relic, pending.slot) : null;
  const spec = TFRRelicAbilityRuntimeSpec(pending.relicId, pending.slot);
  if (!actor || !relic || !item || !def || !spec?.condition) {
    ui.notifications.warn(TFRT("The First Relics: save resolver data is missing. Check console."));
    console.warn("The First Relics | save resolver missing data", { pending, actor, relic, item, def, spec });
    return { ok: false, issue: "missing data" };
  }

  if (action === "clear") {
    TFR_SAVE_AWARE_PENDING.delete(pendingId);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: TFRChatFlags({ saveAwareManualCleared: true, relicId: pending.relicId, slot: pending.slot, pendingId }),
      content: `<h2>${TFREscapeHtml(def.name)}</h2><p>${TFRT("<strong>Save resolver:</strong> cleared. No {condition} condition was applied.", { condition: TFREscapeHtml(TFRConditionLabel(spec.condition)) })}</p>`
    });
    return { ok: true, cleared: true };
  }

  const refs = TFRCurrentTargetRefs();
  if (!refs.length) {
    ui.notifications.warn(TFRT("{defName}: target the creature(s) that failed the save, then press Apply again.", { defName: def.name }));
    return { ok: false, issue: "no targets" };
  }

  const names = await TFRApplyConditionSpecToRefs(actor, relic, item, def, spec, refs, { source: "manual-resolver" });
  TFR_SAVE_AWARE_PENDING.delete(pendingId);
  await TFRLogRelicTimelineSafe(pending.relicId, { type: "Manual Save Resolver", slot: pending.slot, actor: actor.name, activity: def.name, reason: names.length ? `Applied ${spec.condition} to manually selected failed save target(s): ${names.join(", ")}.` : "No manual failed save targets selected." });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ saveAwareManualResolved: true, relicId: pending.relicId, slot: pending.slot, pendingId, failed: names.length }),
    content: `<h2>${TFREscapeHtml(def.name)}</h2><p>${TFRT("<strong>Manual save resolver:</strong> applied <strong>{condition}</strong> to {targets}.", { condition: TFREscapeHtml(TFRConditionLabel(spec.condition)), targets: TFREscapeHtml(names.join(", ") || TFRT("no targets")) })}</p>`
  });
  return { ok: true, applied: names };
}

export function TFRRegisterSaveAwareChatButtons() {
  if (globalThis.__TFR_SAVE_AWARE_CHAT_BUTTONS__) return;
  globalThis.__TFR_SAVE_AWARE_CHAT_BUTTONS__ = true;
  document.addEventListener("click", async event => {
    const button = event.target?.closest?.("[data-tfr-save-action]");
    if (!button) return;
    event.preventDefault();
    const action = button.dataset.tfrSaveAction;
    const pendingId = button.dataset.tfrPendingId;
    if (!pendingId) return;
    button.disabled = true;
    try {
      await TFRResolveSaveAwareManual(pendingId, action);
    } catch (err) {
      console.error("The First Relics | save resolver button failed", err);
      ui.notifications.error(TFRT("The First Relics save resolver failed. Check console."));
    } finally {
      button.disabled = false;
    }
  });
}

function TFRCleanupSaveWorkflowCache() {
  const cutoff = Date.now() - TFR_SAVE_AWARE_WORKFLOW_CACHE_MS;
  while (TFR_SAVE_AWARE_WORKFLOWS.length && TFR_SAVE_AWARE_WORKFLOWS[0].time < cutoff) TFR_SAVE_AWARE_WORKFLOWS.shift();
}

function TFRCacheSaveAwareWorkflow(workflow, hook = "") {
  if (!workflow) return;
  TFR_SAVE_AWARE_WORKFLOWS.push({ time: Date.now(), hook, workflow });
  TFRCleanupSaveWorkflowCache();
}

function TFRFindReadableWorkflowForPending(pending) {
  TFRCleanupSaveWorkflowCache();
  const rows = Array.from(TFR_SAVE_AWARE_WORKFLOWS)
    .filter(row => row.time >= (pending.created - 1500))
    .reverse();
  for (const row of rows) {
    if (!TFRWorkflowMatchesPending(row.workflow, pending)) continue;
    const result = TFRExtractWorkflowFailedSaveRefs(row.workflow);
    if (result.readable) return { workflow: row.workflow, hook: row.hook, result };
  }
  return null;
}

async function TFRFinalizeSaveAwareResult(pending, result, { source = "native-like" } = {}) {
  if (!pending || !result?.readable) return false;
  const actor = game.actors?.get?.(pending.actorId) || game.actors?.getName?.(pending.actorName) || null;
  const relic = await TFRGetRelicById(pending.relicId);
  const item = actor ? TFRFindActorRelicItem(actor, pending.relicId) : null;
  const def = relic ? TFRGetAbilityDefinition(relic, pending.slot) : null;
  const spec = TFRRelicAbilityRuntimeSpec(pending.relicId, pending.slot);
  if (!actor || !relic || !item || !def || !spec?.condition) return false;

  TFR_SAVE_AWARE_PENDING.delete(pending.id);
  const names = await TFRApplyConditionSpecToRefs(actor, relic, item, def, spec, result.failed, { source });
  await TFRLogRelicTimelineSafe(pending.relicId, {
    type: "Native Save Resolver",
    slot: pending.slot,
    actor: actor.name,
    activity: def.name,
    reason: names.length ? `Applied ${spec.condition} to failed save target(s): ${names.join(", ")}.` : "All targets succeeded; no condition applied."
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ saveAwareResolved: true, relicId: pending.relicId, slot: pending.slot, failed: names.length, autoApplied: true, nativeLike: true }),
    content: `<h2>${TFREscapeHtml(def.name)}</h2><p>${names.length ? TFRT("<strong>Native save resolver:</strong> applied <strong>{condition}</strong> to {targets}.", { condition: TFREscapeHtml(TFRConditionLabel(spec.condition)), targets: names.map(TFREscapeHtml).join(", ") }) : TFRT("<strong>Native save resolver:</strong> all targets succeeded; no condition applied.")}</p>`
  });
  return true;
}

async function TFRTryResolvePendingFromNativeWorkflow(pendingId, { fallbackToManual = false } = {}) {
  if (!game.user?.isGM) return false;
  const pending = TFR_SAVE_AWARE_PENDING.get(pendingId);
  if (!pending) return false;
  const found = TFRFindReadableWorkflowForPending(pending);
  if (found) return TFRFinalizeSaveAwareResult(pending, found.result, { source: found.hook || "native-like" });
  if (fallbackToManual) await TFRCreateManualSaveResolverCard(pending);
  return false;
}

async function TFRResolveSaveAwareWorkflow(workflow, hook = "") {
  if (!game.user?.isGM || !workflow) return false;
  TFRCacheSaveAwareWorkflow(workflow, hook);
  if (!TFR_SAVE_AWARE_AUTO_APPLY || !TFR_SAVE_AWARE_PENDING.size) return false;

  // Let dnd5e/Midi finish writing the save result first. This keeps the behavior close to
  // Foundry's normal flow: item card -> saving throw -> effect result.
  window.setTimeout(async () => {
    const entries = Array.from(TFR_SAVE_AWARE_PENDING.values()).sort((a, b) => a.created - b.created);
    for (const pending of entries) {
      try { await TFRTryResolvePendingFromNativeWorkflow(pending.id, { fallbackToManual: false }); }
      catch (err) { console.warn("The First Relics | deferred save workflow resolution failed", err); }
    }
  }, TFR_SAVE_AWARE_NATIVE_DELAY_MS);
  return true;
}

export function TFRRegisterSaveAwareAutomation() {
  if (globalThis.__TFR_SAVE_AWARE_AUTOMATION_HOOK__) return;
  globalThis.__TFR_SAVE_AWARE_AUTOMATION_HOOK__ = true;

  const handler = async (workflow, ...args) => {
    try { await TFRResolveSaveAwareWorkflow(workflow, String(this || "")); }
    catch (err) { console.warn("The First Relics | save-aware workflow handler failed", err); }
  };

  // Midi-QOL has changed hook timing/names across versions. We cache likely final workflow
  // hooks and resolve after a short delay, instead of applying conditions the instant a hook fires.
  for (const hook of [
    "midi-qol.RollComplete",
    "midi-qol.RollComplete.Workflow",
    "midi-qol.postCheckSaves",
    "midi-qol.postSaveRoll",
    "midi-qol.postApplyDynamicEffects"
  ]) Hooks.on(hook, async (workflow, ...args) => {
    try { await TFRResolveSaveAwareWorkflow(workflow, hook); }
    catch (err) { console.warn("The First Relics | save-aware workflow handler failed", err); }
  });

  console.log("The First Relics | Safe save resolver enabled. Failed-save conditions are never applied automatically; use the GM resolver button after the save roll.");
}

export function TFRAuditSaveAwarePending() {
  const rows = Array.from(TFR_SAVE_AWARE_PENDING.values()).map(p => ({
    ageMs: Date.now() - p.created,
    actor: p.actorName,
    relicId: p.relicId,
    slot: p.slot,
    ability: p.abilityName,
    item: p.itemName,
    messageId: p.messageId || ""
  }));
  console.table(rows);
  ui.notifications.info(TFRT("The First Relics: {rowsCount} pending save-aware helper(s).", { rowsCount: rows.length }));
  return rows;
}

