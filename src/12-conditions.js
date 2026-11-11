import "./11-effect-helpers.js"; // keeps the original load order
import { TFRT, TFR_MODULE_ID } from "./00-core.js";
import { TFRSafeDeleteDocument, TFRTokenForActor } from "./11-effect-helpers.js";
import { TFRGetActivitySlot } from "./24-chat-and-gates.js";

export function TFRGetSelectedTargetToken() {
  return Array.from(game.user?.targets || [])[0] || null;
}

export function TFRGetConditionIcon(statusId = "restrained") {
  const status = (CONFIG.statusEffects || []).find(s => s.id === statusId || s._id === statusId || s.name?.toLowerCase?.() === statusId);
  return status?.img || status?.icon || "icons/svg/net.svg";
}

function TFRLooksLikeActorDocument(document) {
  if (!document) return false;
  if (document.documentName === "Actor") return true;
  if (document.constructor?.documentName === "Actor") return true;
  // Actor instances always have an embedded items collection and an effects collection; tokens also
  // have an .actor property, so this keeps actor/self effects from accidentally using selected targets.
  return !!document.items && !!document.effects && !document.actor;
}

function TFRResolveActorTokenForEffect(targetActorOrToken = null, { fallbackToTarget = true } = {}) {
  let targetToken = null;
  let targetActor = null;

  if (targetActorOrToken?.actor) {
    targetToken = targetActorOrToken?.object || targetActorOrToken;
    targetActor = targetActorOrToken.actor;
  } else if (TFRLooksLikeActorDocument(targetActorOrToken)) {
    targetActor = targetActorOrToken;
    targetToken = TFRTokenForActor(targetActor);
  } else if (targetActorOrToken) {
    targetActor = targetActorOrToken;
    targetToken = targetActor ? TFRTokenForActor(targetActor) : null;
  }

  if (!targetActor && fallbackToTarget) {
    targetToken = TFRGetSelectedTargetToken();
    targetActor = targetToken?.actor || null;
  }

  return { targetActor, targetToken };
}

function TFRActorHasCondition(actor, statusId = "restrained") {
  if (!actor) return false;
  const id = String(statusId).toLowerCase();
  return actor.effects?.some(e => {
    const statuses = e.statuses instanceof Set ? Array.from(e.statuses) : Array.from(e.statuses || []);
    const statusHit = statuses.map(x => String(x).toLowerCase()).includes(id);
    const flagHit = String(e.getFlag?.("core", "statusId") || "").toLowerCase() === id;
    const nameHit = String(e.name || e.label || "").toLowerCase().includes(id);
    return !e.disabled && (statusHit || flagHit || nameHit);
  }) || false;
}

function TFRRestrainedEffectData(sourceActor, item = null) {
  const combat = game.combat || null;
  return {
    name: "Restrained — Briar Snare",
    img: TFRGetConditionIcon("restrained"),
    origin: item?.uuid || null,
    disabled: false,
    transfer: false,
    statuses: ["restrained"],
    changes: [],
    duration: {
      rounds: 1,
      seconds: 6,
      startRound: combat?.round,
      startTurn: combat?.turn
    },
    flags: {
      core: { statusId: "restrained" },
      dae: { transfer: false, stackable: "noneName", specialDuration: [] },
      [TFR_MODULE_ID]: {
        sourceActorId: sourceActor?.id || null,
        sourceActorName: sourceActor?.name || "",
        ability: "verdantSnare",
        helperCondition: true
      }
    }
  };
}

