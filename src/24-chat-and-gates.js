async function TFRLogRelicTimelineSafe(relicId, entry) {
  if (typeof TFRAutomation?.logTimeline === "function") {
    return await TFRAutomation.logTimeline(relicId, entry);
  }

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
}









function TFRChatMessagePlainText(message) {
  const content = String(message?.content || "");
  try {
    const div = document.createElement("div");
    div.innerHTML = content;
    return (div.textContent || div.innerText || content).trim();
  } catch (err) {
    return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

function TFRActorFromChatMessage(message) {
  const speaker = message?.speaker || {};
  if (speaker.actor) {
    const actor = game.actors?.get?.(speaker.actor);
    if (actor) return actor;
  }

  const flagActorId = foundry.utils.getProperty(message, "flags.dnd5e.actor.id")
    || foundry.utils.getProperty(message, "flags.dnd5e.actor._id")
    || foundry.utils.getProperty(message, "flags.dnd5e.actorId")
    || foundry.utils.getProperty(message, "flags.dnd5e.roll.actorId");
  if (flagActorId) {
    const actor = game.actors?.get?.(flagActorId);
    if (actor) return actor;
  }

  // dnd5e v5 can produce compact item cards where the speaker actor is missing.
  // Fall back to the selected token, then to a unique actor whose embedded relic item is named in the card.
  const haystack = TFRNormalizeChatHaystack(message);
  const selected = TFRSelectedToken();
  if (selected?.actor?.items?.some?.(i => i.getFlag?.(TFR_MODULE_ID, "relicId") && TFRChatMentionsRelicItem(message, selected.actor, i.getFlag(TFR_MODULE_ID, "relicId"), i, haystack))) {
    return selected.actor;
  }

  const candidates = [];
  for (const token of canvas?.tokens?.controlled || []) {
    const actor = token?.actor;
    if (!actor || candidates.includes(actor)) continue;
    if (actor.items?.some?.(i => i.getFlag?.(TFR_MODULE_ID, "relicId") && TFRChatMentionsRelicItem(message, actor, i.getFlag(TFR_MODULE_ID, "relicId"), i, haystack))) candidates.push(actor);
  }
  for (const actor of game.actors?.contents || []) {
    if (!actor || candidates.includes(actor)) continue;
    if (actor.items?.some?.(i => i.getFlag?.(TFR_MODULE_ID, "relicId") && TFRChatMentionsRelicItem(message, actor, i.getFlag(TFR_MODULE_ID, "relicId"), i, haystack))) candidates.push(actor);
  }

  return candidates.length === 1 ? candidates[0] : null;
}

function TFRTokenFromChatMessage(message, actor = null) {
  const speaker = message?.speaker || {};

  if (speaker.scene === canvas?.scene?.id && speaker.token) {
    const token = canvas?.tokens?.get?.(speaker.token);
    if (token) return token;
  }

  const selected = TFRSelectedToken();
  if (selected && (!actor || selected.actor?.id === actor.id || selected.actor?.name === actor.name)) return selected;

  const controlled = (canvas?.tokens?.controlled || []).find(t =>
    actor && (t.actor?.id === actor.id || t.actor?.name === actor.name)
  );
  if (controlled) return controlled;

  const active = actor?.getActiveTokens?.(true, true) || actor?.getActiveTokens?.() || [];
  for (const candidate of active) {
    const token = candidate?.object || candidate;
    if (!token) continue;
    if (!canvas?.scene || token.scene?.id === canvas.scene.id || token.document?.parent?.id === canvas.scene.id) return token;
  }

  return null;
}

const TFR_CLOAK_ABILITY_SLOTS_BY_LABEL = {
  "fey step": "active1",
  "arrow of the first hunt": "active2",
  "nature's pursuit": "active3",
  "natures pursuit": "active3",
  "briar snare": "active4",
  "avatar of the hunt": "avatar",
  "avatar of the first hunt": "avatar",
  "signature of the hunt": "signature",
  "blessing of sylvara": "signature"
};

function TFRGetActivityItem(activity) {
  return activity?.item || activity?.parent || activity?.document?.item || null;
}

function TFRGetActivitySlot(activity, fallbackName = "") {
  const data = activity?.toObject ? activity.toObject() : activity;
  const flagSlot = activity?.getFlag?.(TFR_MODULE_ID, "slot") || data?.flags?.[TFR_MODULE_ID]?.slot;
  if (flagSlot) return flagSlot;
  const id = data?._id || activity?.id || activity?._id;
  if (TFR_ACTIVITY_SLOTS.includes(id)) return id;
  const label = String(data?.name || activity?.name || fallbackName || "").trim().toLowerCase();
  return TFR_CLOAK_ABILITY_SLOTS_BY_LABEL[label] || null;
}

function TFRLockedRelicActivityInfo(item, slot, label = "Relic ability") {
  const relicId = item?.getFlag?.(TFR_MODULE_ID, "relicId") || item?.flags?.[TFR_MODULE_ID]?.relicId;
  if (!item || !relicId || !slot) return null;
  const stage = TFRRelicItemStage(item);
  const signatureUnlocked = TFRRelicItemSignatureUnlocked(item);
  if (TFRIsAbilitySlotUnlocked(stage, slot, signatureUnlocked)) return null;
  const required = slot === "signature" ? "Signature unlock / 1000 affinity" : `${TFRStageTitle(TFRRequiredStageForSlot(slot))} stage`;
  return { item, relicId, slot, label, stage, required };
}

function TFRWarnLockedRelicActivity(info) {
  if (!info) return;
  ui.notifications.warn(TFRT("{infoLabel} is locked. {itemName} is currently {value}; required: {required}.", { infoLabel: info.label, itemName: info.item.name, value: TFRStageTitle(info.stage), required: info.required }));
}

function TFRBlockLockedActivity(activity, ...args) {
  const item = TFRGetActivityItem(activity);
  const slot = TFRGetActivitySlot(activity);
  const label = activity?.name || "Relic ability";
  if (TFRBlockRelicFeatureUse(item, label)) return false;
  const info = TFRLockedRelicActivityInfo(item, slot, label);
  if (!info) return true;
  TFRWarnLockedRelicActivity(info);
  return false;
}

function TFRRegisterRelicActivityGateHooks() {
  const hooks = [
    "dnd5e.preUseActivity",
    "dnd5e.preActivityUse",
    "dnd5e.preRollActivity"
  ];
  for (const hook of hooks) Hooks.on(hook, TFRBlockLockedActivity);

  // dnd5e 5 opens ActivityChoiceDialog (ApplicationV2) for items with several activities;
  // renderDialog is kept for older Dialog-based choosers.
  Hooks.on("renderActivityChoiceDialog", (app, html) => {
    const item = app?.item;
    if (!item || !TFR_CLOAK_ITEM_NAMES.has(String(item.name || "").trim())) return;
    TFRLockCloakChoiceButtons(TFRSheetHtmlElement(html), item, "[data-activity-id] .name");
  });

  Hooks.on("renderDialog", (app, html) => {
    const root = TFRSheetHtmlElement(html);
    if (!root) return;
    const title = String(app?.title || "").trim();
    if (!TFR_CLOAK_ITEM_NAMES.has(title)) return;

    const actor = TFRResolveActor(null);
    const item = TFRGetActorRelicItem(actor, "cloak_feywilds");
    if (!item) return;
    TFRLockCloakChoiceButtons(root, item, "button");
  });
}

function TFRLockCloakChoiceButtons(root, item, labelSelector) {
  if (!root) return;
  for (const button of root.querySelectorAll("button")) {
    const labelElement = labelSelector === "button" ? button : button.querySelector(".name");
    const label = String(labelElement?.textContent || "").trim();
    // Prefer the activity's own slot flag; fall back to the (possibly translated) label.
    const activity = button.dataset.activityId ? item.system?.activities?.get?.(button.dataset.activityId) : null;
    const slot = (activity && TFRGetActivitySlot(activity, label)) || TFR_CLOAK_ABILITY_SLOTS_BY_LABEL[label.toLowerCase()];
    if (slot && TFRRelicFeaturesAreBlocked(item)) {
      button.disabled = true;
      button.classList.add("tfr-locked-activity");
      button.title = "Unavailable: the relic refuses attunement.";
      continue;
    }
    const info = TFRLockedRelicActivityInfo(item, slot, label);
    if (!info) continue;
    button.disabled = true;
    button.classList.add("tfr-locked-activity");
    button.title = `Locked: requires ${info.required}.`;
  }
}

function TFRLooksLikeFeyStepChatMessage(message, actor = null) {
  if (!message) return false;
  if (message.getFlag?.(TFR_MODULE_ID, "feyStepAutomationHandled")) return false;

  const text = TFRChatMessagePlainText(message).toLowerCase();
  let flagText = "";
  try { flagText = JSON.stringify(message.flags || {}).toLowerCase(); } catch (err) {}

  const actorHasCloak = !!TFRFindActorRelicItem(actor, "cloak_feywilds") || !!actor?.items?.find?.(TFRIsCloakItem);
  if (!actorHasCloak) return false;

  const cloakNames = [...TFR_CLOAK_ITEM_NAMES].map(name => name.toLowerCase());
  const namesRelic = cloakNames.some(name => text.includes(name) || flagText.includes(name))
    || flagText.includes("cloak_feywilds");
  const namesAbility = [...TFR_FEY_STEP_NAMES].some(name => text.includes(name) || flagText.includes(name));
  const looksLikeTeleport = (text.includes("60 ft") || text.includes("60ft") || flagText.includes("60"))
    && (text.includes("1 space") || text.includes("space") || flagText.includes("space"));

  return (namesRelic && looksLikeTeleport) || namesAbility;
}

function TFRCloakAbilityIdFromChatMessage(message, actor = null) {
  if (!message) return null;
  if (message.getFlag?.(TFR_MODULE_ID, "tfrAutomationMessage")) return null;
  if (message.getFlag?.(TFR_MODULE_ID, "cloakAbilityAutomationHandled")) return null;

  const text = TFRChatMessagePlainText(message).toLowerCase();
  let flagText = "";
  try { flagText = JSON.stringify(message.flags || {}).toLowerCase(); } catch (err) {}

  const actorHasCloak = !!TFRFindActorRelicItem(actor, "cloak_feywilds") || !!actor?.items?.find?.(TFRIsCloakItem);
  if (!actorHasCloak) return null;

  const haystack = `${text} ${flagText}`;
  if (haystack.includes("fey step")) return "feyStep";
  if (haystack.includes("arrow of the first hunt")) return "arrowFirstHunt";
  if (haystack.includes("nature's pursuit") || haystack.includes("natures pursuit")) return "naturesPursuit";
  if (haystack.includes("briar snare") || haystack.includes("verdant snare")) return "verdantSnare";
  if (haystack.includes("avatar of the first hunt") || haystack.includes("avatar of the hunt")) return "avatar";
  if (haystack.includes("signature of the hunt") || haystack.includes("blessing of sylvara")) return "signature";
  return null;
}

function TFRCloakAbilitySlotFromId(abilityId) {
  return {
    feyStep: "active1",
    arrowFirstHunt: "active2",
    naturesPursuit: "active3",
    verdantSnare: "active4",
    avatar: "avatar",
    signature: "signature"
  }[abilityId] || null;
}

function TFRRegisterFeyStepChatAutomation() {
  Hooks.on("createChatMessage", async (message, options, userId) => {
    if (!game.user?.isGM) return;
    if (message.getFlag?.(TFR_MODULE_ID, "tfrAutomationMessage")) return;

    const actor = TFRActorFromChatMessage(message);
    if (!actor) return;

    const abilityId = TFRCloakAbilityIdFromChatMessage(message, actor);
    if (abilityId) {
      try { await message.setFlag(TFR_MODULE_ID, "cloakAbilityAutomationHandled", true); } catch (err) {}

      if (abilityId === "feyStep") {
        if (!TFRLooksLikeFeyStepChatMessage(message, actor)) return;

        try { await message.setFlag(TFR_MODULE_ID, "feyStepAutomationHandled", true); } catch (err) {}

        const token = TFRTokenFromChatMessage(message, actor);
        if (!token) {
          ui.notifications.warn(TFRT("Fey Step: no source token for {actorName} on the scene. Select a token and use GM Dashboard > Control Panel > Fey Step.", { actorName: actor.name }));
          return;
        }

        const tokenKey = TFRFeyStepTokenKey(token, actor);
        if (TFRIsFeyStepInFlight(tokenKey) || TFRIsRecentFeyStep(tokenKey)) return;

        // The dnd5e item/activity workflow already consumed the card resource before this hook runs.
        // Avoid double-spending charges here; the dashboard button still consumes normally.
        await TFRExecuteFeyStep({ token, consumeCharges: false, chatMessageId: message.id });
        return;
      }

      // Sheet/card uses for other Cloak abilities should do the same helper work as the Control Panel,
      // but dnd5e has already consumed the resource by the time this chat card exists.
      const cloakSlot = TFRCloakAbilitySlotFromId(abilityId);
      const cloakRelic = cloakSlot ? await TFRGetRelicById("cloak_feywilds") : null;
      const cloakSpec = cloakSlot ? TFRRelicAbilityRuntimeSpec("cloak_feywilds", cloakSlot) : {};
      if (cloakRelic && TFRShouldPreferNativeActivityEffects(cloakRelic, cloakSlot, { fromChatCard: true, message }) && TFRRuntimeWorkCoveredByNativeEffects(cloakSpec)) {
        await TFRLogRelicTimelineSafe("cloak_feywilds", {
          type: "Native Activity Effect",
          slot: cloakSlot,
          actor: actor.name,
          activity: abilityId,
          reason: `${actor.name} used ${abilityId}. Effects are available on the native dnd5e chat card.`
        });
        return;
      }
      await TFRUseCloakAbility(actor, abilityId, { spendCharges: false, fromChatCard: true, message });
      return;
    }

    const generic = TFRRelicAbilityFromChatMessage(message, actor);
    if (!generic) return;
    try { await message.setFlag(TFR_MODULE_ID, "genericRelicAutomationHandled", true); } catch (err) {}
    await TFRUseRelicAbility(actor, generic.relicId, generic.slot, { spendCharges: false, fromChatCard: true, message });
  });
}