export async function TFRApplyRestrainedCondition(sourceActor, targetActorOrToken = null, item = null) {
  const { targetActor, targetToken } = TFRResolveActorTokenForEffect(targetActorOrToken);

  if (!targetActor) {
    ui.notifications.warn(TFRT("Briar Snare: target one creature before applying Restrained."));
    return null;
  }

  if (TFRActorHasCondition(targetActor, "restrained")) {
    ui.notifications.info(TFRT("{targetActorName} is already Restrained.", { targetActorName: targetActor.name }));
    return targetActor.effects?.find(e => String(e.name || e.label || "").toLowerCase().includes("restrained")) || null;
  }

  let toggled = false;
  const candidates = [targetToken?.document, targetToken, targetActor].filter(Boolean);
  for (const candidate of candidates) {
    if (typeof candidate.toggleStatusEffect !== "function") continue;
    try {
      await candidate.toggleStatusEffect("restrained", { active: true, overlay: false });
      toggled = true;
      break;
    } catch (err) {}
  }

  if (toggled && TFRActorHasCondition(targetActor, "restrained")) {
    ui.notifications.info(TFRT("Briar Snare: Restrained applied to {targetActorName}.", { targetActorName: targetActor.name }));
    return targetActor.effects?.find(e => {
      const statuses = e.statuses instanceof Set ? Array.from(e.statuses) : Array.from(e.statuses || []);
      return statuses.includes("restrained") || String(e.name || e.label || "").toLowerCase().includes("restrained");
    }) || true;
  }

  const [created] = await targetActor.createEmbeddedDocuments("ActiveEffect", [TFRRestrainedEffectData(sourceActor, item)], { render: false });
  ui.notifications.info(TFRT("Briar Snare: Restrained applied to {targetActorName}.", { targetActorName: targetActor.name }));
  return created;
}


function TFRTimedDurationData(rounds = 10, seconds = 60) {
  const combat = game.combat || null;
  const duration = {
    rounds: Number(rounds || 0),
    seconds: Number(seconds || 0),
    startTime: game.time?.worldTime ?? 0
  };
  if (combat) {
    duration.combat = combat.id;
    duration.startRound = combat.round;
    duration.startTurn = combat.turn;
  }
  return duration;
}

function TFRIsTimedEffectDuration(rounds = 0, seconds = 0) {
  return Number(rounds || 0) > 0 || Number(seconds || 0) > 0;
}

function TFRFindActorConditionEffects(actor, statusId = "") {
  if (!actor) return [];
  const status = String(statusId || "").toLowerCase();
  if (!status) return [];
  return actor.effects?.filter(e => {
    const statuses = e.statuses instanceof Set ? Array.from(e.statuses) : Array.from(e.statuses || []);
    const statusHit = statuses.map(x => String(x).toLowerCase()).includes(status);
    const flagHit = String(e.getFlag?.("core", "statusId") || e.getFlag?.(TFR_MODULE_ID, "statusId") || "").toLowerCase() === status;
    const nameHit = String(e.name || e.label || "").toLowerCase().includes(status);
    return !e.disabled && (statusHit || flagHit || nameHit);
  }) || [];
}

export function TFRRegisterTimedEffectExpiry() {
  if (globalThis.__TFR_TIMED_EFFECT_EXPIRY_HOOK__) return;
  globalThis.__TFR_TIMED_EFFECT_EXPIRY_HOOK__ = true;

  Hooks.on("updateCombat", async (combat, changed = {}, options = {}, userId = null) => {
    if (!game.user?.isGM) return;
    if (changed.round === undefined && changed.turn === undefined) return;
    const combatants = Array.from(combat?.combatants || []);
    const toDelete = [];
    for (const combatant of combatants) {
      const actor = combatant?.actor;
      if (!actor) continue;
      for (const effect of actor.effects || []) {
        const flags = effect.getFlag?.(TFR_MODULE_ID, "timedExpiry") || null;
        if (!flags?.expireOnNextTurnChange) continue;
        if (flags.combatId && flags.combatId !== combat.id) continue;
        const startRound = Number(flags.startRound ?? -1);
        const startTurn = Number(flags.startTurn ?? -1);
        const currentRound = Number(combat.round ?? -1);
        const currentTurn = Number(combat.turn ?? -1);
        if (currentRound !== startRound || currentTurn !== startTurn) {
          toDelete.push({ actorId: actor.id, effectId: effect.id, name: effect.name });
        }
      }
    }
    for (const entry of toDelete) {
      const actor = game.actors?.get(entry.actorId) || combatants.find(c => c?.actor?.id === entry.actorId)?.actor || null;
      const effect = actor?.effects?.get?.(entry.effectId) || null;
      if (!effect) continue;
      await TFRSafeDeleteDocument(effect, `timed expiry ${entry.name || entry.effectId}`);
    }
  });
}

function TFRStatusEffectData(statusId, name, sourceActor = null, item = null, rounds = 10, seconds = 60, changes = [], options = {}) {
  const combat = game.combat || null;
  const status = String(statusId || "").trim().toLowerCase();
  const hasNativeStatus = !!(CONFIG.statusEffects || []).find(s => String(s.id || s._id || "").toLowerCase() === status);
  const data = {
    name: name || (status ? status[0].toUpperCase() + status.slice(1) : "Relic Condition"),
    img: TFRGetConditionIcon(status || "restrained"),
    origin: item?.uuid || null,
    disabled: false,
    transfer: false,
    changes: changes || [],
    duration: TFRTimedDurationData(rounds, seconds),
    flags: {
      dae: { transfer: false, stackable: "noneName", specialDuration: options?.expireOnTurnEnd ? ["turnEndSource"] : [] },
      [TFR_MODULE_ID]: {
        sourceActorId: sourceActor?.id || null,
        sourceActorName: sourceActor?.name || "",
        helperCondition: true,
        statusId: status,
        timedExpiry: options?.expireOnTurnEnd ? {
          expireOnNextTurnChange: true,
          combatId: combat?.id || null,
          startRound: combat?.round ?? null,
          startTurn: combat?.turn ?? null
        } : null
      }
    }
  };
  if (status) {
    data.statuses = [status];
    data.flags.core = { statusId: status };
  }
  if (!hasNativeStatus && status === "silenced") data.img = "icons/magic/sonic/scream-wail-shout-teal.webp";
  return data;
}

export async function TFRApplyStatusCondition(sourceActor, targetActorOrToken = null, item = null, statusId = "restrained", label = "Relic Condition", rounds = 10, seconds = 60, changes = [], options = {}) {
  const { targetActor, targetToken } = TFRResolveActorTokenForEffect(targetActorOrToken);
  const status = String(statusId || "").toLowerCase();

  if (!targetActor) {
    ui.notifications.warn(TFRT("{label}: target one creature first.", { label: label }));
    return null;
  }

  const isTimed = TFRIsTimedEffectDuration(rounds, seconds) || !!options?.expireOnTurnEnd;

  if (status && TFRActorHasCondition(targetActor, status) && !isTimed) {
    ui.notifications.info(TFRT("{targetActorName} already has {status}.", { targetActorName: targetActor.name, status: status }));
    return TFRFindActorConditionEffects(targetActor, status)[0] || null;
  }

  // Native toggleStatusEffect creates useful condition icons, but it usually creates an indefinite
  // effect. For short relic conditions (Fade Away, one-round fear, etc.) create an explicit timed
  // ActiveEffect instead so Foundry/DAE can expire it cleanly.
  if (!isTimed) {
    let toggled = false;
    const candidates = [targetToken?.document, targetToken, targetActor].filter(Boolean);
    for (const candidate of candidates) {
      if (!status || typeof candidate.toggleStatusEffect !== "function") continue;
      try {
        await candidate.toggleStatusEffect(status, { active: true, overlay: false });
        toggled = true;
        break;
      } catch (err) {}
    }

    if (toggled && (!status || TFRActorHasCondition(targetActor, status))) {
      ui.notifications.info(TFRT("{label}: {value} applied to {targetActorName}.", { label: label, value: status || "effect", targetActorName: targetActor.name }));
      return TFRFindActorConditionEffects(targetActor, status)[0] || true;
    }
  }

  const existingSameName = targetActor.effects?.find(e => String(e.name || e.label || "") === String(label || ""));
  if (existingSameName) await TFRSafeDeleteDocument(existingSameName, `replace condition ${label}`);

  const [created] = await targetActor.createEmbeddedDocuments("ActiveEffect", [
    TFRStatusEffectData(status, label, sourceActor, item, rounds, seconds, changes, options)
  ]);
  ui.notifications.info(TFRT("{label}: applied to {targetActorName}.", { label: label, targetActorName: targetActor.name }));
  return created;
}

export async function TFRRemoveActorConditions(actor, conditionIds = []) {
  if (!actor || !conditionIds?.length) return [];
  const ids = conditionIds.map(c => String(c).toLowerCase());
  const toDelete = actor.effects.filter(e => {
    const statuses = e.statuses instanceof Set ? Array.from(e.statuses) : Array.from(e.statuses || []);
    const statusHit = statuses.some(s => ids.includes(String(s).toLowerCase()));
    const flagHit = ids.includes(String(e.getFlag?.("core", "statusId") || "").toLowerCase());
    const name = String(e.name || e.label || "").toLowerCase();
    const nameHit = ids.some(id => name.includes(id));
    return statusHit || flagHit || nameHit;
  });
  for (const e of toDelete) await TFRSafeDeleteDocument(e, `remove condition ${e.name || e.id}`);
  return toDelete;
}

export function TFRCollectionToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  if (value instanceof Map) return Array.from(value.values());
  if (value.contents && Array.isArray(value.contents)) return value.contents;
  if (typeof value.values === "function") {
    try { return Array.from(value.values()); } catch (err) {}
  }
  if (typeof value[Symbol.iterator] === "function" && typeof value !== "string") {
    try { return Array.from(value); } catch (err) {}
  }
  return [value];
}

function TFRResolveDocumentFromUuidOrId(value) {
  if (!value) return null;
  if (typeof value !== "string") return null;
  try {
    if (typeof fromUuidSync === "function" && value.includes(".")) return fromUuidSync(value);
  } catch (err) {}
  return game.actors?.get?.(value) || canvas?.tokens?.get?.(value) || canvas?.scene?.tokens?.get?.(value) || null;
}

function TFRActorTokenRef(value) {
  if (!value) return null;
  if (typeof value === "string") value = TFRResolveDocumentFromUuidOrId(value);
  if (!value) return null;

  const object = value.object || value;
  if (object?.actor) return { actor: object.actor, token: object, tokenDocument: object.document || value.document || value };
  if (value?.document?.actor) return { actor: value.document.actor, token: value, tokenDocument: value.document };
  if (value?.documentName === "Actor" || value?.constructor?.documentName === "Actor") return { actor: value, token: TFRTokenForActor(value), tokenDocument: null };
  if (value?.actor) return { actor: value.actor, token: value.object || value, tokenDocument: value.document || null };
  return null;
}

export function TFRUniqueActorTokenRefs(values) {
  const rows = [];
  const seen = new Set();
  for (const value of TFRCollectionToArray(values)) {
    const ref = TFRActorTokenRef(value);
    if (!ref?.actor) continue;
    const key = ref.token?.id || ref.tokenDocument?.id || ref.actor.id || ref.actor.uuid || ref.actor.name;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(ref);
  }
  return rows;
}

function TFRWorkflowSourceActor(workflow) {
  return workflow?.actor || workflow?.item?.actor || workflow?.token?.actor || workflow?.speaker?.actor || null;
}

function TFRWorkflowSourceItem(workflow) {
  return workflow?.item || workflow?.activity?.item || workflow?.activity?.parent || workflow?.itemCardData?.item || null;
}

function TFRWorkflowSourceActivity(workflow) {
  return workflow?.activity || workflow?.activityData || workflow?.workflowOptions?.activity || null;
}

function TFRWorkflowRelicInfo(workflow) {
  const item = TFRWorkflowSourceItem(workflow);
  const activity = TFRWorkflowSourceActivity(workflow);
  const relicId = item?.getFlag?.(TFR_MODULE_ID, "relicId") || item?.flags?.[TFR_MODULE_ID]?.relicId || activity?.getFlag?.(TFR_MODULE_ID, "relicId") || activity?.flags?.[TFR_MODULE_ID]?.relicId || "";
  const slot = activity?.getFlag?.(TFR_MODULE_ID, "slot") || activity?.flags?.[TFR_MODULE_ID]?.slot || TFRGetActivitySlot(activity, activity?.name || "") || "";
  return { item, activity, relicId, slot };
}

function TFRSameActor(a, b) {
  if (!a || !b) return false;
  return a.id === b.id || a.uuid === b.uuid || a.name === b.name;
}

export function TFRWorkflowMatchesPending(workflow, pending) {
  const sourceActor = TFRWorkflowSourceActor(workflow);
  if (sourceActor && pending.actorId && !TFRSameActor(sourceActor, { id: pending.actorId, uuid: pending.actorUuid, name: pending.actorName })) return false;

  const info = TFRWorkflowRelicInfo(workflow);
  if (info.relicId && info.relicId !== pending.relicId) return false;
  if (info.slot && info.slot !== pending.slot) return false;

  const item = info.item;
  if (item && pending.itemId && item.id !== pending.itemId && item._id !== pending.itemId && item.uuid !== pending.itemUuid) {
    const itemRelic = item.getFlag?.(TFR_MODULE_ID, "relicId") || item.flags?.[TFR_MODULE_ID]?.relicId || "";
    if (itemRelic && itemRelic !== pending.relicId) return false;
  }

  // If the workflow has no useful item/activity flags, accept an actor match plus a pending item name
  // match in the workflow text-ish data. This keeps compatibility with compact dnd5e cards.
  if (!info.relicId && !info.slot) {
    let haystack = "";
    try { haystack = JSON.stringify({ item: item?.name, activity: info.activity?.name, workflowOptions: workflow?.workflowOptions }).toLowerCase(); } catch (err) {}
    if (pending.itemName && !haystack.includes(String(pending.itemName).toLowerCase())) return false;
  }

  return true;
}

function TFRExtractWorkflowTargetRefsFromKeys(workflow, keys) {
  const refs = [];
  for (const key of keys) {
    const value = foundry.utils.getProperty(workflow, key);
    if (value === undefined || value === null) continue;
    refs.push(...TFRUniqueActorTokenRefs(value));
  }
  return refs;
}

export function TFRExtractWorkflowFailedSaveRefs(workflow) {
  const failedKeys = [
    "failedSaves",
    "failedSave",
    "failedSaveTokens",
    "failedSaveActors",
    "failedSaveUuids",
    "failedSaveUUIDs",
    "saveResults.failedSaves",
    "saveResults.failed",
    "saves.failedSaves"
  ];
  const failed = TFRExtractWorkflowTargetRefsFromKeys(workflow, failedKeys);
  if (failed.length) return { readable: true, failed };

  // Empty failedSaves still means the save was readable and everybody succeeded.
  for (const key of failedKeys) {
    const value = foundry.utils.getProperty(workflow, key);
    if (value instanceof Set || Array.isArray(value) || value instanceof Map) return { readable: true, failed: [] };
  }

  // Some Midi-QOL versions expose all targets and successful saves. In that case failed = targets - saves.
  const allTargets = TFRExtractWorkflowTargetRefsFromKeys(workflow, ["targets", "hitTargets", "saveTargets", "workflowOptions.targets"]);
  const saved = TFRExtractWorkflowTargetRefsFromKeys(workflow, ["saves", "successfulSaves", "saveResults.saves", "saveResults.successes"]);
  if (allTargets.length && saved.length) {
    const savedKeys = new Set(saved.map(r => r.token?.id || r.tokenDocument?.id || r.actor?.id || r.actor?.uuid || r.actor?.name).filter(Boolean));
    const failedByDiff = allTargets.filter(r => !savedKeys.has(r.token?.id || r.tokenDocument?.id || r.actor?.id || r.actor?.uuid || r.actor?.name));
    return { readable: true, failed: failedByDiff };
  }

  return { readable: false, failed: [] };
}

export async function TFRApplyConditionSpecToRefs(sourceActor, relic, item, def, spec, refs, { source = "save-aware" } = {}) {
  const applied = [];
  const changes = foundry.utils.deepClone(spec.extraTargetChanges || []);
  for (const ref of refs || []) {
    if (!ref?.actor) continue;
    await TFRApplyStatusCondition(sourceActor, ref.token || ref.actor, item, spec.condition, spec.targetName || `${def?.name || "Relic Save"} — ${relic?.name || "Relic"}`, spec.rounds || 10, spec.seconds || 60, changes, { expireOnTurnEnd: !!spec.expireOnTurnEnd });
    if (spec.alsoProne) await TFRApplyStatusCondition(sourceActor, ref.token || ref.actor, item, "prone", "Prone — The World Shall Kneel", spec.rounds || 10, spec.seconds || 60, [], { expireOnTurnEnd: !!spec.expireOnTurnEnd });
    applied.push(ref.actor.name);
  }
  return applied;
}

