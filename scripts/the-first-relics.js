
const TFR_MODULE_ID = "the-first-relics";
const TFR_VERSION = "1.1.9";
const TFR_ATTUNEMENT_REFUSAL_FLAG = "refusesAttunement";
const TFR_FINAL_FORM_BONUS = 5;
const TFR_FINAL_FORM_CHARGES = 15;
const TFR_CLOAK_DISPLAY_NAME = "Cloak of Fey Paths";
const TFR_CLOAK_LEGACY_NAMES = new Set(["Cloak of Verdant Paths", "Cloak of Feywilds"]);
const TFR_CLOAK_ITEM_NAMES = new Set([TFR_CLOAK_DISPLAY_NAME, ...TFR_CLOAK_LEGACY_NAMES]);
const TFR_STAGES = ["dormant", "awakened", "exalted"];
const TFR_ACTIVITY_SLOTS = ["active1", "active2", "active3", "active4", "avatar", "signature"];
const TFR_FEY_STEP_DEBOUNCE_MS = 1800;
const TFR_FEY_STEP_RECENT = new Map();
const TFR_FEY_STEP_IN_FLIGHT = new Set();
let TFR_DASHBOARD_LAST_TAB = "overview";
const TFR_SAVE_AWARE_PENDING = new Map();
const TFR_SAVE_AWARE_TIMEOUT_MS = 60000;
const TFR_SAVE_AWARE_NATIVE_DELAY_MS = 1200;
const TFR_SAVE_AWARE_WORKFLOW_CACHE_MS = 15000;
const TFR_SAVE_AWARE_WORKFLOWS = [];
// v1.1.6: Final Form grants +5 universal relic bonuses and raises maximum charges to 15.
// v1.1.5: 1000 Affinity unlocks Final Form and raises universal relic bonuses to +4.
// v1.1.4: Preserve and restore the exact world relic state around Playtest Lab runs.
// v1.1.3: Create-validate-delete relic rebuilds with rollback and release safety checks.
// v1.1.2: True names stay sealed in item descriptions until 1000 Affinity.
// v1.1.1: Refusing relics suppress passive bonuses and block all activity/helper use.
// v1.1.0: GM-controlled sentient relic attunement refusal and hard attunement gate.
// v1.0.1: Cloak of Fey Paths display-name update with legacy-name migration.
// v1.0.0: Stable release promotion and final release readiness check.
// v0.25.0: Release candidate readiness check and final version alignment.
// v0.24.2: Dashboard QA result summaries and expanded health check.
// v0.24.1: Relic-by-relic text cleanup and cleanup audit.
// v0.24.0: Playtest health check combines diagnostics, QA, runtime, and lab audits.
// v0.23.19: Runtime coverage audit compares definitions, generated activities, and helper specs.
// v0.23.18: Manual reminder helper cards and QA labels are easier to scan.
// v0.23.17: Manual-only powers now emit helper reminder chat cards.
// v0.23.16: Stage bar now ticks the current stage, including Exalted.
// v0.23.15: Test Lab actor relics now rebuild full stage/signature activities.
// v0.23.14: Detailed Activity Audit now reports current item stage coverage.
// v0.23.13: Clarified QA matrix coverage labels for native damage/healing/save work.
// v0.23.12: Added 12-relic QA matrix audit for build-level automation coverage.
// v0.23.11: Centered GM dashboard Control Panel action card content.
// v0.23.10: Streamlined dashboard layout. Control Panel shows World Setup,
// Test Lab, Audits, and Selected Relic actions with retired dashboard tools
// removed from the visible GM workflow.
// v0.23.9: Dashboard cleanup. Dreams, Memories, Chronicle, and Progression are
// no longer shown in the GM dashboard; Control Panel V2 groups actions by job.
// v0.23.8: Native coverage pass. Marker effects live in the dnd5e effect tray,
// mixed damage/teleport activities keep creature targeting, and native audits use
// the full 12-relic activity definition set.
// v0.23.7: Native dnd5e activity effects. ActiveEffects are stored on the item,
// and activities reference them by ID so Save / Apply Effect live on the same
// dnd5e chat card. Preserves v0.23.5 No Sheet Pop-up Fix:
// Actor/item sheets are refreshed only if they are
// already open; Test Lab generation and relic rebuilds should not force closed
// character sheets onto the canvas/main screen.
// v0.23.4: Safe Foundry-style resolver. The normal dnd5e/Midi save roll is left
// alone, and the module never applies failed-save conditions automatically.
// After the save is rolled, the GM targets the failed creature(s) and presses the
// resolver button, similar to applying an effect from a Foundry chat card.
const TFR_SAVE_AWARE_AUTO_APPLY = false;

function TFRNotify(level, message) {
  const text = String(message ?? "");
  const method = ui?.notifications?.[level] || ui?.notifications?.info;
  if (typeof method !== "function") {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "info"](text);
    return;
  }

  try {
    method.call(ui.notifications, text);
  } catch (err) {
    console.warn(`The First Relics notification failed (${level}): ${text}`, err);
  }
}

const TFRNotifyInfo = message => TFRNotify("info", message);
const TFRNotifyWarn = message => TFRNotify("warn", message);
const TFRNotifyError = message => TFRNotify("error", message);


async function TFRLoadRelics() {
  const response = await fetch("modules/the-first-relics/data/relics.json");
  return response.json();
}

function TFRMode(name) {
  return CONST.ACTIVE_EFFECT_MODES[name];
}

function TFRActivityId(index) {
  return `TFR${String(index).padStart(13, "0")}`.slice(0, 16);
}

function TFRStageTitle(stage) {
  return stage[0].toUpperCase() + stage.slice(1);
}

function TFRIsFinalForm(stage, signatureUnlocked = false) {
  return stage === "exalted" && !!signatureUnlocked;
}

function TFRGetStageData(relic, stage, signatureUnlocked = false) {
  const stageData = relic.stages[stage] ?? relic.stages.dormant;
  if (!TFRIsFinalForm(stage, signatureUnlocked)) return stageData;
  return {
    ...stageData,
    title: "Final Form",
    bonus: TFR_FINAL_FORM_BONUS,
    charges: TFR_FINAL_FORM_CHARGES
  };
}

function TFRDisplayStage(stage, signatureUnlocked = false) {
  return TFRIsFinalForm(stage, signatureUnlocked) ? "final form" : stage;
}


function TFRAttunementForStage(stage) {
  // dnd5e uses "required" for attunement-required items.
  // Empty string is the safest no-attunement value for item data.
  return stage === "exalted" ? "" : "required";
}

function TFRAttunementText(stage) {
  return stage === "exalted"
    ? "The relic has become part of its bearer and no longer requires attunement."
    : "This relic requires attunement.";
}


function TFRBaseChanges(stageData) {
  const b = stageData.bonus;
  return [
    { key: "system.attributes.ac.bonus", mode: TFRMode("ADD"), value: String(b), priority: 20 },
    { key: "system.bonuses.abilities.save", mode: TFRMode("ADD"), value: `+${b}`, priority: 20 },
    { key: "system.bonuses.spell.dc", mode: TFRMode("ADD"), value: `+${b}`, priority: 20 },
    { key: "system.bonuses.msak.attack", mode: TFRMode("ADD"), value: `+${b}`, priority: 20 },
    { key: "system.bonuses.rsak.attack", mode: TFRMode("ADD"), value: `+${b}`, priority: 20 },
    { key: "system.bonuses.mwak.attack", mode: TFRMode("ADD"), value: `+${b}`, priority: 20 },
    { key: "system.bonuses.rwak.attack", mode: TFRMode("ADD"), value: `+${b}`, priority: 20 },
    { key: "system.bonuses.mwak.damage", mode: TFRMode("ADD"), value: `+${b}`, priority: 20 },
    { key: "system.bonuses.rwak.damage", mode: TFRMode("ADD"), value: `+${b}`, priority: 20 }
  ];
}

function TFRActivity({ id, name, img, charges = 0, activation = "action", desc = "", duration = null }) {
  const a = {
    type: "utility",
    _id: id,
    name,
    img,
    sort: 0,
    activation: { type: activation, override: false },
    consumption: {
      scaling: { allowed: false },
      spellSlot: false,
      targets: charges > 0 ? [{ type: "itemUses", value: String(charges), scaling: {} }] : []
    },
    description: { chatFlavor: desc },
    duration: { units: duration?.units ?? "inst", concentration: false, override: false },
    effects: [],
    flags: {},
    range: { units: "self", override: false },
    target: {
      template: { contiguous: false, stationary: false, units: "ft" },
      affects: { choice: false },
      override: false,
      prompt: true
    },
    uses: { spent: 0, recovery: [] },
    visibility: { level: {}, requireAttunement: false, requireIdentification: false, requireMagic: false },
    roll: { prompt: false, visible: false },
    useConditionText: "",
    useConditionReason: "",
    effectConditionText: "",
    macroData: {},
    ignoreTraits: { idi: false, idr: false, idv: false, ida: false, idm: false },
    midiProperties: {
      ignoreTraits: [],
      triggeredActivityId: "none",
      triggeredActivityConditionText: "",
      triggeredActivityTargets: "targets",
      triggeredActivityRollAs: "self",
      triggeredActivityConsume: true,
      triggeredActivityConfigure: true,
      autoConsume: true,
      forceConsumeDialog: "default",
      forceRollDialog: "default",
      forceDamageDialog: "default",
      confirmTargets: "default",
      autoTargetType: "any",
      autoTargetAction: "default",
      automationOnly: false,
      otherActivityCompatible: true,
      otherActivityAsParentType: true,
      identifier: "",
      displayActivityName: false,
      rollMode: "default",
      chooseEffects: false,
      toggleEffect: false,
      ignoreFullCover: false,
      removeChatButtons: "default",
      magicEffect: false,
      magicDamage: false,
      noConcentrationCheck: false,
      skipConcentrationCheck: false,
      autoCEEffects: "default"
    },
    isOverTimeFlag: false,
    overTimeProperties: { saveRemoves: true, rollAs: "target", preRemoveConditionText: "", postRemoveConditionText: "" },
    otherActivityId: "none",
    otherActivityAsParentType: true
  };
  if (duration?.value !== undefined) a.duration.value = String(duration.value);
  return a;
}


function TFRDamageTypeForRelic(relic) {
  const map = {
    "cloak_feywilds": "force",
    "cloak_shadowfell": "necrotic",
    "mantle_first_seer": "psychic",
    "manacles_unbroken": "force",
    "lyre_first_song": "thunder",
    "vestments_first_saint": "radiant",
    "heart_yggdrasil": "poison",
    "crown_conqueror": "force",
    "bands_inner_dragon": "force",
    "aegis_dawn": "radiant",
    "blood_first_dragon": "fire",
    "chains_patron": "necrotic"
  };
  return map[relic.id] ?? "force";
}

function TFRMakeDamageActivity(activity, relic, number = 4, denomination = 8, forcedType = null) {
  const dtype = forcedType || TFRDamageTypeForRelic(relic);
  activity.type = "damage";
  delete activity.roll;
  activity.damage = {
    critical: { bonus: "", allow: true },
    includeBase: false,
    parts: [{
      number,
      denomination,
      bonus: "",
      types: [dtype],
      scaling: { mode: "", number: 1 },
      custom: { enabled: false }
    }]
  };
  activity.description.chatFlavor = `${activity.description.chatFlavor}<br><strong>Automation:</strong> This activity rolls ${number}d${denomination} ${dtype} damage. Apply secondary conditions manually if needed.`;
  activity.macroData = {};
  activity.midiProperties.magicDamage = true;
  activity.midiProperties.magicEffect = true;
  activity.midiProperties.autoConsume = true;
  return activity;
}

function TFRAvatarEffect(relic) {
  return {
    name: `${relic.name} - Avatar Helper`,
    img: relic.icon,
    transfer: false,
    disabled: true,
    changes: [
      { key: "system.attributes.movement.fly", mode: TFRMode("UPGRADE"), value: "40", priority: 20 },
      { key: "system.attributes.movement.hover", mode: TFRMode("OVERRIDE"), value: "true", priority: 20 },
      { key: "system.bonuses.abilities.save", mode: TFRMode("ADD"), value: "+1", priority: 20 }
    ],
    duration: { seconds: 60, rounds: 10 },
    flags: { dae: { transfer: false, stackable: "noneName", specialDuration: [] } }
  };
}



function TFRStageBar(stage) {
  const stages = [
    { key: "dormant", label: "Dormant" },
    { key: "awakened", label: "Awakened" },
    { key: "exalted", label: "Exalted" }
  ];
  const currentIndex = Math.max(0, stages.findIndex(s => s.key === stage));
  return `
  <div class="tfr-stage-bar">
    ${stages.map((s, i) => {
      const unlocked = i <= currentIndex;
      const classes = unlocked ? `complete${i === currentIndex ? " current" : ""}` : "locked";
      return `
      <div class="tfr-stage-pill ${classes}">
        ${unlocked ? "&#10003;" : "&#9633;"} ${s.label}
      </div>
    `;
    }).join("")}
  </div>`;
}

function TFRMysteryLocked(stage) {
  if (stage === "dormant") {
    return `
      <li class="tfr-locked"><strong>Awakened Power.</strong> The relic has not yet revealed this ability.</li>
      <li class="tfr-locked"><strong>Awakened Power.</strong> The relic remains silent.</li>
      <li class="tfr-locked"><strong>Exalted Avatar.</strong> The relic's true form is still hidden.</li>
      <li class="tfr-locked"><strong>Signature Ability.</strong> This legend has not yet awakened.</li>
    `;
  }
  if (stage === "awakened") {
    return `
      <li class="tfr-locked"><strong>Exalted Avatar.</strong> The relic's true form is still hidden.</li>
      <li class="tfr-locked"><strong>Signature Ability.</strong> This legend has not yet awakened.</li>
    `;
  }
  return "";
}

function TFRRelicKnowledgeCap(stage, signatureUnlocked = false) {
  if (signatureUnlocked) return 1000;
  if (stage === "exalted") return 999;
  if (stage === "awakened") return 749;
  return 299;
}

function TFRRelicKnowledgeFloor(stage, signatureUnlocked = false) {
  if (signatureUnlocked) return 1000;
  if (stage === "exalted") return 750;
  if (stage === "awakened") return 300;
  return 0;
}

function TFRTrueNameTokens(relic) {
  return Array.from(new Set([
    relic?.trueName?.full,
    relic?.trueName?.name,
    relic?.trueName?.title
  ].filter(value => typeof value === "string" && value.trim()).map(value => value.trim())))
    .sort((a, b) => b.length - a.length);
}

function TFREscapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function TFRTrueNameLeaks(relic, text) {
  const source = String(text || "");
  return TFRTrueNameTokens(relic).filter(token => new RegExp(TFREscapeRegExp(token), "i").test(source));
}

function TFRSealTrueNameText(relic, text, signatureUnlocked = false) {
  let sealed = String(text || "");
  if (signatureUnlocked) return sealed;
  for (const token of TFRTrueNameTokens(relic)) {
    sealed = sealed.replace(new RegExp(TFREscapeRegExp(token), "gi"), "[True Name Sealed]");
  }
  return sealed;
}

function TFRRelicCurrentMoodEntry(relic, stage, signatureUnlocked = false) {
  const floor = TFRRelicKnowledgeFloor(stage, signatureUnlocked);
  const entries = Array.isArray(relic?.moodMap) ? relic.moodMap : [];
  return entries.find(entry => Number(entry.min) <= floor && Number(entry.max) >= floor)
    || entries.filter(entry => Number(entry.min) <= floor).sort((a, b) => Number(b.min) - Number(a.min))[0]
    || null;
}

function TFRRelicPlayerMoodEntries(relic, stage, signatureUnlocked = false) {
  const cap = TFRRelicKnowledgeCap(stage, signatureUnlocked);
  return (Array.isArray(relic?.moodMap) ? relic.moodMap : [])
    .filter(entry => Number(entry.min) <= cap)
    .sort((a, b) => Number(a.min) - Number(b.min));
}

function TFRRelicMoodHtml(relic, stage, signatureUnlocked = false) {
  const current = TFRRelicCurrentMoodEntry(relic, stage, signatureUnlocked);
  if (!current) return "";

  return `
    <h3>Revealed Relic Signs</h3>
    <p><strong>Current Presence:</strong> ${current.mood}</p>
    <p><em>${TFRSealTrueNameText(relic, current.description, signatureUnlocked)}</em></p>
  `;
}

function TFRRelicUnlockedAppearanceEntries(relic, stage, signatureUnlocked = false) {
  const lore = relic?.lore || {};
  const stageRank = stage === "exalted" ? 2 : stage === "awakened" ? 1 : 0;
  return [
    { label: "Dormant", text: lore.appearanceDormant, unlocked: stageRank >= 0 },
    { label: "Awakened", text: lore.appearanceAwakened, unlocked: stageRank >= 1 },
    { label: "Exalted", text: lore.appearanceExalted, unlocked: stageRank >= 2 },
    { label: "Final Form", text: lore.appearanceSignature, unlocked: TFRIsFinalForm(stage, signatureUnlocked) }
  ].filter(entry => entry.unlocked && entry.text);
}

function TFRRelicAppearanceHtml(relic, stage, signatureUnlocked = false) {
  const entries = TFRRelicUnlockedAppearanceEntries(relic, stage, signatureUnlocked);
  if (!entries.length) return "";
  return `
    <h3>Revealed Manifestations</h3>
    <ul>${entries.map(entry => `<li><strong>${entry.label}.</strong> ${entry.text}</li>`).join("")}</ul>
  `;
}

function TFRRelicGmSecretsHtml(relic) {
  const moodRows = (Array.isArray(relic?.moodMap) ? relic.moodMap : [])
    .map(entry => `<li><strong>${entry.min}-${entry.max} ${entry.mood}.</strong> ${entry.description}</li>`)
    .join("");
  const likes = relic?.personality?.likes?.length ? `<p><strong>Likes:</strong> ${relic.personality.likes.join(", ")}</p>` : "";
  const dislikes = relic?.personality?.dislikes?.length ? `<p><strong>Dislikes:</strong> ${relic.personality.dislikes.join(", ")}</p>` : "";
  const guidance = relic?.personality?.roleplayGuidance ? `<p><strong>Roleplay Guidance:</strong> ${relic.personality.roleplayGuidance}</p>` : "";
  if (!moodRows && !likes && !dislikes && !guidance) return "";

  return `
    <section class="tfr-gm-relic-notes" data-tfr-gm-notes="true">
      <h3>GM Relic Notes</h3>
      ${guidance}
      ${likes}
      ${dislikes}
      ${moodRows ? `<h4>Full Affinity Mood Map</h4><ul>${moodRows}</ul>` : ""}
    </section>
  `;
}

function TFRSheetHtmlElement(html) {
  return html?.jquery ? html[0] : html?.[0] || html;
}

function TFRRelicDescriptionRoot(element) {
  return element?.querySelector?.(".first-relics-item-description") || null;
}

function TFRRemovePlayerMoodHistory(element) {
  const root = TFRRelicDescriptionRoot(element);
  if (!root) return;
  const heading = Array.from(root.querySelectorAll("h3"))
    .find(node => node.textContent?.trim() === "Revealed Relic Signs");
  if (!heading) return;

  let node = heading.nextElementSibling;
  while (node && node.tagName !== "H3") {
    const next = node.nextElementSibling;
    if (node.tagName === "UL") node.remove();
    node = next;
  }
}

function TFRRemoveDescriptionSection(element, headingText) {
  const root = TFRRelicDescriptionRoot(element);
  if (!root) return;
  const heading = Array.from(root.querySelectorAll("h3"))
    .find(node => node.textContent?.trim() === headingText);
  if (!heading) return;

  let node = heading.nextElementSibling;
  while (node && node.tagName !== "H3") {
    const next = node.nextElementSibling;
    node.remove();
    node = next;
  }
  heading.remove();
}

function TFRAppendHtml(parent, html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  parent.appendChild(template.content);
}

function TFRIsRelicItem(item) {
  return !!(
    item?.getFlag?.(TFR_MODULE_ID, "relicId") ||
    item?.flags?.[TFR_MODULE_ID]?.relicId
  );
}

function TFRRelicRefusesAttunement(item) {
  return !!(
    item?.getFlag?.(TFR_MODULE_ID, TFR_ATTUNEMENT_REFUSAL_FLAG) ||
    item?.flags?.[TFR_MODULE_ID]?.[TFR_ATTUNEMENT_REFUSAL_FLAG]
  );
}

function TFRRelicFeaturesAreBlocked(item) {
  return TFRIsRelicItem(item) && TFRRelicRefusesAttunement(item);
}

function TFRWarnRelicFeaturesBlocked(item, label = "Relic ability") {
  TFRNotifyWarn(`${item?.name || "The relic"} refuses attunement. ${label} cannot be used until the GM allows attunement.`);
}

function TFRBlockRelicFeatureUse(item, label = "Relic ability") {
  if (!TFRRelicFeaturesAreBlocked(item)) return false;
  TFRWarnRelicFeaturesBlocked(item, label);
  return true;
}

function TFRPendingDocumentChange(changes, path) {
  if (!changes || typeof changes !== "object") return { present: false, value: undefined };
  if (Object.prototype.hasOwnProperty.call(changes, path)) {
    return { present: true, value: changes[path] };
  }
  if (foundry.utils.hasProperty(changes, path)) {
    return { present: true, value: foundry.utils.getProperty(changes, path) };
  }
  return { present: false, value: undefined };
}

function TFRNotifyAttunementRefusal(item, userId, message) {
  if (!userId || userId === game.user?.id) {
    TFRNotifyWarn(message || `${item?.name || "The relic"} refuses to attune to this bearer.`);
  }
}

function TFRBlockRefusedAttunementUpdate(item, changes = {}, options = {}, userId = null) {
  if (!TFRIsRelicItem(item)) return;

  const flagPath = `flags.${TFR_MODULE_ID}.${TFR_ATTUNEMENT_REFUSAL_FLAG}`;
  const flagDeletePath = `flags.${TFR_MODULE_ID}.-=${TFR_ATTUNEMENT_REFUSAL_FLAG}`;
  const moduleDeletePath = `flags.-=${TFR_MODULE_ID}`;
  const directFlagChange = TFRPendingDocumentChange(changes, flagPath);
  const deletesFlag = TFRPendingDocumentChange(changes, flagDeletePath).present ||
    TFRPendingDocumentChange(changes, moduleDeletePath).present;
  const flagChange = directFlagChange.present
    ? directFlagChange
    : deletesFlag
      ? { present: true, value: false }
      : { present: false, value: undefined };
  const currentRefusal = TFRRelicRefusesAttunement(item);
  const requestedRefusal = flagChange.present ? !!flagChange.value : currentRefusal;
  const updatingUser = game.users?.get?.(userId);
  const updateIsFromGm = updatingUser?.isGM ?? ((!userId || userId === game.user?.id) && !!game.user?.isGM);

  if (flagChange.present && requestedRefusal !== currentRefusal && !updateIsFromGm) {
    TFRNotifyAttunementRefusal(item, userId, "Only the GM can change a relic's attunement consent.");
    return false;
  }

  const attunedChange = TFRPendingDocumentChange(changes, "system.attuned");
  if (requestedRefusal && attunedChange.present && attunedChange.value === true) {
    TFRNotifyAttunementRefusal(item, userId);
    return false;
  }

  const attunementChange = TFRPendingDocumentChange(changes, "system.attunement");
  if (requestedRefusal && attunementChange.present && attunementChange.value !== "required") {
    TFRNotifyAttunementRefusal(item, userId, `${item.name} refuses attunement. Its magical features must remain suppressed.`);
    return false;
  }

  // If a GM or macro enables refusal directly, normalize an already-attuned item
  // in the same update even when system.attuned was not explicitly submitted.
  if (requestedRefusal && item.system?.attuned && !attunedChange.present) {
    changes["system.attuned"] = false;
  }
  if (requestedRefusal && item.system?.attunement !== "required" && !attunementChange.present) {
    changes["system.attunement"] = "required";
  }
}

function TFRNormalizeRefusedAttunementOnCreate(item, data = {}, options = {}, userId = null) {
  if (!TFRIsRelicItem(item) || !TFRRelicRefusesAttunement(item)) return;
  item.updateSource({ "system.attuned": false, "system.attunement": "required" });
}

async function TFRResolveRelicItem(itemOrUuid = null) {
  if (itemOrUuid?.documentName === "Item") return itemOrUuid;
  if (typeof itemOrUuid !== "string" || !itemOrUuid.trim()) return null;

  const worldItem = game.items?.get?.(itemOrUuid) || null;
  if (worldItem) return worldItem;

  try {
    const document = await fromUuid(itemOrUuid);
    return document?.documentName === "Item" ? document : null;
  } catch (err) {
    return null;
  }
}

async function TFRSetAttunementRefusal(itemOrUuid, refuses = true) {
  if (!game.user?.isGM) {
    TFRNotifyWarn("The First Relics: Only the GM can change a relic's attunement consent.");
    return false;
  }

  const item = await TFRResolveRelicItem(itemOrUuid);
  if (!TFRIsRelicItem(item)) {
    TFRNotifyWarn("The First Relics: Relic item not found.");
    return false;
  }

  const refusing = !!refuses;
  const update = {
    [`flags.${TFR_MODULE_ID}.${TFR_ATTUNEMENT_REFUSAL_FLAG}`]: refusing,
    "system.attunement": refusing ? "required" : TFRAttunementForStage(TFRRelicItemStage(item))
  };
  if (refusing) update["system.attuned"] = false;

  await item.update(update);
  TFRNotifyInfo(
    refusing
      ? `${item.name} now refuses attunement; its active features and passive bonuses are suppressed.`
      : `${item.name} is willing to accept attunement again.`
  );
  return item;
}

async function TFRSetRelicAttunementRefusal(relicId, refuses = true) {
  if (!game.user?.isGM) {
    TFRNotifyWarn("The First Relics: Only the GM can change a relic's attunement consent.");
    return false;
  }

  const relic = await TFRGetRelicById(relicId);
  if (!relic) {
    TFRNotifyWarn(`The First Relics: Relic not found: ${relicId}`);
    return false;
  }

  const refusing = !!refuses;
  const data = await TFRGetRelicState(relic.id);
  data.refusesAttunement = refusing;
  await TFRSetRelicState(relic.id, data);

  const copies = TFRFindAllRelicItemCopies(relic);
  const failures = [];
  for (const item of copies) {
    const update = {
      [`flags.${TFR_MODULE_ID}.${TFR_ATTUNEMENT_REFUSAL_FLAG}`]: refusing,
      "system.attunement": refusing ? "required" : TFRAttunementForStage(TFRRelicItemStage(item))
    };
    if (refusing) update["system.attuned"] = false;
    try {
      await item.update(update);
    } catch (error) {
      failures.push(item.uuid || item.name);
      console.error(`The First Relics | Could not update attunement consent for ${item.uuid || item.name}.`, error);
    }
  }

  if (failures.length) {
    TFRNotifyWarn(`${relic.name}: consent was saved, but ${failures.length} item copy/copies could not be updated.`);
  } else {
    TFRNotifyInfo(
      refusing
        ? `${relic.name} now refuses attunement; its active features and passive bonuses are suppressed. ${copies.length} item copy/copies synchronized.`
        : `${relic.name} now accepts attunement. ${copies.length} item copy/copies synchronized.`
    );
  }
  return data;
}

function TFRRegisterAttunementRefusal() {
  Hooks.on("preUpdateItem", TFRBlockRefusedAttunementUpdate);
  Hooks.on("preCreateItem", TFRNormalizeRefusedAttunementOnCreate);
}

async function TFRNormalizeRefusingRelicItems() {
  if (!game.user?.isGM) return 0;
  const items = [...(game.items?.contents || [])];
  for (const actor of game.actors?.contents || []) items.push(...(actor.items?.contents || []));

  let normalized = 0;
  const seen = new Set();
  for (const item of items) {
    if (!item?.uuid || seen.has(item.uuid) || !TFRRelicFeaturesAreBlocked(item)) continue;
    seen.add(item.uuid);
    if (!item.system?.attuned && item.system?.attunement === "required") continue;
    await item.update({ "system.attuned": false, "system.attunement": "required" });
    normalized += 1;
  }
  return normalized;
}

async function TFRApplyRelicSheetVisibility(app, html) {
  const item = app?.document || app?.item || app?.object;
  const relicId = item?.getFlag?.(TFR_MODULE_ID, "relicId");
  if (!relicId) return;
  const element = TFRSheetHtmlElement(html);
  if (!element?.querySelectorAll) return;

  TFRRemoveDescriptionSection(element, "Relic Personality");
  element
    .querySelectorAll(
      ".first-relics-item-description .secret, " +
      ".first-relics-item-description section.secret, " +
      ".first-relics-item-description .tfr-gm-relic-notes"
    )
    .forEach(node => node.remove());

  if (!game.user?.isGM) {
    TFRRemovePlayerMoodHistory(element);
    return;
  }

}

function TFRBuildDescription(relic, stage, signatureUnlocked = false) {
  const stageData = TFRGetStageData(relic, stage, signatureUnlocked);
  const b = stageData.bonus;
  const f = relic.features;
  const passives = stage === "dormant" ? f.passives.slice(0, 2) : stage === "awakened" ? f.passives.slice(0, 3) : f.passives.slice(0, 4);
  const actives = stage === "dormant" ? f.actives.slice(0, 2) : stage === "awakened" ? f.actives.slice(0, 4) : f.actives.slice(0, 4);

  const description = `
  <div class="first-relics-item-description">
    <h2>${relic.name}</h2>

    <p><em>Artifact${stage === "exalted" ? "" : `, requires attunement by a ${relic.class}`}</em></p>
    <p><strong>Attunement:</strong> ${TFRAttunementText(stage)}</p>
    <p><strong>Form:</strong> ${stageData.title}</p>
    <p><strong>Virtue:</strong> ${relic.virtue}</p>
    <p><strong>Theme:</strong> ${relic.theme}</p>
    ${relic.trueName ? `<p><strong>True Name:</strong> ${signatureUnlocked ? relic.trueName.full : "???"}</p>` : ""}
    ${TFRRelicMoodHtml(relic, stage, signatureUnlocked)}
    ${TFRRelicAppearanceHtml(relic, stage, signatureUnlocked)}

    <h3>Universal Relic Bonus</h3>
    <ul>
      <li><strong>+${b} AC</strong></li>
      <li><strong>+${b} to all saving throws</strong></li>
      <li><strong>+${b} Spell Save DC</strong>, if the bearer has Spellcasting or Pact Magic</li>
      <li><strong>+${b} spell attack rolls</strong>, if the bearer uses spell attacks</li>
      <li><strong>+${b} weapon attack and weapon damage rolls</strong>, if the bearer uses weapons or unarmed strikes</li>
    </ul>
    ${TFRIsFinalForm(stage, signatureUnlocked) ? `<p><strong>Final Form:</strong> At 1000 Affinity, perfect harmony raises every Universal Relic Bonus to <strong>+${TFR_FINAL_FORM_BONUS}</strong> and maximum charges to <strong>${TFR_FINAL_FORM_CHARGES}</strong>.</p>` : ""}

    <h3>Charges</h3>
    <p>The relic has <strong>${stageData.charges} charges</strong> and regains all expended charges daily at dawn.</p>

    <h3>Unlocked Passive Features</h3>
    <ul>${passives.map(p => `<li>${p}</li>`).join("")}</ul>

    <h3>Unlocked Active Features</h3>
    <ul>${actives.map(a => `<li>${a}</li>`).join("")}</ul>

    ${stage === "exalted" ? `
      <h3>Avatar Form</h3>
      <p>${f.avatar}</p>
      <h3>Signature Ability</h3>
      ${signatureUnlocked ? `<p>${f.signature}</p>` : `
        <p class="tfr-locked"><strong>Sealed.</strong> The relic has accepted you as its Exalted bearer, but its final power remains locked.</p>
        <p class="tfr-locked">Reach <strong>1000 Affinity</strong> to awaken the relic's true name and unlock its Signature Ability.</p>
      `}
    ` : ""}

    <h3>Use Notes</h3>
    <p><strong>Automated:</strong> charges, universal bonuses, damage rolls, and avatar helper effects.</p>
    <p><strong>Automated:</strong> charges, universal bonuses, Fey Step movement, Cloak helper effects, and Briar Snare restrained helper.</p>
    <p><strong>Manual:</strong> prone, darkness templates, forced rerolls, and complex edge cases may still require GM resolution.</p>
  </div>`;
  return TFRSealTrueNameText(relic, description, signatureUnlocked);
}


function TFRFeatureName(html) {
  if (!html) return "Relic Feature";
  const strong = String(html).match(/<strong>(.*?)<\/strong>/i);
  if (strong?.[1]) return strong[1].replace(/\.$/, "").trim();
  return String(html).replace(/<[^>]*>/g, "").split(".")[0].trim() || "Relic Feature";
}

function TFRAbilityAutomationFromDefinition(relicId, slot) {
  const relicDefs = TFRAbilityDefinitions()[relicId] || {};
  const def = relicDefs[slot];
  if (!def) {
    return {
      role: "generic-utility",
      type: "utility",
      activation: slot === "avatar" ? "bonus" : slot === "signature" ? "special" : "action",
      charges: 0,
      range: 0,
      target: "self",
      note: "No explicit activity definition found."
    };
  }

  const role = def.teleport || def.template === "mistyStep" ? "teleport"
    : def.type === "damage" ? "damage"
      : def.type === "heal" ? "healing"
        : def.type === "save" ? "save-control"
          : def.target === "self" ? "self-utility"
            : "target-utility";

  return {
    role,
    type: def.type || "utility",
    activation: def.activation || "action",
    charges: Number(def.charges || 0),
    range: Number(def.range || 0),
    target: def.target || "self",
    save: def.save || "",
    damage: def.damage || null,
    healing: def.healing || null,
    note: def.teleport ? "Teleport placement uses the module picker; native card handles cost and activity metadata." : ""
  };
}


function TFRAbilityAutomation(relicId, slot) {
  const map = {
    cloak_feywilds: {
      active1: { role: "teleport", type: "utility", activation: "bonus", charges: 1, range: 60, target: "space", note: "Native charge + range only; token movement is manual without macro." },
      active2: { role: "bonus-damage", type: "damage", activation: "special", charges: 2, range: 120, target: "creature", damage: { number: 4, denomination: 8, type: "force" }, note: "Extra force damage after ranged hit." },
      active3: { role: "self-buff", type: "utility", activation: "bonus", charges: 3, range: 0, target: "self", effect: true, note: "+10 ft movement effect." },
      active4: { role: "save-control", type: "save", activation: "action", charges: 4, range: 60, target: "creature", save: "str", note: "STR save; apply Restrained if Midi does not." },
      avatar: { role: "self-buff", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self", effect: true, note: "Avatar helper effect." },
      signature: { role: "signature-state", type: "utility", activation: "special", charges: 0, range: 0, target: "self", effect: true, note: "Signature reminder/state." }
    },
    mantle_first_seer: {
      active1: { role: "self-buff", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self", note: "Advantage on next Intelligence check; reminder utility." },
      active2: { role: "roll-modifier", type: "utility", activation: "reaction", charges: 2, range: 60, target: "creature", note: "Add/subtract relic bonus before outcome." },
      active3: { role: "reroll", type: "utility", activation: "reaction", charges: 3, range: 60, target: "creature", note: "Reroll effect; no damage." },
      active4: { role: "spell-info", type: "utility", activation: "reaction", charges: 4, range: 120, target: "creature", note: "Spell information and save advantage reminder." },
      avatar: { role: "self-buff", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self", effect: true, note: "First Seer avatar reminder/effect." },
      signature: { role: "reroll-signature", type: "utility", activation: "reaction", charges: 0, range: 120, target: "creature", note: "Chronicle Unwritten is reroll only; no damage." }
    },
    manacles_unbroken: {
      active1: { role: "self-recovery", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self", note: "End prone + temp HP; utility/reminder." },
      active2: { role: "bonus-damage", type: "damage", activation: "special", charges: 2, range: 5, target: "creature", damage: { number: 4, denomination: 8, type: "force" }, note: "Extra force damage after melee hit." },
      active3: { role: "saving-reroll", type: "utility", activation: "reaction", charges: 3, range: 0, target: "self", note: "Reroll failed STR/CON/WIS save." },
      active4: { role: "ally-protection", type: "utility", activation: "reaction", charges: 4, range: 10, target: "creature", note: "+3 AC or take movement/effect; GM resolved." },
      avatar: { role: "self-buff", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self", effect: true, note: "Unbroken avatar effect/reminder." },
      signature: { role: "death-ward-state", type: "utility", activation: "special", charges: 0, range: 0, target: "self", note: "1 HP refusal state." }
    },
    chains_patron: {
      active1: { role: "detect-pact", type: "utility", activation: "bonus", charges: 1, range: 60, target: "creature", note: "Pact/curse detection." },
      active2: { role: "bonus-damage", type: "damage", activation: "special", charges: 2, range: 120, target: "creature", damage: { number: 4, denomination: 8, type: "necrotic" }, note: "Extra necrotic damage." },
      active3: { role: "save-control", type: "save", activation: "action", charges: 3, range: 60, target: "creature", save: "str", note: "STR save; apply Restrained if Midi does not." },
      active4: { role: "saving-reroll-cost", type: "utility", activation: "reaction", charges: 4, range: 0, target: "self", note: "Take necrotic self-cost to reroll save." },
      avatar: { role: "self-buff", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self", effect: true, note: "Pact avatar effect/reminder." },
      signature: { role: "save-control-signature", type: "save", activation: "action", charges: 0, range: 60, target: "creature", save: "cha", note: "CHA save against Price of Eternity." }
    }
  };
  return {
    ...TFRAbilityAutomationFromDefinition(relicId, slot),
    ...(map[relicId]?.[slot] || {})
  };
}



function TFRMakeSaveActivity(activity, relic, ability = "str") {
  activity.type = "save";
  delete activity.damage;
  activity.roll = { prompt: true, visible: true };
  activity.save = activity.save || {};
  activity.save.ability = ability;
  activity.save.dc = {
    calculation: "spellcasting",
    formula: ""
  };
  activity.macroData = {};
  activity.midiProperties = activity.midiProperties || {};
  activity.midiProperties.magicDamage = false;
  activity.midiProperties.magicEffect = true;
  activity.midiProperties.autoConsume = true;
  activity.midiProperties.automationOnly = false;
  return activity;
}


function TFRMakeUtilityActivity(activity) {
  activity.type = "utility";
  delete activity.damage;
  activity.roll = { prompt: false, visible: false };
  activity.macroData = {};
  if (activity.midiProperties) {
    activity.midiProperties.magicDamage = false;
    activity.midiProperties.magicEffect = true;
    activity.midiProperties.autoConsume = true;
    activity.midiProperties.automationOnly = false;
  }
  return activity;
}


function TFRApplyActivityTargeting(activity, relic, slot) {
  const cfg = TFRAbilityAutomation(relic.id, slot);
  activity.range = activity.range || { units: "self", override: false };
  activity.target = activity.target || {
    template: { contiguous: false, stationary: false, units: "ft" },
    affects: { choice: false },
    override: false,
    prompt: true
  };
  if (cfg.target === "self") {
    activity.range = { units: "self", override: false };
    activity.target.prompt = false;
    activity.target.affects = { type: "self", count: "1", choice: false };
    activity.target.template = { contiguous: false, stationary: false, units: "ft" };
    return activity;
  }
  if (cfg.target === "space") {
    activity.range = { value: String(cfg.range || 0), units: "ft", override: false };
    activity.target.prompt = true;
    activity.target.affects = { type: "space", count: "1", choice: false };
    activity.target.template = { contiguous: false, stationary: false, units: "ft" };
    return activity;
  }
  if (cfg.target === "creature") {
    activity.range = { value: String(cfg.range || 5), units: "ft", override: false };
    activity.target.prompt = true;
    activity.target.affects = { type: "creature", count: "1", choice: false };
    activity.target.template = { contiguous: false, stationary: false, units: "ft" };
    return activity;
  }
  return activity;
}



function TFREnforceActivity(activity, relic, slot) {
  const cfg = TFRAbilityAutomation(relic.id, slot);
  activity.activation = activity.activation || {};
  activity.activation.type = cfg.activation || activity.activation.type || "action";

  activity.consumption = activity.consumption || {};
  activity.consumption.scaling = activity.consumption.scaling || { allowed: false };
  activity.consumption.spellSlot = false;
  activity.consumption.targets = cfg.charges > 0 ? [{ type: "itemUses", value: String(cfg.charges), scaling: {} }] : [];

  if (cfg.type === "damage") {
    TFRMakeDamageActivity(activity, relic, cfg.damage?.number || 4, cfg.damage?.denomination || 8, cfg.damage?.type);
    return TFRApplyActivityTargeting(activity, relic, slot);
  }

  if (cfg.type === "save") {
    TFRMakeSaveActivity(activity, relic, cfg.save || "str");
    return TFRApplyActivityTargeting(activity, relic, slot);
  }

  TFRMakeUtilityActivity(activity);
  return TFRApplyActivityTargeting(activity, relic, slot);
}


function TFRCloakItemEffect(slot, relic, itemName = "") {
  const img = relic.icon || "modules/the-first-relics/art/icons/cloak-feywilds.svg";
  if (relic.id !== "cloak_feywilds") return null;

  if (slot === "active3") {
    return {
      name: "Nature's Pursuit",
      img,
      transfer: false,
      disabled: false,
      changes: [
        { key: "system.attributes.movement.walk", mode: TFRMode("ADD"), value: "10", priority: 20 }
      ],
      duration: { rounds: 10, seconds: 60 },
      flags: { dae: { transfer: false, stackable: "noneName", specialDuration: [] } }
    };
  }

  if (slot === "active4") {
    return {
      name: "Briar Snare Reminder",
      img,
      transfer: false,
      disabled: false,
      changes: [],
      duration: { rounds: 1, seconds: 6 },
      flags: { dae: { transfer: false, stackable: "noneName", specialDuration: [] } }
    };
  }

  if (slot === "avatar") {
    return TFRAvatarEffect(relic);
  }

  if (slot === "signature") {
    return {
      name: "Blessing of Sylvara",
      img,
      transfer: false,
      disabled: false,
      changes: [],
      duration: { rounds: 10, seconds: 60 },
      flags: { dae: { transfer: false, stackable: "noneName", specialDuration: [] } }
    };
  }

  return null;
}

function TFRAttachEffectsToActivity(activity, refs = []) {
  if (!activity || !refs?.length) return activity;
  activity.effects = refs
    .map(ref => typeof ref === "string" ? { _id: ref } : ref)
    .filter(ref => ref?._id);
  activity.midiProperties = activity.midiProperties || {};
  activity.midiProperties.chooseEffects = true;
  activity.midiProperties.magicEffect = true;
  return activity;
}

function TFRNativeActivityEffectId(slot, kind = "effect") {
  const clean = `${slot}${kind}`.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (`TFR${clean}0000000000000000`).slice(0, 16);
}

function TFRNativeActivityEffectRef(effectId, def, { alwaysApplyOnSave = false } = {}) {
  const ref = { _id: effectId };
  if (def?.type === "save") ref.onSave = !!alwaysApplyOnSave;
  return ref;
}

function TFRNativeEffectItemContext(relic, stage = "dormant", item = null) {
  if (item) return item;
  const normalizedStage = TFRNormalizeStage(stage);
  return {
    img: relic?.icon || "",
    uuid: null,
    flags: { [TFR_MODULE_ID]: { stage: normalizedStage } },
    getFlag: (scope, key) => scope === TFR_MODULE_ID && key === "stage" ? normalizedStage : undefined
  };
}

function TFRNativeEffectDuration(spec = {}, fallbackRounds = 10, fallbackSeconds = 60) {
  return {
    rounds: Number(spec.rounds ?? fallbackRounds) || 0,
    seconds: Number(spec.seconds ?? fallbackSeconds) || 0
  };
}

function TFRTitleCaseStatus(statusId = "") {
  const status = String(statusId || "").trim();
  return status ? status[0].toUpperCase() + status.slice(1) : "Relic Effect";
}

function TFRNativeHelperActivityEffectData(relic, slot, stage = "dormant", item = null, spec = {}) {
  const itemContext = TFRNativeEffectItemContext(relic, stage, item);
  const def = TFRGetAbilityDefinition(relic, slot);
  const effect = TFRRelicAbilityEffectData(relic, slot, itemContext, null) || TFREffectData(
    `${def?.name || slot} - ${relic.name}`,
    itemContext?.img || relic.icon || "icons/svg/aura.svg",
    [],
    spec.rounds || 10,
    spec.seconds || 60,
    itemContext?.uuid || null
  );
  effect._id = TFRNativeActivityEffectId(slot, "helper");
  effect.name = `${def?.name || slot} - ${relic.name}`;
  effect.origin = itemContext?.uuid || null;
  if (spec.rounds || spec.seconds) effect.duration = TFRNativeEffectDuration(spec);
  effect.flags = {
    ...(effect.flags || {}),
    [TFR_MODULE_ID]: {
      ...(effect.flags?.[TFR_MODULE_ID] || {}),
      relicId: relic.id,
      slot,
      nativeActivityEffect: true,
      nativeEffectKind: "helper"
    }
  };
  return effect;
}

function TFRNativeStatusActivityEffectData(relic, slot, spec = {}, stage = "dormant", item = null, kind = "condition") {
  const def = TFRGetAbilityDefinition(relic, slot);
  const itemContext = TFRNativeEffectItemContext(relic, stage, item);
  const status = String(kind === "self-condition" ? spec.conditionSelf : spec.condition || "").trim().toLowerCase();
  if (!status) return null;

  const statuses = [status];
  if (spec.alsoProne && !statuses.includes("prone")) statuses.push("prone");

  const label = `${TFRTitleCaseStatus(status)} - ${def?.name || relic.name}`;
  const hasNativeStatus = !!(CONFIG.statusEffects || []).find(s => String(s.id || s._id || "").toLowerCase() === status);
  const changes = foundry.utils.deepClone(spec.extraTargetChanges || []);

  const data = {
    _id: TFRNativeActivityEffectId(slot, kind),
    name: label,
    img: TFRGetConditionIcon(status || "restrained"),
    origin: itemContext?.uuid || null,
    disabled: false,
    transfer: false,
    statuses,
    changes,
    duration: TFRNativeEffectDuration(spec),
    flags: {
      core: { statusId: status },
      dae: { transfer: false, stackable: "noneName", specialDuration: spec.expireOnTurnEnd ? ["turnEndSource"] : [] },
      [TFR_MODULE_ID]: {
        relicId: relic.id,
        slot,
        helperCondition: true,
        statusId: status,
        nativeActivityEffect: true,
        nativeEffectKind: kind
      }
    }
  };

  if (!hasNativeStatus && status === "silenced") data.img = "icons/magic/sonic/scream-wail-shout-teal.webp";
  return data;
}

function TFRNativeActivityEffectEntries(relic, slot, { stage = "dormant", item = null } = {}) {
  const def = TFRGetAbilityDefinition(relic, slot);
  const spec = TFRRelicAbilityRuntimeSpec(relic.id, slot);
  const entries = [];

  const helper = (spec.selfEffect || spec.targetEffect)
    ? TFRNativeHelperActivityEffectData(relic, slot, stage, item, spec)
    : null;
  if (helper) {
    entries.push({
      effect: helper,
      ref: TFRNativeActivityEffectRef(helper._id, def, { alwaysApplyOnSave: true })
    });
  }

  const selfCondition = spec.conditionSelf
    ? TFRNativeStatusActivityEffectData(relic, slot, spec, stage, item, "self-condition")
    : null;
  if (selfCondition) {
    entries.push({
      effect: selfCondition,
      ref: TFRNativeActivityEffectRef(selfCondition._id, def, { alwaysApplyOnSave: true })
    });
  }

  const failedSaveCondition = spec.condition
    ? TFRNativeStatusActivityEffectData(relic, slot, spec, stage, item, "condition")
    : null;
  if (failedSaveCondition) {
    entries.push({
      effect: failedSaveCondition,
      ref: TFRNativeActivityEffectRef(failedSaveCondition._id, def, { alwaysApplyOnSave: false })
    });
  }

  return entries;
}

function TFRNativeActivityEffectRefs(relic, slot) {
  return TFRNativeActivityEffectEntries(relic, slot).map(entry => entry.ref);
}

function TFRBuildNativeActivityEffects(relic, stage = "dormant", signatureUnlocked = false) {
  const effects = [];
  const seen = new Set();
  for (const slot of TFRUnlockedActivitySlots(stage, signatureUnlocked)) {
    for (const entry of TFRNativeActivityEffectEntries(relic, slot, { stage })) {
      const id = entry.effect?._id || entry.effect?.name;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      effects.push(entry.effect);
    }
  }
  return effects;
}

function TFRChatMessageHasNativeEffectTray(message) {
  const effects = foundry.utils.getProperty(message, "system.effects")
    || foundry.utils.getProperty(message, "data.system.effects")
    || [];
  return TFRCollectionToArray(effects).length > 0;
}

function TFRShouldPreferNativeActivityEffects(relic, slot, options = {}) {
  if (!options.fromChatCard || options.forceApplyCondition === true || options.forceApplyNativeHelper === true) return false;
  if (!TFRChatMessageHasNativeEffectTray(options.message)) return false;
  return TFRNativeActivityEffectRefs(relic, slot).length > 0;
}

function TFRRuntimeWorkCoveredByNativeEffects(spec = {}) {
  if (spec.teleport) return false;
  if (spec.removeSelf?.length || spec.removeTarget?.length) return false;
  if (spec.tempHp) return false;
  return !!(spec.selfEffect || spec.targetEffect || spec.condition || spec.conditionSelf);
}



function TFRAbilityDefinitions() {
  return {
    cloak_feywilds: {
      active1: { name: "Fey Step", type: "utility", activation: "bonus", charges: 1, range: 60, target: "space", template: "mistyStep", teleport: true },
      active2: { name: "Arrow of the First Hunt", type: "damage", activation: "special", charges: 2, range: 120, target: "creature", damage: { number: 4, denomination: 8, type: "force" } },
      active3: { name: "Nature's Pursuit", type: "utility", activation: "bonus", charges: 3, range: 0, target: "self" },
      active4: { name: "Briar Snare", type: "save", activation: "action", charges: 4, range: 60, target: "creature", save: "str" },
      avatar: { name: "Avatar of The Hunt", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "Signature of The Hunt", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
    },
    mantle_first_seer: {
      active1: { name: "Echo of Tomorrow", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self" },
      active2: { name: "Moment of Clarity", type: "utility", activation: "reaction", charges: 2, range: 60, target: "creature" },
      active3: { name: "Threads of Fate", type: "utility", activation: "reaction", charges: 3, range: 60, target: "creature" },
      active4: { name: "Spell Insight", type: "utility", activation: "reaction", charges: 4, range: 120, target: "creature" },
      avatar: { name: "Avatar of Understanding", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "Signature of Understanding", type: "utility", activation: "reaction", charges: 0, range: 120, target: "creature" }
    },
    manacles_unbroken: {
      active1: { name: "Stand", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self" },
      active2: { name: "Stoneheart Surge", type: "damage", activation: "special", charges: 2, range: 5, target: "creature", damage: { number: 4, denomination: 8, type: "force" } },
      active3: { name: "Refuse the Fall", type: "utility", activation: "reaction", charges: 3, range: 0, target: "self" },
      active4: { name: "Hold the World", type: "utility", activation: "reaction", charges: 4, range: 10, target: "creature" },
      avatar: { name: "Avatar of Indomitable Will", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "Signature of Indomitable Will", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
    },
    chains_patron: {
      active1: { name: "Patron's Glance", type: "utility", activation: "bonus", charges: 1, range: 60, target: "creature" },
      active2: { name: "Borrowed Ruin", type: "damage", activation: "special", charges: 2, range: 120, target: "creature", damage: { number: 4, denomination: 8, type: "necrotic" } },
      active3: { name: "Chain of Binding", type: "save", activation: "action", charges: 3, range: 60, target: "creature", save: "str" },
      active4: { name: "Pay the Difference", type: "utility", activation: "reaction", charges: 4, range: 0, target: "self" },
      avatar: { name: "Avatar of Ambition", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "Signature of Ambition", type: "save", activation: "action", charges: 0, range: 60, target: "creature", save: "cha" }
    },

    aegis_dawn: {
      active1: { name: "Stand Firm", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self" },
      active2: { name: "Dawn Barrier", type: "utility", activation: "reaction", charges: 2, range: 30, target: "creature" },
      active3: { name: "Bastion of Resolve", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
      active4: { name: "Break the Darkness", type: "save", activation: "action", charges: 4, range: 30, target: "creature", save: "con" },
      avatar: { name: "Dawn Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "Last Sunrise", type: "utility", activation: "special", charges: 0, range: 30, target: "creature" }
    },
    crown_conqueror: {
      active1: { name: "Rally", type: "utility", activation: "bonus", charges: 1, range: 30, target: "creature" },
      active2: { name: "Royal Decree", type: "save", activation: "action", charges: 2, range: 60, target: "creature", save: "wis" },
      active3: { name: "Banner Unbroken", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
      active4: { name: "March of Kings", type: "utility", activation: "action", charges: 4, range: 30, target: "creature" },
      avatar: { name: "King Eternal", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "The World Shall Kneel", type: "save", activation: "action", charges: 0, range: 60, target: "creature", save: "wis" }
    },
    bands_inner_dragon: {
      active1: { name: "Dragon Breath", type: "utility", activation: "bonus", charges: 1, range: 0, target: "self" },
      active2: { name: "Iron Soul", type: "utility", activation: "reaction", charges: 2, range: 0, target: "self" },
      active3: { name: "Hundred Forms", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
      active4: { name: "Perfect Strike", type: "utility", activation: "action", charges: 4, range: 0, target: "self" },
      avatar: { name: "Inner Dragon Manifest", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "Dragon Unbound", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
    },
    cloak_shadowfell: {
      active1: { name: "Shadow Step", type: "utility", activation: "bonus", charges: 1, range: 30, target: "space", template: "mistyStep", teleport: true },
      active2: { name: "Fade Away", type: "utility", activation: "reaction", charges: 2, range: 0, target: "self" },
      active3: { name: "Living Darkness", type: "utility", activation: "action", charges: 3, range: 60, target: "space" },
      active4: { name: "Death From Silence", type: "damage", activation: "action", charges: 4, range: 5, target: "creature", damage: { number: 8, denomination: 6, type: "necrotic" } },
      avatar: { name: "Walker Between Shadows", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "One Step Behind", type: "damage", activation: "special", charges: 0, range: 60, target: "creature", damage: { number: 10, denomination: 6, type: "necrotic" }, template: "mistyStep", teleport: true }
    },
    heart_yggdrasil: {
      active1: { name: "Verdant Bloom", type: "utility", activation: "action", charges: 1, range: 60, target: "space" },
      active2: { name: "Nature's Embrace", type: "heal", activation: "bonus", charges: 2, range: 30, target: "creature", healing: { number: 4, denomination: 8 } },
      active3: { name: "Forest Guardian", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
      active4: { name: "Roots of Eternity", type: "save", activation: "action", charges: 4, range: 60, target: "creature", save: "str" },
      avatar: { name: "Avatar of Yggdrasil", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "World Reborn", type: "utility", activation: "special", charges: 0, range: 60, target: "creature" }
    },
    vestments_first_saint: {
      active1: { name: "Blessing", type: "utility", activation: "bonus", charges: 1, range: 30, target: "creature" },
      active2: { name: "Cleansing Light", type: "utility", activation: "action", charges: 2, range: 30, target: "creature" },
      active3: { name: "Sanctuary of Dawn", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
      active4: { name: "Wings of Mercy", type: "heal", activation: "action", charges: 4, range: 60, target: "creature", healing: { number: 6, denomination: 8 } },
      avatar: { name: "Saint Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "Miracle of the First Saint", type: "utility", activation: "special", charges: 0, range: 60, target: "creature" }
    },
    blood_first_dragon: {
      active1: { name: "Draconic Roar", type: "save", activation: "bonus", charges: 1, range: 30, target: "creature", save: "wis" },
      active2: { name: "Burning Blood", type: "utility", activation: "bonus", charges: 2, range: 0, target: "self" },
      active3: { name: "Wings of the First Dragon", type: "utility", activation: "action", charges: 3, range: 0, target: "self" },
      active4: { name: "Primordial Breath", type: "damage", activation: "action", charges: 4, range: 60, target: "creature", damage: { number: 10, denomination: 6, type: "fire" } },
      avatar: { name: "First Dragon Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "Heart of the First Flame", type: "utility", activation: "special", charges: 0, range: 0, target: "self" }
    },
    lyre_first_song: {
      active1: { name: "Song of Rest", type: "heal", activation: "action", charges: 1, range: 30, target: "creature", healing: { number: 2, denomination: 8 } },
      active2: { name: "Ballad of Heroes", type: "utility", activation: "bonus", charges: 2, range: 0, target: "self" },
      active3: { name: "Verse of Silence", type: "save", activation: "action", charges: 3, range: 60, target: "creature", save: "wis" },
      active4: { name: "Chorus of Creation", type: "utility", activation: "action", charges: 4, range: 0, target: "self" },
      avatar: { name: "First Song Incarnate", type: "utility", activation: "bonus", charges: 8, range: 0, target: "self" },
      signature: { name: "The First Song", type: "save", activation: "special", charges: 0, range: 60, target: "creature", save: "wis" }
    }
  };
}

function TFRGetAbilityDefinition(relic, slot) {
  return TFRAbilityDefinitions()[relic.id]?.[slot] || null;
}

function TFRActivityDescription(relic, slot) {
  const f = relic.features || {};
  if (slot === "avatar") return f.avatar || "";
  if (slot === "signature") return f.signature || "";
  const idx = Number(String(slot).replace("active", "")) - 1;
  return f.actives?.[idx] || "";
}

function TFRActivityActivation(type) {
  return { type: type || "action", value: null, condition: "" };
}

function TFRActivityRange(def) {
  if (def.target === "self" || !def.range) return { units: "self", override: false };
  return { value: String(def.range), units: "ft", override: false };
}

function TFRActivityTarget(def) {
  if (def.target === "self") {
    return {
      template: { contiguous: false, stationary: false, units: "ft" },
      affects: { type: "self", count: "1", choice: false },
      override: false,
      prompt: false
    };
  }

  if (def.target === "space") {
    return {
      template: { contiguous: false, stationary: false, units: "ft" },
      affects: { type: "space", count: "1", choice: false },
      override: false,
      prompt: true
    };
  }

  return {
    template: { contiguous: false, stationary: false, units: "ft" },
    affects: { type: "creature", count: "1", choice: false },
    override: false,
    prompt: true
  };
}

function TFRActivityConsumption(def) {
  if (!def.charges) return { targets: [], scaling: { allowed: false } };
  return {
    targets: [{
      type: "itemUses",
      value: String(def.charges),
      target: ""
    }],
    scaling: { allowed: false }
  };
}



function TFRTemplateFamily(def) {
  if (def?.type === "damage") return "damage";
  if (def?.type === "save") return "save";
  if (def?.type === "heal") return "heal";
  if (def?.template) return def.template;
  if (def?.teleport) return "teleport";
  if (def?.type === "utility" && ["avatar", "buff", "aura"].includes(def?.role)) return "buff";
  return "utility";
}

function TFRActivityTemplateData(def) {
  const family = TFRTemplateFamily(def);
  const base = {
    family,
    activation: def?.activation || "action",
    charges: def?.charges ?? 0,
    range: def?.range || 0,
    target: def?.target || "self"
  };

  if (family === "mistyStep" || family === "teleport") {
    return {
      ...base,
      family: "teleport",
      foundryLike: "Misty Step",
      activityType: "utility",
      rangeUnit: "ft",
      targetType: "space",
      targetCount: 1,
      descriptionHint: `Teleport up to ${def?.range || 30} feet to an unoccupied space you can see.`
    };
  }

  if (family === "damage") {
    return {
      ...base,
      foundryLike: "Damage Activity",
      activityType: "damage",
      damage: def?.damage || null
    };
  }

  if (family === "save") {
    return {
      ...base,
      foundryLike: "Saving Throw Activity",
      activityType: "save",
      save: def?.save || "dex"
    };
  }

  if (family === "heal") {
    return {
      ...base,
      foundryLike: "Healing Activity",
      activityType: "heal",
      healing: def?.healing || null
    };
  }

  if (family === "buff") {
    return {
      ...base,
      foundryLike: "Effect Activity",
      activityType: "utility",
      effectDriven: true
    };
  }

  return {
    ...base,
    family: "utility",
    foundryLike: "Utility Activity",
    activityType: "utility"
  };
}

function TFRApplyActivityTemplate(activity, def) {
  const template = TFRActivityTemplateData(def);
  activity.flags = activity.flags || {};
  activity.flags["the-first-relics"] = {
    ...(activity.flags["the-first-relics"] || {}),
    templateFamily: template.family,
    templateSource: template.foundryLike,
    templateVersion: "0.17.4"
  };

  if (template.family === "teleport") {
    activity.description = activity.description || {};
    if (!activity.description.value) {
      activity.description.value = `<p><strong>${template.foundryLike} Template.</strong></p><p>${template.descriptionHint}</p>`;
    }
    activity.activation = { type: def.activation || "bonus", value: null, condition: "" };
    activity.duration = { units: "inst", value: null };
    activity.range = { value: String(def.range || 30), units: "ft", override: false };
    activity.target = {
      template: { contiguous: false, stationary: false, units: "ft" },
      affects: { type: "space", count: "1", choice: false },
      override: false,
      prompt: true
    };
    activity.flags["the-first-relics"].teleport = true;
    activity.flags["the-first-relics"].teleportRange = def.range || 30;
  }

  return activity;
}

async function TFRAuditActivityTemplates() {
  const relics = await TFRLoadRelics();
  const rows = [];

  for (const relic of relics) {
    for (const slot of ["active1", "active2", "active3", "active4", "avatar", "signature"]) {
      const def = TFRGetAbilityDefinition(relic, slot);
      const template = TFRActivityTemplateData(def);
      rows.push({
        relic: relic.name,
        slot,
        ability: def?.name || "",
        type: def?.type || "",
        template: template.family,
        foundryLike: template.foundryLike,
        activation: template.activation,
        range: template.range ? `${template.range} ft` : "self",
        target: template.target,
        charges: template.charges
      });
    }
  }

  console.table(rows);
  const missing = rows.filter(r => !r.ability || !r.template);
  if (missing.length) ui.notifications.warn(`The First Relics Template Audit: ${missing.length} issue(s).`);
  else ui.notifications.info("The First Relics Activity Template Audit passed.");
  return rows;
}


function TFRApplyMistyStepTemplate(activity, def) {
  if (!def?.teleport && def?.template !== "mistyStep") return activity;

  activity.flags = activity.flags || {};
  activity.flags["the-first-relics"] = {
    ...(activity.flags["the-first-relics"] || {}),
    teleport: true,
    teleportTemplate: "mistyStep",
    teleportRange: def.range || 30
  };

  if (def.type !== "utility") return activity;

  activity.description = activity.description || {};
  const rangeText = def.range ? `${def.range} feet` : "30 feet";
  activity.description.value = activity.description.value || `
    <p><strong>Misty Step Template.</strong></p>
    <p>Briefly surrounded by silvery mist, you teleport up to ${rangeText} to an unoccupied space you can see.</p>
  `;

  activity.activation = { type: def.activation || "bonus", value: null, condition: "" };
  activity.duration = { units: "inst", value: null };
  activity.range = { value: String(def.range || 30), units: "ft", override: false };

  activity.target = {
    template: { contiguous: false, stationary: false, units: "ft" },
    affects: { type: "space", count: "1", choice: false },
    override: false,
    prompt: true
  };

  return activity;
}


function TFRCreateEngineActivity(relic, slot, stage, signatureUnlocked) {
  const def = TFRGetAbilityDefinition(relic, slot);
  if (!def) return null;

  const base = {
    name: def.name,
    type: def.type === "heal" ? "heal" : def.type,
    description: {
      chatFlavor: "",
      value: TFRActivityDescription(relic, slot)
    },
    activation: TFRActivityActivation(def.activation),
    consumption: TFRActivityConsumption(def),
    duration: { units: "inst", value: null },
    range: TFRActivityRange(def),
    target: TFRActivityTarget(def),
    uses: { spent: 0, recovery: [], max: "" },
    sort: 0,
    effects: [],
    flags: {
      "the-first-relics": {
        relicId: relic.id,
        slot,
        engine: "v0.16.0"
      }
    }
  };

  if (def.type === "damage") {
    base.damage = {
      critical: { allow: true, bonus: "" },
      parts: [{
        number: def.damage?.number || 1,
        denomination: def.damage?.denomination || 6,
        bonus: "",
        types: [def.damage?.type || "force"],
        custom: { enabled: false, formula: "" },
        scaling: { mode: "", number: 1 }
      }]
    };
  }

  if (def.type === "save") {
    base.save = {
      ability: def.save || "dex",
      dc: { calculation: "spellcasting", formula: "" }
    };
    base.damage = base.damage || { parts: [] };
  }

  if (def.type === "heal") {
    base.healing = {
      number: def.healing?.number || 1,
      denomination: def.healing?.denomination || 8,
      bonus: "",
      types: ["healing"],
      custom: { enabled: false, formula: "" },
      scaling: { mode: "", number: null, formula: "" }
    };
  }

  TFRApplyActivityTemplate(base, def);
  TFRApplyMistyStepTemplate(base, def);
  const attachedEffects = TFRNativeActivityEffectRefs(relic, slot);
  if (attachedEffects.length) TFRAttachEffectsToActivity(base, attachedEffects);
  return base;
}

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
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");
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
  if (!toCreate.length) return ui.notifications.info("The First Relics: No new relics to create.");
  const created = await Item.createDocuments(toCreate, { renderSheet: false, render: false });
  ui.notifications.info(`The First Relics: ${created.length} living relic items created.`);
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
    ui.notifications.info(`${relic.name} rebuilt as ${stageData.title}.`);
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

  ui.notifications.info(`${relic.name} upgraded to ${stageData.title}.`);
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

async function TFRCreateJournalLegacy() {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");
  if (game.journal.getName("The First Relics - Lore")) return;
  const relics = await TFRLoadRelics();
  const list = relics.map(r => `<li><strong>${r.name}</strong> — ${r.class}, ${r.virtue}</li>`).join("");
  await JournalEntry.create({
    name: "The First Relics - Lore",
    pages: [{
      name: "The First Relics",
      type: "text",
      text: {
        format: 1,
        content: `
          <h1>The First Relics</h1>
          <p>Relics are living wills from the First Age. They choose their bearers and awaken through virtue, not ownership.</p>
          <h2>Known Relics</h2>
          <ul>${list}</ul>
          <blockquote><p><strong>A Relic never belongs to its bearer. The bearer belongs to the Relic.</strong></p></blockquote>
        `
      }
    }]
  });
}

function TFRJournalPageData(name, content, sort = 0) {
  return {
    name,
    type: "text",
    sort,
    text: {
      format: 1,
      content
    },
    flags: {
      [TFR_MODULE_ID]: {
        generatedLorePage: true
      }
    }
  };
}

function TFRBuildJournalOverview(relics) {
  const list = relics.map(r => `<li><strong>${r.name}</strong> - ${r.class}, ${r.virtue}</li>`).join("");
  return `
    <h1>The First Relics</h1>
    <p>Relics are living wills from the First Age. They choose their bearers and awaken through virtue, not ownership.</p>
    <p>A relic may refuse attunement when a bearer's choices violate its nature. Final Form is therefore never guaranteed: it is the culmination of 1000 Affinity and a bond the relic still willingly accepts.</p>
    <h2>Relic Progression</h2>
    <ul>
      <li><strong>Dormant.</strong> +1 Universal Relic Bonus and 3 charges.</li>
      <li><strong>Awakened.</strong> +2 Universal Relic Bonus and 6 charges.</li>
      <li><strong>Exalted.</strong> +3 Universal Relic Bonus and 10 charges from 750–999 Affinity.</li>
      <li><strong>Final Form.</strong> +5 Universal Relic Bonus and 15 charges at 1000 Affinity; the true name and Signature Ability are revealed.</li>
    </ul>
    <h2>Known Relics</h2>
    <ul>${list}</ul>
    <blockquote><p><strong>A Relic never belongs to its bearer. The bearer belongs to the Relic.</strong></p></blockquote>
  `;
}

function TFRBuildRelicJournalContent(relic) {
  const finalFormData = TFRGetStageData(relic, "exalted", true);
  const stageRows = [...TFR_STAGES.map(stage => {
    const data = TFRGetStageData(relic, stage);
    return `<li><strong>${data.title || TFRStageTitle(stage)}.</strong> Bonus +${data.bonus}, ${data.charges} charges.</li>`;
  }), `<li><strong>${finalFormData.title}.</strong> Bonus +${finalFormData.bonus}, ${finalFormData.charges} charges at 1000 Affinity.</li>`].join("");
  const moodRows = (Array.isArray(relic.moodMap) ? relic.moodMap : [])
    .map(entry => `<li><strong>${entry.min}-${entry.max} ${entry.mood}.</strong> ${entry.description}</li>`)
    .join("");
  const passives = (relic.features?.passives || []).map(p => `<li>${p}</li>`).join("");
  const actives = (relic.features?.actives || []).map(a => `<li>${a}</li>`).join("");
  const personality = relic.personality || {};
  const lore = relic.lore || {};
  const loreRows = [
    lore.knownRumor ? `<p><strong>Known Rumor:</strong> ${lore.knownRumor}</p>` : "",
    lore.origin ? `<p><strong>Origin:</strong> ${lore.origin}</p>` : "",
    lore.hiddenSorrow ? `<p><strong>Hidden Sorrow:</strong> ${lore.hiddenSorrow}</p>` : ""
  ].filter(Boolean).join("");
  const appearanceRows = [
    lore.appearanceDormant ? `<li><strong>Dormant.</strong> ${lore.appearanceDormant}</li>` : "",
    lore.appearanceAwakened ? `<li><strong>Awakened.</strong> ${lore.appearanceAwakened}</li>` : "",
    lore.appearanceExalted ? `<li><strong>Exalted.</strong> ${lore.appearanceExalted}</li>` : "",
    lore.appearanceSignature ? `<li><strong>Final Form.</strong> ${lore.appearanceSignature}</li>` : ""
  ].filter(Boolean).join("");

  return `
    <h1>${relic.name}</h1>
    <p><strong>Class:</strong> ${relic.class}</p>
    <p><strong>Virtue:</strong> ${relic.virtue}</p>
    <p><strong>Theme:</strong> ${relic.theme}</p>
    ${relic.trueName?.full ? `<p><strong>True Name:</strong> ${relic.trueName.full}</p>` : ""}

    <h2>Stage Summary</h2>
    <ul>${stageRows}</ul>

    ${loreRows ? `<h2>Relic Lore</h2>${loreRows}` : ""}
    ${appearanceRows ? `<h2>Manifestations</h2><ul>${appearanceRows}</ul>` : ""}

    <h2>GM Notes</h2>
    ${personality.temperament?.length ? `<p><strong>Temperament:</strong> ${personality.temperament.join(", ")}</p>` : ""}
    ${personality.corePhrase ? `<p><strong>Core Phrase:</strong> <em>${personality.corePhrase}</em></p>` : ""}
    ${personality.roleplayGuidance ? `<p><strong>Roleplay Guidance:</strong> ${personality.roleplayGuidance}</p>` : ""}
    ${personality.likes?.length ? `<p><strong>Likes:</strong> ${personality.likes.join(", ")}</p>` : ""}
    ${personality.dislikes?.length ? `<p><strong>Dislikes:</strong> ${personality.dislikes.join(", ")}</p>` : ""}

    <h2>Full Affinity Mood Map</h2>
    <ul>${moodRows}</ul>

    <h2>Passive Features</h2>
    <ul>${passives}</ul>

    <h2>Active Features</h2>
    <ul>${actives}</ul>

    ${relic.features?.avatar ? `<h2>Avatar Form</h2><p>${relic.features.avatar}</p>` : ""}
    ${relic.features?.signature ? `<h2>Signature Ability</h2><p>${relic.features.signature}</p>` : ""}
  `;
}

async function TFRCreateJournal(options = {}) {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");
  const notify = options.notify !== false;
  const relics = await TFRLoadRelics();
  const pages = [
    TFRJournalPageData("The First Relics", TFRBuildJournalOverview(relics), 0),
    ...relics.map((relic, index) => TFRJournalPageData(relic.name, TFRBuildRelicJournalContent(relic), (index + 1) * 1000))
  ];
  let journal = game.journal.getName("The First Relics - Lore");

  if (!journal) {
    journal = await JournalEntry.create({
      name: "The First Relics - Lore",
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      pages
    });
    if (notify) ui.notifications.info("The First Relics: Lore journal created.");
    return journal;
  }

  await journal.update({ ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE } });

  const created = [];
  for (const pageData of pages) {
    const existing = journal.pages.find(p => p.name === pageData.name);
    if (existing) await existing.update({
      text: pageData.text,
      sort: pageData.sort,
      flags: pageData.flags
    });
    else created.push(pageData);
  }
  if (created.length) await journal.createEmbeddedDocuments("JournalEntryPage", created, { render: false });
  if (notify) ui.notifications.info("The First Relics: Lore journal updated.");
  return journal;
}

async function TFRSyncExistingLoreJournal() {
  if (!game.user?.isGM || !game.journal?.getName?.("The First Relics - Lore")) return null;
  return TFRCreateJournal({ notify: false });
}

async function TFRCreateAll() {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");
  const createdRelics = await TFRCreateRelics();
  const createdJournal = await TFRCreateJournal();
  return { createdRelics, createdJournal };
}

async function TFRInitActorRelicData(actor, relicId) {
  if (!game.user.isGM || !actor) return;
  const existing = actor.getFlag("the-first-relics", `affinity.${relicId}`);
  if (existing) return existing;
  const data = { value: 0, mood: "Watching", stage: "dormant", questCompleted: false, notes: "", timeline: [] };
  await actor.setFlag("the-first-relics", `affinity.${relicId}`, data);
  return data;
}

async function TFRSetAffinity(actor, relicId, value, reason = "") {
  if (!game.user.isGM || !actor) return;
  const data = await TFRInitActorRelicData(actor, relicId);
  data.value = Math.clamp(Number(value) || 0, 0, 1000);
  if (reason) data.timeline.push({ time: Date.now(), value: data.value, reason });
  await actor.setFlag("the-first-relics", `affinity.${relicId}`, data);
  ui.notifications.info(`Affinity updated: ${actor.name} / ${relicId} = ${data.value}`);
}

async function TFRAdjustAffinity(actor, relicId, delta, reason = "") {
  const data = await TFRInitActorRelicData(actor, relicId);
  const value = (data.value || 0) + Number(delta || 0);
  await TFRSetAffinity(actor, relicId, value, reason);
  return TFRSyncStageFromAffinity(actor, relicId, value, reason || "Affinity adjusted");
}

async function TFRDeleteAll() {
  await TFRDeleteFeatureItems();
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");
  const itemIds = game.items.filter(i => i.system?.source?.custom === "The First Relics" || i.flags?.["the-first-relics"]?.relicId).map(i => i.id);
  if (itemIds.length) await Item.deleteDocuments(itemIds);
  for (const j of game.journal.filter(j => j.name === "The First Relics - Lore")) await j.delete();
  for (const actor of game.actors) {
    if (actor.getFlag("the-first-relics", "affinity")) await actor.unsetFlag("the-first-relics", "affinity");
  }
  await TFRSetWorldState({});
  ui.notifications.info("The First Relics: deleted all relic items, lore journal, actor affinity data, and world relic state.");
}



function TFRRegisterWorldState() {
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

function TFRGetWorldState() {
  return foundry.utils.deepClone(game.settings.get("the-first-relics", "relicState") || {});
}

async function TFRSetWorldState(state) {
  return game.settings.set("the-first-relics", "relicState", state || {});
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

async function TFRGetRelicState(relicId) {
  const state = TFRGetWorldState();
  if (!state[relicId]) {
    state[relicId] = TFRDefaultRelicState();
    await TFRSetWorldState(state);
  }
  return state[relicId];
}

async function TFRSetRelicState(relicId, data) {
  const state = TFRGetWorldState();
  state[relicId] = data;
  await TFRSetWorldState(state);
  return data;
}

async function TFRAdjustRelicAffinity(relicId, delta, reason = "") {
  const data = await TFRGetRelicState(relicId);
  const value = Math.clamp((Number(data.value) || 0) + Number(delta || 0), 0, 1000);
  return TFRSetRelicAffinity(relicId, value, reason || `Adjusted by ${delta}`);
}


function TFRFindAllRelicItemCopies(relic) {
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

function TFRRelicForItem(item, relics) {
  const relicId = item?.getFlag?.(TFR_MODULE_ID, "relicId") || item?.flags?.[TFR_MODULE_ID]?.relicId;
  if (relicId) return relics.find(relic => relic.id === relicId) || null;
  if (TFR_CLOAK_ITEM_NAMES.has(item?.name)) return relics.find(relic => relic.id === "cloak_feywilds") || null;
  return relics.find(relic => relic.name === item?.name) || null;
}

function TFRAllWorldAndActorItems() {
  const items = [...(game.items?.contents || [])];
  for (const actor of game.actors?.contents || []) items.push(...(actor.items?.contents || []));
  return Array.from(new Map(items.filter(Boolean).map(item => [item.uuid || item.id, item])).values());
}

async function TFRSyncSealedTrueNameDescriptions() {
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

async function TFRSyncProgressiveAppearanceDescriptions() {
  const result = { ok: true, checked: 0, updated: 0, skippedCustom: 0, failures: [] };
  if (!game.user?.isGM) return result;

  const relics = await TFRLoadRelics();
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
    if (current === expected) continue;

    try {
      await item.update({ "system.description.value": expected });
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

async function TFRAuditTrueNameSealing() {
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

async function TFRAuditProgressiveAppearanceUnlocks() {
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

async function TFRAuditFinalFormBonuses() {
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
    if (!finalForm.system?.description?.value?.includes(`<strong>${TFR_FINAL_FORM_CHARGES} charges</strong>`)) issues.push(`Final Form description does not show ${TFR_FINAL_FORM_CHARGES} charges`);
    if (exalted.system?.description?.value?.includes(`<strong>+${TFR_FINAL_FORM_BONUS} AC</strong>`)) issues.push(`+${TFR_FINAL_FORM_BONUS} appears before 1000`);
    if (exalted.system?.description?.value?.includes(`<strong>${TFR_FINAL_FORM_CHARGES} charges</strong>`)) issues.push(`${TFR_FINAL_FORM_CHARGES} charges appear before 1000`);

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

async function TFRSyncFinalFormItems() {
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

    for (const item of TFRFindAllRelicItemCopies(relic)) {
      const ready = TFRRelicItemStage(item) === "exalted"
        && TFRRelicItemSignatureUnlocked(item)
        && !!item.getFlag(TFR_MODULE_ID, "finalForm")
        && TFRHasUniversalRelicBonus(item, TFR_FINAL_FORM_BONUS)
        && Number(item.system?.uses?.max) === TFR_FINAL_FORM_CHARGES
        && String(item.system?.description?.value || "").includes(`<strong>+${TFR_FINAL_FORM_BONUS} AC</strong>`)
        && String(item.system?.description?.value || "").includes(`<strong>${TFR_FINAL_FORM_CHARGES} charges</strong>`);
      if (ready) continue;
      const rebuilt = await TFRUpdateRelicItem(item, "exalted", true);
      rows.push({ relic: relic.name, location: item.parent?.name || "World Item Directory", item: rebuilt?.name || item.name, synced: !!rebuilt });
    }
  }

  if (rows.length) TFRNotifyInfo(`The First Relics: ${rows.length} Final Form item copy/copies synchronized to +${TFR_FINAL_FORM_BONUS} and ${TFR_FINAL_FORM_CHARGES} charges.`);
  return rows;
}

async function TFRUpdateAllRelicCopies(relic, stage, signatureUnlocked = false) {
  const copies = TFRFindAllRelicItemCopies(relic);
  if (!copies.length) {
    ui.notifications.warn(`The First Relics: No item copies found for ${relic.name}.`);
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


async function TFRSetRelicAffinity(relicId, value, reason = "") {
  const relic = await TFRGetRelicById(relicId);
  if (!relic) return ui.notifications.warn(`The First Relics: Relic not found: ${relicId}`);

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
      reason: `Final Form awakened. Universal relic bonuses increased to +${TFR_FINAL_FORM_BONUS}, maximum charges increased to ${TFR_FINAL_FORM_CHARGES}, the Signature Ability unlocked, and the relic revealed its true name.`
    });

    ChatMessage.create({
      content: `<div class="first-relics-note"><h1>Final Form Awakened</h1><h2>${relic.name}</h2><p>The relic reaches perfect harmony at 1000 Affinity. Its Universal Relic Bonus becomes +${TFR_FINAL_FORM_BONUS}, its maximum charges become ${TFR_FINAL_FORM_CHARGES}, its true name is revealed, and its Signature Ability is no longer sealed.</p></div>`
    });
  }

  await TFRSetRelicState(relicId, data);

  const copies = await TFRUpdateAllRelicCopies(relic, data.stage, data.signatureUnlocked);
  if (copies.length) {
    ui.notifications.info(`${relic.name}: stage synced to ${TFRDisplayStage(data.stage, data.signatureUnlocked)} on ${copies.length} item copy/copies.`);
  }

  return data;
}

async function TFRGetRelicById(relicId) {
  const relics = await TFRLoadRelics();
  return relics.find(r => r.id === relicId);
}

function TFRMoodFromAffinity(value) {
  value = Number(value) || 0;
  if (value <= 50) return "Rejected";
  if (value <= 200) return "Silent";
  if (value <= 399) return "Watching";
  if (value <= 649) return "Curious";
  if (value <= 849) return "Satisfied";
  return "Resonating";
}

function TFRStageFromAffinity(value) {
  value = Number(value) || 0;
  if (value >= 750) return "exalted";
  if (value >= 300) return "awakened";
  return "dormant";
}


function TFRSignatureUnlockedFromAffinity(value) {
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

async function TFRSyncStageFromAffinity(actor, relicId, value, reason = "Affinity threshold sync") {
  if (!game.user.isGM || !actor) return null;

  const relic = await TFRGetRelicById(relicId);
  if (!relic) {
    ui.notifications.warn(`The First Relics: Relic data not found for ${relicId}`);
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
      ui.notifications.info(`${relic.name}: Affinity threshold reached. Stage set to ${TFRDisplayStage(stage, data.signatureUnlocked)}.`);
    }
  } else {
    ui.notifications.warn(`The First Relics: Relic item not found for ${relic.name}. Stage saved on actor only.`);
  }

  return stage;
}


function TFRRegisterToolbarButton() {
  Hooks.on("getSceneControlButtons", controls => {
    if (!game.user?.isGM) return;

    const tool = {
      name: "the-first-relics-dashboard",
      title: "The First Relics",
      icon: "fas fa-gem",
      button: true,
      visible: true,
      onChange: () => TFROpenDashboard()
    };

    // Foundry v13 object style.
    if (!Array.isArray(controls)) {
      const tokenControl = controls.tokens || controls.token || Object.values(controls)[0];
      if (!tokenControl) return;

      tokenControl.tools = tokenControl.tools || {};
      if (Array.isArray(tokenControl.tools)) {
        if (!tokenControl.tools.some(t => t.name === tool.name)) tokenControl.tools.push(tool);
      } else {
        tokenControl.tools[tool.name] = tool;
      }
      return;
    }

    // Alternate array style.
    const tokenControl = controls.find(c => c.name === "tokens" || c.name === "token") || controls[0];
    if (!tokenControl) return;

    tokenControl.tools = tokenControl.tools || [];
    if (Array.isArray(tokenControl.tools)) {
      if (!tokenControl.tools.some(t => t.name === tool.name)) tokenControl.tools.push(tool);
    } else {
      tokenControl.tools[tool.name] = tool;
    }
  });
}

function TFRRegisterSettings() {
  game.settings.registerMenu("the-first-relics", "dashboard", {
    name: "Open GM Dashboard",
    label: "Open Dashboard",
    hint: "Open The First Relics GM-only Affinity Dashboard.",
    icon: "fas fa-gem",
    // The settings menu only opens the dashboard; it has no window of its own.
    type: class TFRDashboardSettingsShim extends foundry.applications.api.ApplicationV2 {
      async render() {
        TFROpenDashboard();
        return this;
      }
    },
    restricted: true
  });
}

// Register toolbar hook early. Waiting until ready may be too late.
TFRRegisterToolbarButton();



function TFREventOptions(relic) {
  const events = relic.affinityEvents || [];
  return events.map(e => {
    const sign = e.delta >= 0 ? "+" : "";
    return `<option value="${e.id}">${sign}${e.delta} — [${e.category}] ${e.label}</option>`;
  }).join("");
}

function TFRGetAffinityEvent(relic, eventId) {
  return (relic.affinityEvents || []).find(e => e.id === eventId);
}


function TFREscapeHtml(value) {
  const text = String(value ?? "");
  if (globalThis.foundry?.utils?.escapeHTML) return foundry.utils.escapeHTML(text);
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function TFRTimelineReason(type, label, note = "") {
  return `[${type}] ${label}${note ? ` — ${note}` : ""}`;
}

async function TFRAddTimeline(relicId, type, label, note = "") {
  const data = await TFRGetRelicState(relicId);
  data.timeline = data.timeline || [];
  data.timeline.push({
    time: Date.now(),
    value: data.value || 0,
    type,
    reason: TFRTimelineReason(type, label, note)
  });
  await TFRSetRelicState(relicId, data);
  return data;
}

async function TFRSetRequirement(relicId, requirementId, completed = true, note = "") {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");
  const relic = await TFRGetRelicById(relicId);
  if (!relic) return ui.notifications.warn(`Relic not found: ${relicId}`);
  const req = (relic.hiddenRequirements || []).find(r => r.id === requirementId);
  if (!req) return ui.notifications.warn(`Requirement not found: ${requirementId}`);

  const data = await TFRGetRelicState(relicId);
  data.requirements = data.requirements || {};
  data.requirements[requirementId] = !!completed;
  await TFRSetRelicState(relicId, data);
  await TFRAddTimeline(relicId, completed ? "Requirement Completed" : "Requirement Cleared", req.label, note);

  ui.notifications.info(`${relic.name}: ${req.label} ${completed ? "completed" : "cleared"}.`);
  return data;
}

async function TFRUnlockMemory(relicId, memoryId, note = "") {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");
  const relic = await TFRGetRelicById(relicId);
  if (!relic) return ui.notifications.warn(`Relic not found: ${relicId}`);
  const memory = (relic.memories || []).find(m => m.id === memoryId);
  if (!memory) return ui.notifications.warn(`Memory not found: ${memoryId}`);

  const data = await TFRGetRelicState(relicId);
  data.memoriesUnlocked = data.memoriesUnlocked || {};
  data.memoriesUnlocked[memoryId] = true;
  await TFRSetRelicState(relicId, data);
  await TFRAddTimeline(relicId, "Memory Unlocked", memory.title, note);

  ChatMessage.create({
    content: `<div class="first-relics-note"><h2>Memory Unlocked</h2><h3>${TFREscapeHtml(relic.name)}</h3><p><strong>${TFREscapeHtml(memory.title)}</strong></p><p>${TFREscapeHtml(memory.text || "")}</p></div>`
  });

  return data;
}

async function TFRSendDream(relicId, dreamId, whisperToActorName = "") {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");
  const relic = await TFRGetRelicById(relicId);
  if (!relic) return ui.notifications.warn(`Relic not found: ${relicId}`);
  const dream = (relic.dreams || []).find(d => d.id === dreamId);
  if (!dream) return ui.notifications.warn(`Dream not found: ${dreamId}`);

  const data = await TFRGetRelicState(relicId);
  data.dreamsSent = data.dreamsSent || {};
  data.dreamsSent[dreamId] = Date.now();
  await TFRSetRelicState(relicId, data);
  await TFRAddTimeline(relicId, "Dream Sent", dream.title);

  const content = `<div class="first-relics-note"><h1>${TFREscapeHtml(dream.title)}</h1><h2>${TFREscapeHtml(relic.name)}</h2><p>${TFREscapeHtml(dream.text || "")}</p></div>`;

  const actor = whisperToActorName ? game.actors.getName(whisperToActorName) : null;
  const user = actor ? game.users.find(u => u.character?.id === actor.id) : null;

  ChatMessage.create({
    content,
    whisper: user ? [user.id] : undefined
  });

  return data;
}

function TFRRequirementProgress(relic, data) {
  const reqs = relic.hiddenRequirements || [];
  const done = reqs.filter(r => data.requirements?.[r.id]).length;
  return { done, total: reqs.length, complete: reqs.length > 0 && done === reqs.length };
}

function TFRRenderDashboardSummary(relic, data) {
  const stage = data.stage || TFRStageFromAffinity(data.value || 0);
  const displayStage = TFRDisplayStage(stage, data.signatureUnlocked);
  const mood = data.mood || TFRMoodFromAffinity(data.value || 0);
  const signature = data.signatureUnlocked ? "Unlocked" : "Sealed";

  return `
    <div class="tfr-summary-grid">
      <div class="tfr-summary-card"><span>Affinity</span><strong>${data.value || 0}/1000</strong></div>
      <div class="tfr-summary-card"><span>Stage</span><strong>${TFREscapeHtml(displayStage)}</strong></div>
      <div class="tfr-summary-card"><span>Mood</span><strong>${TFREscapeHtml(mood)}</strong></div>
      <div class="tfr-summary-card"><span>Signature</span><strong>${TFREscapeHtml(signature)}</strong></div>
    </div>
  `;
}

function TFRRenderDashboardAttunementConsent(data) {
  const refusing = !!data.refusesAttunement;
  return `
    <section class="tfr-attunement-control${refusing ? " is-refusing" : ""}">
      <label class="tfr-attunement-toggle">
        <input type="checkbox" name="refusesAttunement" ${refusing ? "checked" : ""}>
        <span>
          <strong>Relic Refuses Attunement</strong>
          <small>While enabled, no bearer can attune or use this relic, and its passive bonuses are suppressed. Press Save to apply.</small>
        </span>
      </label>
      <i class="fa-solid fa-brain" aria-hidden="true"></i>
    </section>
  `;
}


function TFRRenderRequirements(relic, data) {
  const reqs = relic.hiddenRequirements || [];
  if (!reqs.length) return "";
  return `
    <h3>Hidden Requirements</h3>
    <ul class="tfr-hidden-reqs">
      ${reqs.map(req => {
        const checked = data.requirements?.[req.id] ? "checked" : "";
        return `<li><label><input type="checkbox" name="req-${TFREscapeHtml(req.id)}" data-req-id="${TFREscapeHtml(req.id)}" ${checked}> ${TFREscapeHtml(req.label)}</label></li>`;
      }).join("")}
    </ul>
  `;
}

function TFRRenderDreams(relic, data) {
  const dreams = relic.dreams || [];
  if (!dreams.length) return "";
  return `
    <h3>Dreams</h3>
    <ul class="tfr-dreams">
      ${dreams.map(d => {
        const sent = data.dreamsSent?.[d.id];
        const sentText = sent ? ` <em>sent ${new Date(sent).toLocaleDateString()}</em>` : "";
        return `<li><strong>${TFREscapeHtml(d.title)}</strong> — ${TFREscapeHtml(d.stage)}, ${d.affinityMin}+ affinity${sentText}<br><button type="button" data-dream-id="${TFREscapeHtml(d.id)}">Send Dream</button></li>`;
      }).join("")}
    </ul>
  `;
}

function TFRRenderMemories(relic, data) {
  const memories = relic.memories || [];
  if (!memories.length) return "";
  return `
    <h3>Memories</h3>
    <ul class="tfr-memories">
      ${memories.map(m => {
        const unlocked = !!data.memoriesUnlocked?.[m.id];
        return `<li><strong>${unlocked ? "◆" : "◇"} ${TFREscapeHtml(m.title)}</strong>${unlocked ? `<br>${TFREscapeHtml(m.text || "")}` : ""}<br><button type="button" data-memory-id="${TFREscapeHtml(m.id)}">${unlocked ? "Show Again" : "Unlock Memory"}</button></li>`;
      }).join("")}
    </ul>
  `;
}



function TFRActivateDashboardTab(html, tab = "overview") {
  const root = TFRSheetHtmlElement(html);
  if (!root) return;
  const safeTab = tab || "overview";
  root.querySelectorAll(".tfr-tab-button").forEach(b => b.classList.toggle("active", b.dataset.tab === safeTab));
  root.querySelectorAll(".tfr-tab-panel").forEach(p => p.classList.toggle("active", p.dataset.panel === safeTab));
  if (!root.querySelector(`.tfr-tab-panel[data-panel="${safeTab}"]`)) {
    root.querySelector('.tfr-tab-button[data-tab="overview"]')?.classList.add("active");
    root.querySelector('.tfr-tab-panel[data-panel="overview"]')?.classList.add("active");
    TFR_DASHBOARD_LAST_TAB = "overview";
  }
}

function TFRSafeCssToken(value, fallback = "overview") {
  const text = String(value || fallback);
  return /^[a-zA-Z0-9_-]+$/.test(text) ? text : fallback;
}

async function TFROpenDashboard(relicId = null) {
  if (!game.user.isGM) {
    ui.notifications.warn("The First Relics: Affinity Dashboard sadece GM tarafından görülebilir.");
    return;
  }

  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === relicId) || relics[0];

  if (!relic) {
    ui.notifications.warn("The First Relics: Dashboard için relic bulunamadı.");
    return;
  }

  const data = await TFRGetRelicState(relic.id);
  data.mood = data.mood || TFRMoodFromAffinity(data.value);
  data.stage = data.stage || TFRStageFromAffinity(data.value);
  await TFRSetRelicState(relic.id, data);

  const relicOptions = relics.map(r => `<option value="${r.id}" ${r.id === relic.id ? "selected" : ""}>${r.name}</option>`).join("");

  const timeline = (data.timeline || []).slice(-10).reverse().map(t => {
    const date = t.time ? new Date(t.time).toLocaleString() : "";
    return `<li><strong>${date}</strong> — ${t.reason || "No note"} <em>(${t.value})</em></li>`;
  }).join("");

  const content = `
  <div class="tfr-dashboard tfr-dashboard-resizable tfr-dashboard-tabs" data-active-tab="${TFRSafeCssToken(TFR_DASHBOARD_LAST_TAB)}">
    <div class="form-group tfr-relic-picker">
      <label>Relic</label>
      <select name="relic">${relicOptions}</select>
    </div>

    <h2>${relic.name}</h2>
    ${TFRRenderDashboardSummary(relic, data)}

    <nav class="tfr-tabs-nav">
      <button type="button" class="tfr-tab-button active" data-tab="overview">Overview</button>
      <button type="button" class="tfr-tab-button" data-tab="affinity">Affinity</button>
      <button type="button" class="tfr-tab-button" data-tab="control">Control Panel</button>
      <button type="button" class="tfr-tab-button" data-tab="debug">Debug</button>
    </nav>

    <section class="tfr-tab-panel active" data-panel="overview">
      <p><strong>Unique Relic:</strong> This relic exists only once in the world.</p>
      <p><strong>Virtue:</strong> ${relic.virtue}</p>
      <p><strong>Theme:</strong> ${relic.theme || ""}</p>
      <p><strong>Affinity Rule:</strong> This relic gains or loses affinity through its own virtue-specific events.</p>
      ${TFRRenderDashboardAttunementConsent(data)}
      ${relic.trueName ? `<p><strong>True Name:</strong> ${data.signatureUnlocked ? relic.trueName.full : "???"}</p>` : ""}

      ${relic.personality ? `
        <div class="tfr-personality-box">
          <p><strong>Personality:</strong> ${relic.personality.temperament.join(", ")}</p>
          <p><strong>Likes:</strong> ${relic.personality.likes.join(", ")}</p>
          <p><strong>Dislikes:</strong> ${relic.personality.dislikes.join(", ")}</p>
          <p><em>${relic.personality.corePhrase}</em></p>
        </div>
      ` : ""}

      ${relic.automationStatus ? `
        <div class="tfr-automation-box">
          <p><strong>Automation:</strong> Passives ${relic.automationStatus.passives}, Actives ${relic.automationStatus.actives}, Avatar ${relic.automationStatus.avatar}, Signature ${relic.automationStatus.signature}</p>
          <ul>${(relic.automationStatus.notes || []).map(n => `<li>${n}</li>`).join("")}</ul>
        </div>
      ` : ""}
    </section>

    <section class="tfr-tab-panel" data-panel="affinity">
      <div class="tfr-affinity-box">
        <label>Affinity</label>
        <input type="number" name="affinity" min="0" max="1000" value="${data.value || 0}">
        <div class="tfr-affinity-bar">
          <div class="tfr-affinity-fill" style="width:${Math.clamp(data.value || 0, 0, 1000) / 10}%"></div>
        </div>
        <p><strong>Mood:</strong> ${data.mood || TFRMoodFromAffinity(data.value)}</p>
        <p><strong>Suggested Stage:</strong> ${TFRDisplayStage(TFRStageFromAffinity(data.value), TFRSignatureUnlockedFromAffinity(data.value))}</p>
        <p><strong>Current Recorded Stage:</strong> ${TFRDisplayStage(data.stage || "dormant", data.signatureUnlocked)}</p>
        <p><strong>Signature:</strong> ${data.signatureUnlocked ? "Unlocked" : "Sealed"}</p>
      </div>

      <div class="tfr-delta-row">
        <button type="button" data-delta="-50">-50</button>
        <button type="button" data-delta="-25">-25</button>
        <button type="button" data-delta="-10">-10</button>
        <button type="button" data-delta="10">+10</button>
        <button type="button" data-delta="25">+25</button>
        <button type="button" data-delta="50">+50</button>
      </div>

      <div class="form-group">
        <label>Relic-Specific Affinity Event</label>
        <select name="affinityEvent">
          <option value="">Manual / No preset event</option>
          ${TFREventOptions(relic)}
        </select>
      </div>

      <div class="form-group">
        <label>Timeline Note</label>
        <textarea name="note" placeholder="Example: Protected the sacred grove, freed prisoners, solved prophecy..."></textarea>
      </div>
    </section>

    <section class="tfr-tab-panel" data-panel="control">
      ${TFRControlPanelHtmlV2()}
    </section>

    <section class="tfr-tab-panel" data-panel="debug">
      <h3>Debug / Maintenance</h3>
      <p>Use the dialog buttons below for Save and Sync Item Stage.</p>
      <p>Console helpers:</p>
      <pre>await FirstRelics.auditInventorySync()
await FirstRelics.syncAllInventoryStages()</pre>
    </section>
  </div>
  `;

  const field = (root, name) => root.querySelector(`[name='${name}']`);

  const dialog = new foundry.applications.api.DialogV2({
    classes: ["tfr-dialog"],
    window: { title: "The First Relics — GM Affinity Dashboard", resizable: true },
    position: { width: 760, height: 720 },
    content,
    buttons: [
      {
        action: "save",
        label: "Save",
        default: true,
        callback: async (event, button, app) => {
          const root = app.element;
          const selectedRelic = field(root, "relic")?.value;
          const selectedRelicData = await TFRGetRelicById(selectedRelic);
          const selectedEventId = field(root, "affinityEvent")?.value;
          const selectedEvent = selectedEventId ? TFRGetAffinityEvent(selectedRelicData, selectedEventId) : null;
          const currentValue = Number(field(root, "affinity")?.value || 0);
          const noteText = field(root, "note")?.value;
          const refusesAttunement = !!field(root, "refusesAttunement")?.checked;

          await TFRSetRelicAttunementRefusal(selectedRelic, refusesAttunement);

          const beforeSaveState = await TFRGetRelicState(selectedRelic);
          beforeSaveState.requirements = beforeSaveState.requirements || {};
          for (const req of (selectedRelicData.hiddenRequirements || [])) {
            const input = root.querySelector(`[data-req-id="${req.id}"]`);
            if (input) beforeSaveState.requirements[req.id] = !!input.checked;
          }
          await TFRSetRelicState(selectedRelic, beforeSaveState);

          if (selectedEvent) {
            const newValue = Math.clamp(currentValue + Number(selectedEvent.delta || 0), 0, 1000);
            const sign = selectedEvent.delta >= 0 ? "+": "";
            const reason = noteText || `${sign}${selectedEvent.delta} [${selectedEvent.category}] ${selectedEvent.label}`;
            await TFRSetRelicAffinity(selectedRelic, newValue, reason);
          } else {
            const note = noteText || "Manual dashboard edit";
            await TFRSetRelicAffinity(selectedRelic, currentValue, note);
          }
        }
      },
      {
        action: "sync",
        label: "Sync Item Stage",
        callback: async (event, button, app) => {
          const selectedRelic = field(app.element, "relic")?.value;
          const value = Number(field(app.element, "affinity")?.value || 0);
          await TFRSetRelicAffinity(selectedRelic, value, "Manual stage sync from dashboard");
        }
      },
      { action: "close", label: "Close" }
    ]
  });

  await dialog.render({ force: true });
  const root = dialog.element;

  field(root, "relic")?.addEventListener("change", ev => {
    dialog.close();
    TFROpenDashboard(ev.currentTarget.value);
  });

  root.querySelectorAll(".tfr-tab-button").forEach(button => button.addEventListener("click", ev => {
    const tab = ev.currentTarget.dataset.tab || "overview";
    TFR_DASHBOARD_LAST_TAB = tab;
    TFRActivateDashboardTab(root, tab);
  }));

  field(root, "refusesAttunement")?.addEventListener("change", ev => {
    ev.currentTarget.closest(".tfr-attunement-control")?.classList.toggle("is-refusing", !!ev.currentTarget.checked);
  });

  TFRActivateDashboardTab(root, TFR_DASHBOARD_LAST_TAB);
  root.querySelector('.tfr-tab-panel[data-panel="control"] > p:first-child')?.remove();
  TFRWireControlPanel(root);

  root.querySelectorAll("[data-delta]").forEach(button => button.addEventListener("click", ev => {
    const input = field(root, "affinity");
    if (!input) return;
    const current = Number(input.value || 0);
    const delta = Number(ev.currentTarget.dataset.delta || 0);
    input.value = Math.clamp(current + delta, 0, 1000);
    const fill = root.querySelector(".tfr-affinity-fill");
    if (fill) fill.style.width = `${Number(input.value) / 10}%`;
  }));
}


async function TFRApplyAffinityEvent(relicId, eventId, extraNote = "") {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");
  const relic = await TFRGetRelicById(relicId);
  if (!relic) return ui.notifications.warn(`The First Relics: Relic not found: ${relicId}`);
  const event = TFRGetAffinityEvent(relic, eventId);
  if (!event) return ui.notifications.warn(`The First Relics: Event not found: ${eventId}`);
  const state = await TFRGetRelicState(relicId);
  const newValue = Math.clamp((Number(state.value) || 0) + Number(event.delta || 0), 0, 1000);
  const sign = event.delta >= 0 ? "+" : "";
  const reason = extraNote || `${sign}${event.delta} [${event.category}] ${event.label}`;
  return TFRSetRelicAffinity(relicId, newValue, reason);
}


async function TFRAuditRelics() {
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
    ui.notifications.warn(`The First Relics Audit: ${failed.length} relic(s) have missing data. Check console.`);
  } else {
    ui.notifications.info("The First Relics Audit: all loaded relics have required data.");
  }

  return rows;
}




async function TFRAuditMidiEffects() {
  const relics = await TFRLoadRelics();
  const cloak = relics.find(r => r.id === "cloak_feywilds");
  if (!cloak) {
    ui.notifications.warn(`${TFR_CLOAK_DISPLAY_NAME} not found.`);
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
  ui.notifications.info("Midi effect audit complete. Check console.");
  return rows;
}


async function TFRAuditActivities() {
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
  ui.notifications.info("The First Relics Activity Audit complete. Check console.");
  return rows;
}



function TFRResolveActor(actorOrId = null) {
  if (actorOrId?.documentName === "Actor") return actorOrId;
  if (typeof actorOrId === "string") return game.actors.get(actorOrId) || game.actors.getName(actorOrId) || canvas.tokens?.get(actorOrId)?.actor;
  return canvas.tokens?.controlled?.[0]?.actor || game.user.character || null;
}

function TFRTokenForActor(actor) {
  if (!actor) return null;
  const controlled = canvas?.tokens?.controlled || [];
  const selected = controlled.find(t => t?.actor?.id === actor.id);
  if (selected) return selected;
  return canvas?.tokens?.placeables?.find(t => t?.actor?.id === actor.id) || null;
}

function TFRGetActorRelicItem(actor, relicId) {
  if (!actor) return null;
  const flagged = actor.items.find(item => item.getFlag("the-first-relics", "relicId") === relicId);
  if (flagged) return flagged;
  const names = {
    cloak_feywilds: TFR_CLOAK_DISPLAY_NAME,
    mantle_first_seer: "Mantle of the First Seer",
    manacles_unbroken: "Girdle of the Unbroken",
    chains_patron: "Chains of the Patron"
  };
  if (relicId === "cloak_feywilds") {
    return actor.items.find(item => TFR_CLOAK_ITEM_NAMES.has(item.name))
      || game.items.find(item => TFR_CLOAK_ITEM_NAMES.has(item.name));
  }
  return actor.items.getName(names[relicId]) || game.items.getName(names[relicId]);
}

function TFRGetSelectedTargetActor() {
  return Array.from(game.user.targets || [])[0]?.actor || null;
}

async function TFRSpendRelicCharges(item, charges) {
  charges = Number(charges || 0);
  if (charges <= 0) return true;
  if (!item) return false;
  const spent = Number(item.system?.uses?.spent || 0);
  const max = Number(item.system?.uses?.max || 0);
  const remaining = Math.max(max - spent, 0);
  if (remaining < charges) {
    ui.notifications.warn(`${item.name}: Not enough charges. Required ${charges}, remaining ${remaining}.`);
    return false;
  }
  await item.update({ "system.uses.spent": spent + charges });
  return true;
}

function TFREffectData(name, img, changes, rounds = 10, seconds = 60, origin = null) {
  return {
    name, img, origin, transfer: false, disabled: false,
    changes,
    duration: { rounds, seconds },
    flags: { dae: { transfer: false, stackable: "noneName", specialDuration: [] } }
  };
}

async function TFRSafeDeleteDocument(document, context = "") {
  if (!document) return false;
  try {
    const parent = document.parent || null;
    const collection = parent?.effects || parent?.items || null;
    const id = document.id || document._id;

    // If Foundry or another module already removed the embedded document, do not ask the server
    // to delete it again. This avoids harmless-but-noisy "ActiveEffect does not exist" errors.
    if (collection?.get && id && !collection.get(id)) return false;
    if (document.deleted) return false;

    await document.delete();
    return true;
  } catch (err) {
    const message = String(err?.message || err || "");
    if (message.includes("does not exist") || message.includes("not found") || message.includes("No document")) {
      console.debug(`The First Relics | skipped stale delete${context ? ` (${context})` : ""}:`, message);
      return false;
    }
    console.warn(`The First Relics | failed to delete document${context ? ` (${context})` : ""}:`, err);
    return false;
  }
}

async function TFRApplyOrRefreshEffect(actor, effectData) {
  if (!actor) return null;
  const existing = actor.effects.find(e => e.name === effectData.name);
  if (existing) await TFRSafeDeleteDocument(existing, `refresh effect ${effectData.name}`);
  const [created] = await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  return created;
}

function TFRChatFlags(extra = {}) {
  return {
    [TFR_MODULE_ID]: {
      tfrAutomationMessage: true,
      ...(extra || {})
    }
  };
}

function TFRAbilityHelperKind({ applied = false, saveQueued = false, spec = {} } = {}) {
  if (saveQueued) return "Save Resolver";
  if (applied) return "Module Helper";
  if (spec?.note) return "Manual Reminder";
  return "Helper";
}

function TFRAbilityHelperChatContent({ relic, def, spec = {}, applied = false, saveQueued = false } = {}) {
  const ability = TFREscapeHtml(def?.name || "Relic Ability");
  const relicName = TFREscapeHtml(relic?.name || "The First Relic");
  const kind = TFRAbilityHelperKind({ applied, saveQueued, spec });
  const status = saveQueued
    ? `Waiting for the save roll and GM resolver before applying ${TFREscapeHtml(spec.condition || "the condition")}.`
    : applied
      ? "Module helper effects were applied or queued."
      : "No direct game effect was applied by the module.";
  const note = spec.note ? `<li><strong>Manual Reminder.</strong> ${TFREscapeHtml(spec.note)}</li>` : "";

  return `
    <div class="tfr-ability-helper-card" data-tfr-helper-kind="${TFREscapeHtml(kind)}">
      <h2>${ability}</h2>
      <p><strong>${relicName}</strong> - ${TFREscapeHtml(kind)}</p>
      <ul>
        <li>${status}</li>
        ${note}
      </ul>
    </div>
  `;
}


function TFRGetSelectedTargetToken() {
  return Array.from(game.user?.targets || [])[0] || null;
}

function TFRGetConditionIcon(statusId = "restrained") {
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

async function TFRApplyRestrainedCondition(sourceActor, targetActorOrToken = null, item = null) {
  const { targetActor, targetToken } = TFRResolveActorTokenForEffect(targetActorOrToken);

  if (!targetActor) {
    ui.notifications.warn("Briar Snare: target one creature before applying Restrained.");
    return null;
  }

  if (TFRActorHasCondition(targetActor, "restrained")) {
    ui.notifications.info(`${targetActor.name} is already Restrained.`);
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
    ui.notifications.info(`Briar Snare: Restrained applied to ${targetActor.name}.`);
    return targetActor.effects?.find(e => {
      const statuses = e.statuses instanceof Set ? Array.from(e.statuses) : Array.from(e.statuses || []);
      return statuses.includes("restrained") || String(e.name || e.label || "").toLowerCase().includes("restrained");
    }) || true;
  }

  const [created] = await targetActor.createEmbeddedDocuments("ActiveEffect", [TFRRestrainedEffectData(sourceActor, item)], { render: false });
  ui.notifications.info(`Briar Snare: Restrained applied to ${targetActor.name}.`);
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

function TFRRegisterTimedEffectExpiry() {
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

async function TFRApplyStatusCondition(sourceActor, targetActorOrToken = null, item = null, statusId = "restrained", label = "Relic Condition", rounds = 10, seconds = 60, changes = [], options = {}) {
  const { targetActor, targetToken } = TFRResolveActorTokenForEffect(targetActorOrToken);
  const status = String(statusId || "").toLowerCase();

  if (!targetActor) {
    ui.notifications.warn(`${label}: target one creature first.`);
    return null;
  }

  const isTimed = TFRIsTimedEffectDuration(rounds, seconds) || !!options?.expireOnTurnEnd;

  if (status && TFRActorHasCondition(targetActor, status) && !isTimed) {
    ui.notifications.info(`${targetActor.name} already has ${status}.`);
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
      ui.notifications.info(`${label}: ${status || "effect"} applied to ${targetActor.name}.`);
      return TFRFindActorConditionEffects(targetActor, status)[0] || true;
    }
  }

  const existingSameName = targetActor.effects?.find(e => String(e.name || e.label || "") === String(label || ""));
  if (existingSameName) await TFRSafeDeleteDocument(existingSameName, `replace condition ${label}`);

  const [created] = await targetActor.createEmbeddedDocuments("ActiveEffect", [
    TFRStatusEffectData(status, label, sourceActor, item, rounds, seconds, changes, options)
  ]);
  ui.notifications.info(`${label}: applied to ${targetActor.name}.`);
  return created;
}

async function TFRRemoveActorConditions(actor, conditionIds = []) {
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

function TFRCollectionToArray(value) {
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

function TFRUniqueActorTokenRefs(values) {
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

function TFRWorkflowMatchesPending(workflow, pending) {
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

function TFRExtractWorkflowFailedSaveRefs(workflow) {
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

async function TFRApplyConditionSpecToRefs(sourceActor, relic, item, def, spec, refs, { source = "save-aware" } = {}) {
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

async function TFRCreateManualSaveResolverCard(pending) {
  if (!pending || pending.resolverMessageId) return null;
  const actor = game.actors?.get?.(pending.actorId) || game.actors?.getName?.(pending.actorName) || null;
  const relic = await TFRGetRelicById(pending.relicId);
  const def = relic ? TFRGetAbilityDefinition(relic, pending.slot) : null;
  const spec = TFRRelicAbilityRuntimeSpec(pending.relicId, pending.slot);
  if (!actor || !relic || !def || !spec?.condition) return null;

  const saveText = def.save ? `${String(def.save).toUpperCase()} save` : "saving throw";
  const conditionText = TFREscapeHtml(spec.condition);
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
          <p><strong>${itemText}</strong> requires a ${TFREscapeHtml(saveText)} before applying <strong>${conditionText}</strong>.</p>
          <p>After the save roll is visible, target only the creature(s) that failed, then press the apply button. If all targets succeeded, clear it.</p>
          <div class="tfr-save-resolver-buttons" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
            <button type="button" data-tfr-save-action="apply-targets" data-tfr-pending-id="${pending.id}">Apply ${conditionText} to Targeted Failed Save(s)</button>
            <button type="button" data-tfr-save-action="clear" data-tfr-pending-id="${pending.id}">No Effect / Clear</button>
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

async function TFRQueueSaveAwareCondition(actor, relicId, slot, options = {}) {
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
    ui.notifications.warn(`${def.name}: save resolver is pending. Target failed save creature(s), then use the resolver card.`);
  }, TFR_SAVE_AWARE_TIMEOUT_MS);

  return { queued: true, id, ability: def.name, chatMessage: null };
}

function TFRCurrentTargetRefs() {
  return TFRUniqueActorTokenRefs(Array.from(game.user?.targets || []));
}

async function TFRResolveSaveAwareManual(pendingId, action = "apply-targets") {
  if (!game.user?.isGM) return ui.notifications.warn("The First Relics: GM only.");
  const pending = TFR_SAVE_AWARE_PENDING.get(pendingId);
  if (!pending) {
    ui.notifications.warn("The First Relics: this save resolver is no longer pending. It may have already resolved automatically or been cleared.");
    return { ok: false, issue: "not pending" };
  }
  const actor = game.actors?.get?.(pending.actorId) || game.actors?.getName?.(pending.actorName) || null;
  const relic = await TFRGetRelicById(pending.relicId);
  const item = actor ? TFRFindActorRelicItem(actor, pending.relicId) : null;
  const def = relic ? TFRGetAbilityDefinition(relic, pending.slot) : null;
  const spec = TFRRelicAbilityRuntimeSpec(pending.relicId, pending.slot);
  if (!actor || !relic || !item || !def || !spec?.condition) {
    ui.notifications.warn("The First Relics: save resolver data is missing. Check console.");
    console.warn("The First Relics | save resolver missing data", { pending, actor, relic, item, def, spec });
    return { ok: false, issue: "missing data" };
  }

  if (action === "clear") {
    TFR_SAVE_AWARE_PENDING.delete(pendingId);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: TFRChatFlags({ saveAwareManualCleared: true, relicId: pending.relicId, slot: pending.slot, pendingId }),
      content: `<h2>${TFREscapeHtml(def.name)}</h2><p><strong>Save resolver:</strong> cleared. No ${TFREscapeHtml(spec.condition)} condition was applied.</p>`
    });
    return { ok: true, cleared: true };
  }

  const refs = TFRCurrentTargetRefs();
  if (!refs.length) {
    ui.notifications.warn(`${def.name}: target the creature(s) that failed the save, then press Apply again.`);
    return { ok: false, issue: "no targets" };
  }

  const names = await TFRApplyConditionSpecToRefs(actor, relic, item, def, spec, refs, { source: "manual-resolver" });
  TFR_SAVE_AWARE_PENDING.delete(pendingId);
  await TFRLogRelicTimelineSafe(pending.relicId, { type: "Manual Save Resolver", slot: pending.slot, actor: actor.name, activity: def.name, reason: names.length ? `Applied ${spec.condition} to manually selected failed save target(s): ${names.join(", ")}.` : "No manual failed save targets selected." });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ saveAwareManualResolved: true, relicId: pending.relicId, slot: pending.slot, pendingId, failed: names.length }),
    content: `<h2>${TFREscapeHtml(def.name)}</h2><p><strong>Manual save resolver:</strong> applied <strong>${TFREscapeHtml(spec.condition)}</strong> to ${TFREscapeHtml(names.join(", ") || "no targets")}.</p>`
  });
  return { ok: true, applied: names };
}

function TFRRegisterSaveAwareChatButtons() {
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
      ui.notifications.error("The First Relics save resolver failed. Check console.");
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
    content: `<h2>${TFREscapeHtml(def.name)}</h2><p><strong>Native save resolver:</strong> ${names.length ? `applied <strong>${TFREscapeHtml(spec.condition)}</strong> to ${names.map(TFREscapeHtml).join(", ")}.` : "all targets succeeded; no condition applied."}</p>`
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

function TFRRegisterSaveAwareAutomation() {
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

function TFRAuditSaveAwarePending() {
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
  ui.notifications.info(`The First Relics: ${rows.length} pending save-aware helper(s).`);
  return rows;
}

function TFRActorTotalLevel(actor) {
  const direct = Number(actor?.system?.details?.level);
  if (Number.isFinite(direct) && direct > 0) return direct;
  let total = 0;
  for (const item of actor?.items || []) {
    if (item.type === "class") total += Number(item.system?.levels || 0) || 0;
  }
  return total || Number(actor?.system?.details?.cr) || 1;
}

async function TFRApplyTempHp(actor, amount, label = "Temporary Hit Points") {
  if (!actor || !Number.isFinite(Number(amount))) return false;
  const current = Number(actor.system?.attributes?.hp?.temp || 0) || 0;
  const next = Math.max(current, Number(amount));
  if (next > current) await actor.update({ "system.attributes.hp.temp": next });
  ui.notifications.info(`${label}: ${actor.name} has ${next} temp HP.`);
  return true;
}

async function TFRApplyVerdantSnare(actor, targetActor = null, item = null, options = {}) {
  const targetToken = TFRGetSelectedTargetToken();
  const target = targetActor || targetToken?.actor || null;
  if (!target) {
    ui.notifications.warn("Briar Snare: target one creature first.");
    return null;
  }

  const effect = await TFRApplyRestrainedCondition(actor, targetToken || target, item);
  const note = options.fromDnd5eCard
    ? "dnd5e consumed the resource. Restrained was applied as a GM helper; remove it if the target succeeds its save."
    : "Restrained was applied as a GM helper; remove it if the target succeeds its save.";

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ ability: "verdantSnare", targetActorId: target.id }),
    content: `<h2>Briar Snare</h2><p>Target: ${target.name}. ${note}</p>`
  });
}


async function TFRApplyCloakMark(sourceActor, targetActor) {
  if (!sourceActor || !targetActor) {
    ui.notifications.warn(`${TFR_CLOAK_DISPLAY_NAME}: select a target token first.`);
    return null;
  }
  const effect = TFREffectData(
    `Marked by the First Hunt (${sourceActor.name})`,
    "modules/the-first-relics/art/icons/cloak-feywilds.svg",
    [{ key: "flags.the-first-relics.markedByFirstHunt", mode: TFRMode("OVERRIDE"), value: sourceActor.id, priority: 20 }],
    10, 60
  );
  const created = await TFRApplyOrRefreshEffect(targetActor, effect);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
    flags: TFRChatFlags({ ability: "arrowFirstHunt", targetActorId: targetActor.id }),
    content: `<h2>Marked by the First Hunt</h2><p>${targetActor.name} is marked by ${sourceActor.name}. Resolve invisibility denial, tracking, Avatar advantage, and Signature interactions manually where needed.</p>`
  });
  return created;
}

async function TFRApplyNaturePursuit(actor, item) {
  const effect = TFREffectData(
    "Nature's Pursuit",
    item?.img || "modules/the-first-relics/art/icons/cloak-feywilds.svg",
    [{ key: "system.attributes.movement.walk", mode: TFRMode("ADD"), value: "10", priority: 20 }],
    10, 60, item?.uuid
  );
  await TFRApplyOrRefreshEffect(actor, effect);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ ability: "naturesPursuit" }),
    content: `<h2>Nature's Pursuit</h2><p>${actor.name}'s speed increases by 10 ft for 1 minute. Ignore nonmagical difficult terrain and long-range disadvantage manually where needed.</p>`
  });
}

async function TFRApplyCloakAvatar(actor, item) {
  const effect = TFREffectData(
    "Avatar of the First Hunt",
    item?.img || "modules/the-first-relics/art/icons/cloak-feywilds.svg",
    [
      { key: "system.attributes.movement.fly", mode: TFRMode("UPGRADE"), value: "40", priority: 20 },
      { key: "system.attributes.movement.hover", mode: TFRMode("OVERRIDE"), value: "true", priority: 20 },
      { key: "system.bonuses.abilities.save", mode: TFRMode("ADD"), value: "+1", priority: 20 }
    ],
    10, 60, item?.uuid
  );
  await TFRApplyOrRefreshEffect(actor, effect);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: TFRChatFlags({ ability: "avatar" }),
    content: `<h2>Avatar of the First Hunt</h2><p>${actor.name} manifests Sylvara's hunt. Fly 40 ft, hover, and helper bonuses are applied. Resolve marked target advantage, cover ignore, beast behavior, and terrain narration manually.</p>`
  });
}


function TFRRelicStageBonusFromItem(relic, item) {
  const stage = item ? TFRRelicItemStage(item) : "dormant";
  return Number(TFRGetStageData(relic, stage)?.bonus || 1) || 1;
}

function TFREffectChangesForRelicAbility(relicId, slot, relic = null, item = null) {
  const bonus = relic ? TFRRelicStageBonusFromItem(relic, item) : 1;
  const add = TFRMode("ADD");
  const upgrade = TFRMode("UPGRADE");
  const override = TFRMode("OVERRIDE");
    const common = {
    cloak_feywilds: {
      active2: [{ key: "flags.the-first-relics.markedByFirstHunt", mode: override, value: "true", priority: 20 }],
      active3: [{ key: "system.attributes.movement.walk", mode: add, value: "10", priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.bonuses.rwak.attack", mode: add, value: `+${bonus}`, priority: 20 }
      ]
    },
    mantle_first_seer: {
      active1: [{ key: "system.bonuses.abilities.check", mode: add, value: `+${bonus}`, priority: 20 }],
      active4: [{ key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.attributes.senses.truesight", mode: upgrade, value: "30", priority: 20 },
        { key: "system.bonuses.abilities.check", mode: add, value: `+${bonus}`, priority: 20 },
        { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
      ]
    },
    manacles_unbroken: {
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.traits.ci.value", mode: add, value: "prone", priority: 20 }
      ],
      signature: [
        { key: "system.traits.ci.value", mode: add, value: "frightened", priority: 20 },
        { key: "system.traits.ci.value", mode: add, value: "paralyzed", priority: 20 },
        { key: "system.traits.ci.value", mode: add, value: "prone", priority: 20 }
      ]
    },
    chains_patron: {
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "necrotic", priority: 20 }
      ]
    },
    aegis_dawn: {
      active1: [{ key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }],
      active2: [{ key: "system.attributes.ac.bonus", mode: add, value: "4", priority: 20 }],
      active3: [{ key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "bludgeoning", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "piercing", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "slashing", priority: 20 },
        { key: "system.bonuses.mwak.damage", mode: add, value: "+2d8[radiant]", priority: 20 },
        { key: "system.bonuses.rwak.damage", mode: add, value: "+2d8[radiant]", priority: 20 }
      ]
    },
    crown_conqueror: {
      active3: [{ key: "system.attributes.ac.bonus", mode: add, value: "2", priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "psychic", priority: 20 },
        { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
      ]
    },
    bands_inner_dragon: {
      active1: [
        { key: "system.attributes.movement.walk", mode: add, value: "10", priority: 20 },
        { key: "system.attributes.movement.climb", mode: upgrade, value: "30", priority: 20 }
      ],
      active3: [
        { key: "system.attributes.ac.bonus", mode: add, value: "2", priority: 20 },
        { key: "system.bonuses.abilities.check", mode: add, value: `+${bonus}`, priority: 20 }
      ],
      active4: [{ key: "flags.the-first-relics.perfectStrikeReady", mode: override, value: "true", priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "force", priority: 20 },
        { key: "system.bonuses.mwak.damage", mode: add, value: "+2d10[force]", priority: 20 }
      ],
      signature: [
        { key: "system.attributes.movement.walk", mode: add, value: "30", priority: 20 },
        { key: "system.traits.ci.value", mode: add, value: "stunned", priority: 20 },
        { key: "system.traits.ci.value", mode: add, value: "restrained", priority: 20 }
      ]
    },
    cloak_shadowfell: {
      active2: [{ key: "flags.midi-qol.advantage.attack.all", mode: override, value: "1", priority: 20 }],
      active3: [{ key: "flags.the-first-relics.livingDarkness", mode: override, value: "true", priority: 20 }],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "necrotic", priority: 20 },
        { key: "flags.the-first-relics.ignoreOpportunityAttacks", mode: override, value: "true", priority: 20 }
      ]
    },
    heart_yggdrasil: {
      active3: [
        { key: "system.traits.dr.value", mode: add, value: "acid", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "cold", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "fire", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "lightning", priority: 20 }
      ],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "30", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "acid", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "cold", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "fire", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "lightning", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "poison", priority: 20 }
      ]
    },
    vestments_first_saint: {
      active1: [
        { key: "system.bonuses.abilities.save", mode: add, value: "+1d4", priority: 20 },
        { key: "system.bonuses.abilities.check", mode: add, value: "+1d4", priority: 20 },
        { key: "system.bonuses.mwak.attack", mode: add, value: "+1d4", priority: 20 },
        { key: "system.bonuses.rwak.attack", mode: add, value: "+1d4", priority: 20 },
        { key: "system.bonuses.msak.attack", mode: add, value: "+1d4", priority: 20 },
        { key: "system.bonuses.rsak.attack", mode: add, value: "+1d4", priority: 20 }
      ],
      active3: [
        { key: "system.traits.dr.value", mode: add, value: "bludgeoning", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "piercing", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "slashing", priority: 20 }
      ],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "radiant", priority: 20 }
      ]
    },
    blood_first_dragon: {
      active2: [
        { key: "system.bonuses.mwak.damage", mode: add, value: "+2d6[fire]", priority: 20 },
        { key: "system.bonuses.rwak.damage", mode: add, value: "+2d6[fire]", priority: 20 }
      ],
      active3: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "60", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 }
      ],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "80", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "fire", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "cold", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "lightning", priority: 20 },
        { key: "system.bonuses.mwak.damage", mode: add, value: "+2d10[fire]", priority: 20 },
        { key: "system.bonuses.rwak.damage", mode: add, value: "+2d10[fire]", priority: 20 }
      ],
      signature: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "80", priority: 20 },
        { key: "system.attributes.movement.hover", mode: override, value: "true", priority: 20 },
        { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
      ]
    },
    lyre_first_song: {
      active2: [
        { key: "system.bonuses.mwak.attack", mode: add, value: "+1", priority: 20 },
        { key: "system.bonuses.rwak.attack", mode: add, value: "+1", priority: 20 },
        { key: "system.bonuses.msak.attack", mode: add, value: "+1", priority: 20 },
        { key: "system.bonuses.rsak.attack", mode: add, value: "+1", priority: 20 },
        { key: "system.bonuses.mwak.damage", mode: add, value: "+1", priority: 20 },
        { key: "system.bonuses.rwak.damage", mode: add, value: "+1", priority: 20 }
      ],
      active4: [
        { key: "system.attributes.ac.bonus", mode: add, value: "2", priority: 20 },
        { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 }
      ],
      avatar: [
        { key: "system.attributes.movement.fly", mode: upgrade, value: "40", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "radiant", priority: 20 },
        { key: "system.traits.dr.value", mode: add, value: "psychic", priority: 20 }
      ],
      signature: [
        { key: "system.attributes.ac.bonus", mode: add, value: "2", priority: 20 },
        { key: "system.bonuses.abilities.save", mode: add, value: `+${bonus}`, priority: 20 },
        { key: "system.bonuses.abilities.check", mode: add, value: `+${bonus}`, priority: 20 },
        { key: "system.bonuses.mwak.attack", mode: add, value: "+2", priority: 20 },
        { key: "system.bonuses.rwak.attack", mode: add, value: "+2", priority: 20 }
      ]
    }
  };
  return foundry.utils.deepClone(common[relicId]?.[slot] || []);
}

function TFRRelicAbilityEffectData(relic, slot, item = null, actor = null) {
  if (!relic || !slot) return null;
  const def = TFRGetAbilityDefinition(relic, slot);
  const changes = TFREffectChangesForRelicAbility(relic.id, slot, relic, item);
  const img = item?.img || relic.icon || "icons/svg/aura.svg";
  const name = def?.name || slot;
  if (!changes.length && !["signature", "avatar"].includes(slot)) return null;
  return TFREffectData(`${name} — ${relic.name}`, img, changes, 10, 60, item?.uuid || null);
}

function TFRRelicAbilityRuntimeSpec(relicId, slot) {
  const specs = {
    cloak_feywilds: {
      active1: { teleport: true }, active2: { targetEffect: true, note: "Marked prey helper applied." }, active3: { selfEffect: true },
      active4: { condition: "restrained", targetName: "Restrained — Briar Snare", rounds: 1, seconds: 6 }, avatar: { selfEffect: true }, signature: { selfEffect: true }
    },
    mantle_first_seer: {
      active1: { selfEffect: true, rounds: 2, seconds: 12 },
      active2: { note: "Moment of Clarity is manual: after the d20 is rolled but before the outcome, add or subtract the relic bonus." },
      active3: { note: "Threads of Fate is manual: force the visible d20 result to be rerolled, then resolve the chosen result." },
      active4: { selfEffect: true, rounds: 1, seconds: 6 },
      avatar: { selfEffect: true },
      signature: { note: "Chronicle Unwritten is manual: after seeing the d20 result but before the outcome, force a reroll and choose the final result." }
    },
    manacles_unbroken: {
      active1: { removeSelf: ["prone"], tempHp: "level+bonus", rounds: 1, seconds: 6 },
      active3: { note: "Refuse the Fall is manual: reroll the failed Strength, Constitution, or Wisdom save and use the new result." },
      active4: { note: "Hold the World is manual: protect the chosen creature within 10 ft, then resolve the AC bonus, movement, or intercepted effect with the GM." },
      avatar: { selfEffect: true },
      signature: { selfEffect: true }
    },
    chains_patron: {
      active1: { note: "Patron's Glance is manual: the GM reveals pact, curse, oath, or binding information about the target." },
      active3: { condition: "restrained", targetName: "Restrained — Chain of Binding", rounds: 1, seconds: 6 },
      active4: { note: "Pay the Difference is manual: take the approved necrotic cost, then reroll the failed saving throw." },
      avatar: { selfEffect: true },
      signature: { condition: "restrained", targetName: "Restrained — Price of Eternity", extraTargetChanges: [{ key: "flags.the-first-relics.teleportBlocked", mode: TFRMode("OVERRIDE"), value: "true", priority: 20 }, { key: "flags.the-first-relics.invisibilityBlocked", mode: TFRMode("OVERRIDE"), value: "true", priority: 20 }], rounds: 10, seconds: 60 }
    },
    aegis_dawn: { active1: { selfEffect: true, rounds: 1, seconds: 6 }, active2: { targetEffect: true, rounds: 1, seconds: 6 }, active3: { selfEffect: true }, active4: { condition: "blinded", targetName: "Blinded — Break the Darkness", rounds: 1, seconds: 6 }, avatar: { selfEffect: true }, signature: { removeTarget: ["frightened", "charmed"], note: "Last Sunrise healing/refusal is GM-resolved; fear/charm cleanup helper ran on the selected target if any." } },
    crown_conqueror: {
      active1: { note: "Rally is manual: choose the ally, then apply the relic's morale/leadership benefit for the current scene." },
      active2: { condition: "charmed", targetName: "Compelled — Royal Decree", rounds: 1, seconds: 6 },
      active3: { selfEffect: true },
      active4: { note: "March of Kings is manual: move or reposition the chosen ally/creature as the table resolves the command." },
      avatar: { selfEffect: true },
      signature: { condition: "frightened", targetName: "Kneeling — The World Shall Kneel", rounds: 10, seconds: 60, extraTargetChanges: [{ key: "system.attributes.movement.walk", mode: TFRMode("OVERRIDE"), value: "0", priority: 20 }, { key: "system.attributes.movement.fly", mode: TFRMode("OVERRIDE"), value: "0", priority: 20 }, { key: "system.attributes.movement.climb", mode: TFRMode("OVERRIDE"), value: "0", priority: 20 }, { key: "flags.midi-qol.noReactions", mode: TFRMode("OVERRIDE"), value: "1", priority: 20 }], alsoProne: true }
    },
    bands_inner_dragon: {
      active1: { selfEffect: true },
      active2: { note: "Iron Soul is manual: use the reaction benefit against the triggering effect, then resolve the reduced or resisted result." },
      active3: { selfEffect: true },
      active4: { selfEffect: true, rounds: 2, seconds: 12 },
      avatar: { selfEffect: true },
      signature: { selfEffect: true }
    },
    cloak_shadowfell: { active1: { teleport: true }, active2: { conditionSelf: "invisible", selfName: "Invisible — Fade Away", rounds: 1, seconds: 6, expireOnTurnEnd: true }, active3: { selfEffect: true, note: "Living Darkness template/area still needs GM placement; darkness state helper applied to bearer." }, avatar: { selfEffect: true }, signature: { teleport: true, note: "One Step Behind damage is rolled by the activity; teleport helper can be used for shadow movement." } },
    heart_yggdrasil: { active1: { note: "Verdant Bloom is manual: place and resolve the plant/terrain growth area with the GM." }, active3: { selfEffect: true }, active4: { condition: "restrained", targetName: "Restrained — Roots of Eternity", rounds: 10, seconds: 60 }, avatar: { selfEffect: true }, signature: { removeTarget: ["poisoned", "diseased", "frightened", "charmed"], note: "World Reborn healing/damage is GM-resolved; cleanup helper ran on selected target if any." } },
    vestments_first_saint: { active1: { targetEffect: true }, active2: { removeTarget: ["poisoned", "diseased", "frightened", "charmed"], note: "Cleansing Light helper removed common conditions from the selected target." }, active3: { selfEffect: true }, avatar: { selfEffect: true }, signature: { removeTarget: ["poisoned", "diseased", "frightened", "charmed", "paralyzed", "stunned"], note: "Miracle cleanup helper ran on selected target; resurrection/healing remains GM-resolved." } },
    blood_first_dragon: { active1: { condition: "frightened", targetName: "Frightened — Draconic Roar", rounds: 1, seconds: 6 }, active2: { selfEffect: true }, active3: { selfEffect: true }, avatar: { selfEffect: true }, signature: { selfEffect: true } },
    lyre_first_song: { active2: { selfEffect: true }, active3: { condition: "silenced", targetName: "Silenced — Verse of Silence", rounds: 10, seconds: 60 }, active4: { selfEffect: true, tempHp: "10+bonus" }, avatar: { selfEffect: true }, signature: { selfEffect: true, condition: "charmed", targetName: "Charmed — The First Song", rounds: 10, seconds: 60 } }
  };
  return specs[relicId]?.[slot] || {};
}

async function TFRExecuteRelicTeleport({ token = null, actor = null, relicId, slot, consumeCharges = false, message = null } = {}) {
  token = token || (actor ? TFRTokenForActor(actor) : TFRSelectedToken());
  if (!token) { ui.notifications.warn("Relic teleport: select the bearer's token first."); return { ok: false, issue: "No token" }; }
  actor = actor || token.actor;
  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === relicId);
  const item = TFRFindActorRelicItem(actor, relicId);
  const def = relic ? TFRGetAbilityDefinition(relic, slot) : null;
  if (!actor || !relic || !item || !def) return { ok: false, issue: "Missing relic teleport data" };
  if (TFRBlockRelicFeatureUse(item, def.name || "Relic teleport")) return { ok: false, issue: "Attunement refused" };
  const range = def.range || 30;
  const from = TFRTokenCenter(token);
  const destination = await TFRPickCanvasPointWithRange({ origin: from, rangeFeet: range, message: message || `${def.name}: click a destination within ${range} ft. Press Esc to cancel.` });
  if (!destination) return { ok: false, issue: "Cancelled" };
  const distance = TFRDistanceFeet(from, destination);
  if (distance > range + 0.001) { ui.notifications.warn(`${def.name}: destination is ${distance.toFixed(1)} ft away, max is ${range} ft.`); return { ok: false, issue: "Out of range" }; }
  if (consumeCharges && !(await TFRSpendRelicCharges(item, def.charges || 0))) return { ok: false, issue: "Not enough charges" };
  const topLeft = TFRDestinationTopLeftForToken(token, destination);
  const restoreTeleportVisual = await TFRPlaySimpleTeleportAnimation(token, destination);
  await TFRMoveTokenAsTeleport(token, topLeft);
  if (typeof restoreTeleportVisual === "function") await restoreTeleportVisual();
  await TFRLogRelicTimelineSafe(relicId, { type: "Automation Execute", slot, actor: actor.name, activity: def.name, reason: `${actor.name} used ${def.name} (${distance.toFixed(1)} ft).${consumeCharges ? "" : " Charges were already consumed by dnd5e."}` });
  return { ok: true, relic: relic.name, activity: def.name, actor: actor.name, distance: Number(distance.toFixed(2)) };
}

async function TFRApplyRelicAbilityRuntime(actor, relicId, slot, options = {}) {
  if (!actor || !relicId || !slot) return null;
  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === relicId);
  const item = TFRFindActorRelicItem(actor, relicId);
  if (!relic || !item) return null;
  const def = TFRGetAbilityDefinition(relic, slot);
  if (TFRBlockRelicFeatureUse(item, def?.name || "Relic ability")) return { ok: false, issue: "Attunement refused" };
  const spec = TFRRelicAbilityRuntimeSpec(relicId, slot);
  const targetToken = TFRGetSelectedTargetToken();
  const targetActor = targetToken?.actor || TFRGetSelectedTargetActor();
  const effect = TFRRelicAbilityEffectData(relic, slot, item, actor);
  let applied = false;

  if (TFRShouldPreferNativeActivityEffects(relic, slot, options) && TFRRuntimeWorkCoveredByNativeEffects(spec)) {
    await TFRLogRelicTimelineSafe(relicId, {
      type: "Native Activity Effect",
      slot,
      actor: actor.name,
      activity: def?.name || slot,
      reason: `${actor.name} used ${def?.name || slot}. Effects are available on the native dnd5e chat card.`
    });
    return null;
  }

  if (spec.teleport) { const token = TFRTokenFromChatMessage(options.message, actor) || TFRTokenForActor(actor) || TFRSelectedToken(); await TFRExecuteRelicTeleport({ token, actor, relicId, slot, consumeCharges: options.spendCharges === true }); applied = true; }
  if (spec.removeSelf?.length) { await TFRRemoveActorConditions(actor, spec.removeSelf); applied = true; }
  if (spec.selfEffect && effect) { if (spec.rounds || spec.seconds) effect.duration = { ...(effect.duration || {}), rounds: spec.rounds, seconds: spec.seconds }; await TFRApplyOrRefreshEffect(actor, effect); applied = true; }
  if (spec.conditionSelf) { await TFRApplyStatusCondition(actor, actor, item, spec.conditionSelf, spec.selfName || `${def?.name} — ${relic.name}`, spec.rounds || 10, spec.seconds || 60, [], { expireOnTurnEnd: !!spec.expireOnTurnEnd }); applied = true; }
  if (spec.targetEffect) { if (!targetActor) ui.notifications.warn(`${def?.name || "Relic ability"}: target one creature first for the helper effect.`); else if (effect) { if (spec.rounds || spec.seconds) effect.duration = { ...(effect.duration || {}), rounds: spec.rounds, seconds: spec.seconds }; await TFRApplyOrRefreshEffect(targetActor, effect); applied = true; } }
  let saveQueued = false;
  let saveQueueResult = null;
  if (spec.condition) {
    const saveConditionNeedsResolver = def?.type === "save" && options.forceApplyCondition !== true;
    if (saveConditionNeedsResolver) {
      saveQueueResult = await TFRQueueSaveAwareCondition(actor, relicId, slot, options);
      saveQueued = !!saveQueueResult?.queued;
      applied = applied || saveQueued;
    } else if (!targetActor) {
      ui.notifications.warn(`${def?.name || "Relic ability"}: target one creature first for the condition helper.`);
    } else {
      const changes = foundry.utils.deepClone(spec.extraTargetChanges || []);
      await TFRApplyStatusCondition(actor, targetToken || targetActor, item, spec.condition, spec.targetName || `${def?.name} — ${relic.name}`, spec.rounds || 10, spec.seconds || 60, changes, { expireOnTurnEnd: !!spec.expireOnTurnEnd });
      if (spec.alsoProne) await TFRApplyStatusCondition(actor, targetToken || targetActor, item, "prone", "Prone — The World Shall Kneel", spec.rounds || 10, spec.seconds || 60, [], { expireOnTurnEnd: !!spec.expireOnTurnEnd });
      applied = true;
    }
  }
  if (spec.removeTarget?.length) { if (!targetActor) ui.notifications.warn(`${def?.name || "Relic ability"}: target a creature to run cleanup helper.`); else { await TFRRemoveActorConditions(targetActor, spec.removeTarget); applied = true; } }
  if (spec.tempHp) { const bonus = TFRRelicStageBonusFromItem(relic, item); let amount = 0; if (spec.tempHp === "level+bonus") amount = TFRActorTotalLevel(actor) + bonus; else if (spec.tempHp === "10+bonus") amount = 10 + bonus; else amount = Number(spec.tempHp) || 0; if (amount > 0) { await TFRApplyTempHp(actor, amount, def?.name || "Relic Temp HP"); applied = true; } }

  if (saveQueued) {
    await TFRLogRelicTimelineSafe(relicId, { type: "Save Resolver Queued", slot, actor: actor.name, activity: def?.name || slot, reason: `${actor.name} used ${def?.name || slot}. Waiting for save result or manual resolver before applying ${spec.condition}.` });
    if (!spec.note || !applied) return saveQueueResult?.chatMessage || null;
  }

  if (applied || spec.note) {
    await TFRLogRelicTimelineSafe(relicId, { type: "Ability Helper", slot, actor: actor.name, activity: def?.name || slot, reason: `${actor.name} used ${def?.name || slot}. Helper effects ${applied ? "applied/queued" : "not required"}.` });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: TFRChatFlags({ abilityHelper: true, relicId, slot, helperKind: TFRAbilityHelperKind({ applied, saveQueued, spec }) }),
      content: TFRAbilityHelperChatContent({ relic, def, spec, applied, saveQueued })
    });
  }
  return null;
}

async function TFRUseSelectedRelicAbility(relicId, slot, options = {}) {
  if (!relicId) {
    ui.notifications.warn("Selected Relic Quick Actions: dashboard'dan bir relic seçili olmalı.");
    return { ok: false, issue: "No relic selected" };
  }
  const actor = TFRSelectedActor();
  if (!actor) {
    ui.notifications.warn("Selected Relic Quick Actions: bearer token'ı seç.");
    return { ok: false, issue: "No actor selected" };
  }
  const item = TFRFindActorRelicItem(actor, relicId);
  if (!item) {
    const relic = await TFRGetRelicById(relicId);
    ui.notifications.warn(`${actor.name} üzerinde ${relic?.name || relicId} bulunamadı.`);
    return { ok: false, issue: "Actor does not have selected relic" };
  }
  return TFRUseRelicAbility(actor, relicId, slot, options);
}

async function TFRUseRelicAbility(actorOrId, relicId, slot, options = {}) {
  const actor = TFRResolveActor(actorOrId);
  if (!actor) return ui.notifications.warn("The First Relics: no actor selected.");
  const item = TFRFindActorRelicItem(actor, relicId);
  if (!item) return ui.notifications.warn(`${actor.name} does not have ${relicId}.`);
  if (TFRBlockRelicFeatureUse(item, slot || "Relic ability")) return { ok: false, issue: "Attunement refused" };
  const stage = TFRRelicItemStage(item);
  const signatureUnlocked = TFRRelicItemSignatureUnlocked(item);
  if (!TFRIsAbilitySlotUnlocked(stage, slot, signatureUnlocked)) { const required = slot === "signature" ? "Signature unlock / 1000 affinity" : `${TFRStageTitle(TFRRequiredStageForSlot(slot))} stage`; ui.notifications.warn(`${slot} is locked. ${item.name} is currently ${TFRStageTitle(stage)}; required: ${required}.`); return { ok: false, issue: "Locked" }; }
  if (options.spendCharges === true) { const relics = await TFRLoadRelics(); const relic = relics.find(r => r.id === relicId); const def = relic ? TFRGetAbilityDefinition(relic, slot) : null; if (def?.charges && !(await TFRSpendRelicCharges(item, def.charges))) return { ok: false, issue: "Not enough charges" }; }
  return TFRApplyRelicAbilityRuntime(actor, relicId, slot, options);
}

function TFRTextHasNeedle(haystack, needle) {
  const value = String(needle || "").trim().toLowerCase();
  if (!value) return false;
  return String(haystack || "").toLowerCase().includes(value);
}

function TFRNormalizeChatHaystack(message) {
  const text = TFRChatMessagePlainText(message).toLowerCase();
  let flagText = "";
  try { flagText = JSON.stringify(message?.flags || {}).toLowerCase(); } catch (err) {}
  return `${text} ${flagText}`.replace(/\s+/g, " ").trim();
}

function TFRChatMentionsRelicItem(message, actor, relicId, item, haystack = null) {
  haystack = haystack ?? TFRNormalizeChatHaystack(message);
  const names = [
    item?.name,
    relicId,
    String(relicId || "").replaceAll("_", " "),
    item?.getFlag?.(TFR_MODULE_ID, "relicId")
  ].filter(Boolean);
  if (names.some(n => TFRTextHasNeedle(haystack, n))) return true;

  let flagText = "";
  try { flagText = JSON.stringify(message?.flags || {}).toLowerCase(); } catch (err) {}
  const ids = [item?.id, item?._id, item?.uuid].filter(Boolean).map(x => String(x).toLowerCase());
  return ids.some(id => id && flagText.includes(id));
}

function TFRActivityBadgeScore(def, slot, haystack) {
  if (!def) return 0;
  const h = ` ${String(haystack || "").toLowerCase().replace(/\s+/g, " ")} `;
  let score = 0;

  const name = String(def.name || "").toLowerCase();
  if (name && h.includes(name)) score += 100;

  // Some dnd5e v5 item chat cards show only the item name plus badge chips, not the activity name.
  // These badge matches identify the used activity without depending on fragile HTML structure.
  const activation = String(def.activation || "").toLowerCase();
  if (activation === "bonus" && (h.includes(" bonus action ") || h.includes(" bonus "))) score += 12;
  else if (activation === "reaction" && h.includes(" reaction ")) score += 12;
  else if (activation === "action" && h.includes(" action ") && !h.includes(" bonus action ")) score += 8;
  else if (activation === "special" && h.includes(" special ")) score += 8;

  const range = Number(def.range || 0);
  if (range > 0) {
    const rangeBits = [`${range} ft`, `${range}ft`, `${range} feet`];
    if (rangeBits.some(bit => h.includes(bit))) score += 12;
  }

  const target = String(def.target || "").toLowerCase();
  if (target === "space" && h.includes(" space ")) score += 12;
  else if (target === "self" && h.includes(" self ")) score += 12;
  else if (target === "creature" && h.includes(" creature ")) score += 8;

  // Newer dnd5e flags often include the activity id/key directly. If present, trust it strongly.
  if (h.includes(`"${slot}"`) || h.includes(`/${slot}`) || h.includes(`.${slot}`)) score += 80;
  return score;
}

function TFRInferRelicSlotFromChatBadges(relicId, item, haystack) {
  const defs = TFRAbilityDefinitions()[relicId] || {};
  const stage = TFRRelicItemStage(item);
  const signatureUnlocked = TFRRelicItemSignatureUnlocked(item);
  const allowed = TFRUnlockedActivitySlots(stage, signatureUnlocked);
  let best = null;
  let tied = false;

  for (const slot of allowed) {
    const def = defs[slot];
    if (!def) continue;
    const score = TFRActivityBadgeScore(def, slot, haystack);
    if (!best || score > best.score) {
      best = { relicId, slot, name: def.name, score };
      tied = false;
    } else if (best && score === best.score && score > 0) {
      tied = true;
    }
  }

  // 20+ normally means at least two reliable badge hits, or a direct name/slot hit.
  if (best && best.score >= 20 && !tied) return best;
  return null;
}

function TFRRelicAbilityFromChatMessage(message, actor = null) {
  if (!message || !actor) return null;
  if (message.getFlag?.(TFR_MODULE_ID, "tfrAutomationMessage")) return null;
  if (message.getFlag?.(TFR_MODULE_ID, "genericRelicAutomationHandled")) return null;

  const haystack = TFRNormalizeChatHaystack(message);
  const defs = TFRAbilityDefinitions();

  for (const [relicId, slots] of Object.entries(defs)) {
    const item = TFRFindActorRelicItem(actor, relicId);
    if (!item) continue;
    if (!TFRChatMentionsRelicItem(message, actor, relicId, item, haystack)) continue;

    // Infer by explicit ability names, activity ids, and dnd5e badge chips such as
    // REACTION + SELF or BONUS ACTION + 30 FT + 1 SPACE.
    const inferred = TFRInferRelicSlotFromChatBadges(relicId, item, haystack);
    if (inferred) return inferred;
  }
  return null;
}


async function TFRAuditAllRelicEffectAutomation() {
  const relics = await TFRLoadRelics();
  const rows = [];
  for (const relic of relics) {
    for (const slot of TFR_ACTIVITY_SLOTS) {
      const def = TFRGetAbilityDefinition(relic, slot);
      const spec = TFRRelicAbilityRuntimeSpec(relic.id, slot);
      const changes = TFREffectChangesForRelicAbility(relic.id, slot, relic, null);
      rows.push({
        relic: relic.name,
        slot,
        ability: def?.name || "",
        stage: TFRRequiredStageForSlot(slot),
        helper: !!Object.keys(spec || {}).length,
        selfEffect: !!spec.selfEffect,
        targetEffect: !!spec.targetEffect,
        condition: spec.condition || spec.conditionSelf || "",
        save: def?.save || "",
        saveAware: !!(spec.condition && def?.type === "save"),
        teleport: !!spec.teleport,
        cleanup: (spec.removeTarget || spec.removeSelf || []).join(", "),
        changes: changes.length
      });
    }
  }
  console.table(rows);
  ui.notifications.info("The First Relics: all relic effect automation audit printed to console.");
  return rows;
}

async function TFRUseCloakAbility(actorOrId, abilityId, options = {}) {
  const actor = TFRResolveActor(actorOrId);
  if (!actor) return ui.notifications.warn(`${TFR_CLOAK_DISPLAY_NAME}: no actor selected.`);
  const item = TFRGetActorRelicItem(actor, "cloak_feywilds");
  if (!item) return ui.notifications.warn(`${actor.name} does not have ${TFR_CLOAK_DISPLAY_NAME}.`);

  const abilities = {
    feyStep: { charges: 1, label: "Fey Step", slot: "active1" },
    arrowFirstHunt: { charges: 2, label: "Arrow of the First Hunt", slot: "active2" },
    naturesPursuit: { charges: 3, label: "Nature's Pursuit", slot: "active3" },
    verdantSnare: { charges: 4, label: "Briar Snare", slot: "active4" },
    avatar: { charges: 8, label: "Avatar of the First Hunt", slot: "avatar" },
    signature: { charges: 0, label: "Blessing of Sylvara", slot: "signature" }
  };
  const ability = abilities[abilityId];
  if (!ability) return ui.notifications.warn(`Unknown Cloak ability: ${abilityId}`);
  if (TFRBlockRelicFeatureUse(item, ability.label)) return { ok: false, issue: "Attunement refused", actor: actor.name, ability: ability.label };

  const state = await TFRGetRelicState("cloak_feywilds");
  const stage = TFRNormalizeStage(item.getFlag("the-first-relics", "stage") || state?.stage || "dormant");
  const signatureUnlocked = !!item.getFlag("the-first-relics", "signatureUnlocked") || !!state?.signatureUnlocked;

  if (!TFRIsAbilitySlotUnlocked(stage, ability.slot, signatureUnlocked)) {
    const required = ability.slot === "signature"
      ? "Signature unlock / 1000 affinity"
      : `${TFRStageTitle(TFRRequiredStageForSlot(ability.slot))} stage`;
    ui.notifications.warn(`${ability.label} is locked. ${item.name} is currently ${TFRStageTitle(stage)}; required: ${required}.`);
    return { ok: false, issue: "Locked", actor: actor.name, ability: ability.label, stage, required };
  }

  const spendCharges = options.spendCharges !== false;

  if (abilityId === "feyStep") {
    const token = TFRTokenForActor(actor);
    if (!token) return ui.notifications.warn(`${TFR_CLOAK_DISPLAY_NAME}: select the bearer's token before using Fey Step.`);
    return TFRExecuteFeyStep({ token, consumeCharges: spendCharges });
  }

  if (spendCharges && !(await TFRSpendRelicCharges(item, ability.charges))) return { ok: false, issue: "Not enough charges", actor: actor.name, ability: ability.label };

  const target = TFRGetSelectedTargetActor();

  await TFRAutomation.logTimeline("cloak_feywilds", {
    type: "Cloak Quick Use",
    slot: ability.slot,
    actor: actor.name,
    activity: ability.label,
    reason: `${actor.name} used ${ability.label} from the GM Control Panel.${spendCharges ? ` ${ability.charges} charge(s) spent.` : " Charges were already consumed by dnd5e."}`
  });

  if (abilityId === "arrowFirstHunt") {
    await TFRApplyCloakMark(actor, target);
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: TFRChatFlags({ ability: "arrowFirstHunt" }),
      content: `<h2>Arrow of the First Hunt</h2><p>Roll the item's damage activity for extra force damage if needed. The target cannot benefit from invisibility against ${actor.name} until the start of ${actor.name}'s next turn.</p>`
    });
  }
  if (abilityId === "naturesPursuit") return TFRApplyNaturePursuit(actor, item);
  if (abilityId === "verdantSnare") {
    // Save-based ability: do not apply Restrained immediately. Queue the save resolver instead.
    return TFRUseRelicAbility(actor, "cloak_feywilds", "active4", { ...options, spendCharges: false });
  }
  if (abilityId === "avatar") return TFRApplyCloakAvatar(actor, item);
  if (abilityId === "signature") {
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: TFRChatFlags({ ability: "signature" }),
      content: `<h1>Blessing of Sylvara</h1><p>For 1 minute, marked prey cannot hide behind invisibility, mundane hiding, natural terrain, or nonmagical cover. Resolve first-hit extra damage and free Fey Step manually.</p>`
    });
  }
}

async function TFRAuditCloakAutomation() {
  const checks = [
    ["TFRUseCloakAbility", typeof TFRUseCloakAbility === "function"],
    ["TFRApplyCloakMark", typeof TFRApplyCloakMark === "function"],
    ["TFRApplyNaturePursuit", typeof TFRApplyNaturePursuit === "function"],
    ["TFRApplyCloakAvatar", typeof TFRApplyCloakAvatar === "function"],
    ["TFRApplyVerdantSnare", typeof TFRApplyVerdantSnare === "function"],
    ["TFRApplyRestrainedCondition", typeof TFRApplyRestrainedCondition === "function"],
    ["TFRSpendRelicCharges", typeof TFRSpendRelicCharges === "function"]
  ];
  console.table(checks.map(([name, ok]) => ({ name, ok })));
  if (checks.some(c => !c[1])) ui.notifications.warn("Cloak automation audit failed. Check console.");
  else ui.notifications.info("Cloak automation helpers are available.");
  return checks;
}



async function TFRAuditNative() {
  const relics = await TFRLoadRelics();
  const rows = [];
  let index = 1;
  for (const relic of relics) {
    const item = TFRBuildItem(relic, "exalted", index, true);
    const activities = item.system.activities;
    const itemEffectIds = new Set((item.effects || []).map(e => e?._id).filter(Boolean));
    for (const [slot, activity] of Object.entries(activities)) {
      const cfg = TFRAbilityAutomation(relic.id, slot);
      const hasMacro = !!(activity.macroData?.command || activity.macroData?.name);
      const consumes = (activity.consumption?.targets || []).length > 0 || slot === "signature";
      const typeOK = activity.type === cfg.type;
      const damageParts = activity.damage?.parts || [];
      const hasDamageParts = Array.isArray(damageParts) && damageParts.length > 0;
      const damageOK = cfg.type !== "damage" || hasDamageParts;
      const healOK = cfg.type !== "heal" || !!activity.healing;
      const noWrongDamage = cfg.type === "damage" || !hasDamageParts;
      const saveOK = cfg.type !== "save" || (activity.save?.ability === cfg.save);
      const targetOK = (cfg.target === "self" && activity.target?.affects?.type === "self")
        || (cfg.target === "creature" && activity.target?.affects?.type === "creature")
        || (cfg.target === "space" && activity.target?.affects?.type === "space")
        || !cfg.target;
      const effectRefs = activity.effects || [];
      const missingEffectRefs = effectRefs.filter(ref => !itemEffectIds.has(ref._id));
      rows.push({
        relic: relic.name, slot, name: activity.name, role: cfg.role,
        expectedType: cfg.type, type: activity.type, typeOK, damageOK, noWrongDamage,
        healOK, saveOK, targetOK, macroOK: !hasMacro, consumeOK: consumes,
        saveAbility: activity.save?.ability || "", targetType: activity.target?.affects?.type || "",
        damage: hasDamageParts, healing: !!activity.healing, effects: effectRefs.length, nativeEffectOK: !missingEffectRefs.length,
        effectRefs: effectRefs.map(ref => `${ref._id}${ref.onSave === false ? ":failed-save" : ref.onSave === true ? ":always" : ""}`).join(", "),
        charges: activity.consumption?.targets?.[0]?.value || "0", note: cfg.note || ""
      });
    }
    index++;
  }
  console.table(rows);
  const failed = rows.filter(r => !r.typeOK || !r.damageOK || !r.healOK || !r.noWrongDamage || !r.saveOK || !r.targetOK || !r.macroOK || !r.consumeOK || !r.nativeEffectOK);
  if (failed.length) ui.notifications.warn(`The First Relics Native Audit: ${failed.length} issue(s). Check console.`);
  else ui.notifications.info("The First Relics Native Audit: ability design mapping is valid.");
  return rows;
}




async function TFRAuditTargeting() {
  const relics = await TFRLoadRelics();
  const rows = [];
  let index = 1;

  for (const relic of relics) {
    const activities = TFRBuildActivities(relic, "exalted", index, true);
    for (const [slot, activity] of Object.entries(activities)) {
      rows.push({
        relic: relic.name,
        slot,
        name: activity.name,
        range: activity.range?.value ? `${activity.range.value} ${activity.range.units}` : activity.range?.units || "",
        prompt: !!activity.target?.prompt,
        targetType: activity.target?.affects?.type || "",
        targetCount: activity.target?.affects?.count || "",
        templateType: activity.target?.template?.type || ""
      });
    }
    index++;
  }

  console.table(rows);
  ui.notifications.info("The First Relics Targeting Audit complete. Check console.");
  return rows;
}



async function TFRAuditInventorySync() {
  const relics = await TFRLoadRelics();
  const rows = [];

  for (const relic of relics) {
    const state = await TFRGetRelicState(relic.id);
    const copies = TFRFindAllRelicItemCopies(relic);

    for (const item of copies) {
      rows.push({
        relic: relic.name,
        location: item.parent?.name || "World Item Directory",
        itemStage: item.getFlag("the-first-relics", "stage") || "none",
        stateStage: state?.stage || "none",
        signature: !!item.getFlag("the-first-relics", "signatureUnlocked"),
        uuid: item.uuid
      });
    }

    if (!copies.length) {
      rows.push({
        relic: relic.name,
        location: "NO COPIES FOUND",
        itemStage: "",
        stateStage: state?.stage || "none",
        signature: "",
        uuid: ""
      });
    }
  }

  console.table(rows);
  ui.notifications.info("The First Relics Inventory Sync Audit complete. Check console.");
  return rows;
}

async function TFRSyncAllInventoryStages() {
  const relics = await TFRLoadRelics();
  const result = [];

  for (const relic of relics) {
    const state = await TFRGetRelicState(relic.id);
    const stage = state?.stage || TFRStageFromAffinity(state?.value || 0);
    const copies = await TFRUpdateAllRelicCopies(relic, stage, !!state?.signatureUnlocked);
    result.push({ relic: relic.name, stage, copies: copies.length });
  }

  console.table(result);
  ui.notifications.info("The First Relics: all inventory relic stages synced.");
  return result;
}



async function TFRAuditStageSyncSafety() {
  const relics = await TFRLoadRelics();
  const rows = [];

  const rebuildSource = TFRRebuildRelicItemDocument.toString();
  const createIndex = rebuildSource.indexOf("TFRCreateValidatedRelicReplacement");
  const actorDeleteIndex = rebuildSource.indexOf('parentActor.deleteEmbeddedDocuments("Item", [oldId]');
  const worldDeleteIndex = rebuildSource.indexOf("else await item.delete");
  const rollbackIndex = rebuildSource.indexOf("TFRRollbackReplacementItem");
  const validatesReplacement = TFRCreateValidatedRelicReplacement.toString().includes("TFRValidateRelicReplacement");
  const strategyIssues = [];
  if (createIndex < 0) strategyIssues.push("validated create step missing");
  if (actorDeleteIndex < createIndex || worldDeleteIndex < createIndex) strategyIssues.push("original deletion is not after replacement creation");
  if (rollbackIndex < 0) strategyIssues.push("delete-failure rollback missing");
  if (!validatesReplacement) strategyIssues.push("replacement validation missing");
  rows.push({
    relic: "MODULE REBUILD STRATEGY",
    location: "create → validate → delete; rollback on failure",
    effects: "",
    stage: "all",
    nativeWorkflow: true,
    activities: "",
    validActivityIds: true,
    ok: strategyIssues.length === 0,
    issues: strategyIssues.join("; ")
  });

  for (const relic of relics) {
    const copies = TFRFindAllRelicItemCopies(relic);
    for (const item of copies) {
      const stage = TFRRelicItemStage(item);
      const signatureUnlocked = TFRRelicItemSignatureUnlocked(item);
      const activities = TFRGetActivitiesArray(item);
      const expectedSlots = TFRUnlockedActivitySlots(stage, signatureUnlocked);
      const actualSlots = activities.map(TFRReplacementActivitySlot).filter(Boolean);
      const missingSlots = expectedSlots.filter(slot => !actualSlots.includes(slot));
      const invalidIds = activities
        .map(activity => String(activity?.id || activity?._id || ""))
        .filter(id => !/^[A-Za-z0-9]{16}$/.test(id));
      const itemIssues = [];
      if (activities.length !== expectedSlots.length) itemIssues.push(`activities ${activities.length}/${expectedSlots.length}`);
      if (missingSlots.length) itemIssues.push(`missing ${missingSlots.join(", ")}`);
      if (invalidIds.length) itemIssues.push(`${invalidIds.length} invalid activity id(s)`);
      rows.push({
        relic: relic.name,
        location: item.parent?.name || "World Item Directory",
        effects: item.effects?.size || item.effects?.length || 0,
        stage,
        nativeWorkflow: !!item.getFlag("the-first-relics", "nativeWorkflow"),
        activities: `${activities.length}/${expectedSlots.length}`,
        validActivityIds: invalidIds.length === 0,
        ok: itemIssues.length === 0,
        issues: itemIssues.join("; ")
      });
    }
  }

  console.table(rows);
  const failed = rows.filter(row => !row.ok);
  if (failed.length) ui.notifications.warn(`Stage sync safety audit found ${failed.length} issue(s). Check console.`);
  else ui.notifications.info("Stage sync safety audit passed.");
  return rows;
}



async function TFRAuditAbilityDesign() {
  const relics = await TFRLoadRelics();
  const rows = [];
  let index = 1;
  for (const relic of relics) {
    const acts = TFRBuildActivities(relic, "exalted", index, true);
    for (const [slot, activity] of Object.entries(acts)) {
      const cfg = TFRAbilityAutomation(relic.id, slot);
      rows.push({
        relic: relic.name,
        slot,
        ability: activity.name,
        role: cfg.role,
        foundryType: activity.type,
        activation: activity.activation?.type || "",
        target: activity.target?.affects?.type || "",
        range: activity.range?.value ? `${activity.range.value} ${activity.range.units}` : activity.range?.units || "",
        save: activity.save?.ability || "",
        damage: activity.damage?.parts?.map(p => `${p.number}d${p.denomination} ${p.types?.join("/")}`).join(", ") || "",
        charges: activity.consumption?.targets?.[0]?.value || "0",
        note: cfg.note || ""
      });
    }
    index++;
  }
  console.table(rows);
  ui.notifications.info("Ability design audit complete. Check console.");
  return rows;
}



async function TFRAuditProgression() {
  const relics = await TFRLoadRelics();
  const rows = [];
  for (const relic of relics) {
    const data = await TFRGetRelicState(relic.id);
    const progress = TFRRequirementProgress(relic, data);
    rows.push({
      relic: relic.name,
      affinity: data.value || 0,
      stage: data.stage || "dormant",
      requirements: `${progress.done}/${progress.total}`,
      dreamsSent: Object.keys(data.dreamsSent || {}).length,
      memoriesUnlocked: Object.keys(data.memoriesUnlocked || {}).length,
      timelineEntries: (data.timeline || []).length
    });
  }
  console.table(rows);
  ui.notifications.info("The First Relics Progression Audit complete. Check console.");
  return rows;
}



const TFR_TEST_LAB_FOLDER = "The First Relics — Test Lab";

function TFRActivityCount(itemOrActivities) {
  const acts = itemOrActivities?.system?.activities ?? itemOrActivities;
  if (!acts) return 0;
  if (typeof acts.size === "number") return acts.size;
  if (typeof acts.contents !== "undefined" && Array.isArray(acts.contents)) return acts.contents.length;
  if (typeof acts.entries === "function") return Array.from(acts.entries()).length;
  if (typeof acts.keys === "function") return Array.from(acts.keys()).length;
  if (typeof acts.toObject === "function") return Object.keys(acts.toObject()).length;
  if (typeof acts === "object") return Object.keys(acts).length;
  return 0;
}

function TFRGetTestLabBackupState() {
  try { return foundry.utils.deepClone(game.settings.get("the-first-relics", "testLabBackupState")); }
  catch (err) { return null; }
}

async function TFRSetTestLabBackupState(state) {
  return game.settings.set("the-first-relics", "testLabBackupState", state ?? null);
}

async function TFRBackupWorldStateForTestLab(force = false) {
  const existing = TFRGetTestLabBackupState();
  if (existing && !force) return existing;
  const current = TFRGetWorldState();
  await TFRSetTestLabBackupState(current);
  return current;
}



async function TFRGetOrCreateTestFolder(type = "Actor") {
  let folder = game.folders.find(f => f.type === type && f.name === TFR_TEST_LAB_FOLDER);
  if (!folder) folder = await Folder.create({ name: TFR_TEST_LAB_FOLDER, type });
  return folder;
}

async function TFRDeleteTestLab() {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics Test Lab: GM only.");
  const folderIds = game.folders.filter(f => f.name === TFR_TEST_LAB_FOLDER && f.type === "Actor").map(f => f.id);
  const actors = game.actors.filter(a => a.getFlag("the-first-relics", "testLab") || folderIds.includes(a.folder?.id));
  if (actors.length) await Actor.deleteDocuments(actors.map(a => a.id));
  for (const f of game.folders.filter(f => f.name === TFR_TEST_LAB_FOLDER)) {
    try { await f.delete(); } catch (err) { console.warn("Could not delete Test Lab folder", err); }
  }
  ui.notifications.info(`The First Relics Test Lab deleted: ${actors.length} actors.`);
  return { actors: actors.length };
}

async function TFRRestoreAfterTestLab() {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics Test Lab: GM only.");
  await TFRDeleteTestLab();
  const backup = TFRGetTestLabBackupState();
  if (backup) {
    await TFRSetWorldState(backup);
    // The lab promotes source world items to Exalted for cloning. Restoring only
    // the affinity setting would leave those documents out of sync, so rebuild
    // every real copy against the restored stages before discarding the backup.
    await TFRSyncAllInventoryStages();
    await TFRSetTestLabBackupState(null);
    ui.notifications.info("The First Relics Test Lab restored: actors deleted, previous relic state restored, and item stages synchronized.");
    return { restored: true };
  }
  ui.notifications.info("The First Relics Test Lab restored: actors deleted. No backup state was present.");
  return { restored: false };
}

async function TFRResetTestLab(options = {}) {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics Test Lab: GM only.");
  const backup = TFRGetTestLabBackupState() || TFRGetWorldState();
  await TFRSetTestLabBackupState(backup);
  await TFRDeleteTestLab();
  await TFRSetWorldState({});
  return TFRCreateTestLab({ ...options, preserveBackup: true });
}

async function TFRDestroyTestLab() {
  return TFRRestoreAfterTestLab();
}


function TFRTestActorName(relic) {
  return `TFR Test — ${relic.name}`;
}

async function TFRCreateTestActor(relic, folder) {
  const existing = game.actors.getName(TFRTestActorName(relic));
  if (existing) return existing;
  return Actor.create({
    name: TFRTestActorName(relic),
    type: "character",
    folder: folder?.id,
    img: relic.icon || "icons/svg/mystery-man.svg",
    flags: { "the-first-relics": { testLab: true, relicId: relic.id } },
    system: {
      abilities: {
        str: { value: 16, proficient: 1 },
        dex: { value: 16, proficient: 1 },
        con: { value: 16, proficient: 1 },
        int: { value: 14, proficient: 1 },
        wis: { value: 14, proficient: 1 },
        cha: { value: 14, proficient: 1 }
      },
      attributes: {
        hp: { value: 120, max: 120, temp: 0 },
        ac: { flat: 16, calc: "flat" },
        prof: 4
      },
      details: {
        level: 12,
        biography: { value: `<p>Generated by The First Relics Test Lab for ${relic.name}.</p>` }
      }
    }
  }, { renderSheet: false, render: false });
}

async function TFRPrepareRelicForTestActor(actor, relic, stage = "exalted", affinity = 1000) {
  const oldItems = actor.items.filter(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name);
  if (oldItems.length) await actor.deleteEmbeddedDocuments("Item", oldItems.map(i => i.id));

  const relics = await TFRLoadRelics();
  const index = Math.max(1, relics.findIndex(r => r.id === relic.id) + 1);
  const signatureUnlocked = affinity >= 1000;

  // Ensure the world item exists, then clone it into the actor.
  let worldItem = game.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name);

  if (!worldItem) {
    // If createAll was not run first, create this relic item now using the module's normal creation path.
    const itemData = {
      name: relic.name,
      type: "equipment",
      img: relic.icon || "icons/svg/item-bag.svg",
      system: {
        description: { value: TFRBuildDescription(relic, stage, affinity >= 1000) },
        source: "The First Relics",
        equipped: true,
        attuned: true,
        quantity: 1,
        weight: 0,
        price: { value: 0, denomination: "gp" },
        rarity: "legendary",
        identified: true,
        uses: { spent: 0, max: String(TFRGetStageData(relic, stage, signatureUnlocked).charges), recovery: [{ period: "dawn", type: "recoverAll" }] },
        activities: TFRBuildActivities(relic, stage, index, signatureUnlocked)
      },
      flags: {
        "the-first-relics": {
          relicId: relic.id,
          stage,
          nativeWorkflow: true,
          signatureUnlocked,
          finalForm: TFRIsFinalForm(stage, signatureUnlocked),
          testLab: false
        }
      }
    };
    worldItem = await Item.create(itemData, { render: false, renderSheet: false });
  }

  // Update the world item stage first through existing module flow when possible.
  try {
    await worldItem.setFlag("the-first-relics", "signatureUnlocked", signatureUnlocked);
    worldItem = await TFRUpdateRelicItem(worldItem, stage, signatureUnlocked) || worldItem;
  } catch (err) {
    console.warn("The First Relics Test Lab: world item stage sync fallback", err);
  }

  const itemData = worldItem.toObject();
  delete itemData._id;

  // Playtest actors should be ready to test immediately. World relics stay unequipped by default,
  // but cloned lab relics are equipped/attuned so dnd5e chat cards do not show misleading warnings.
  itemData.system = itemData.system || {};
  itemData.system.equipped = true;
  itemData.system.attuned = true;
  itemData.system.proficient = itemData.system.proficient ?? 1;
  itemData.system.activities = TFRBuildActivities(relic, stage, index, signatureUnlocked);
  itemData.system.description = itemData.system.description || {};
  itemData.system.description.value = TFRBuildDescription(relic, stage, signatureUnlocked);
  itemData.effects = TFRBuildItemEffects(relic, stage, signatureUnlocked);

  itemData.flags = itemData.flags || {};
  itemData.flags["the-first-relics"] = {
    ...(itemData.flags["the-first-relics"] || {}),
    relicId: relic.id,
    stage,
    nativeWorkflow: true,
    signatureUnlocked,
    finalForm: TFRIsFinalForm(stage, signatureUnlocked),
    testLab: true
  };

  const [item] = await actor.createEmbeddedDocuments("Item", [itemData], { render: false, renderSheet: false });

  const state = await TFRGetRelicState(relic.id);
  state.value = affinity;
  state.stage = stage;
  state.signatureUnlocked = signatureUnlocked;
  state.mood = TFRMoodFromAffinity(affinity);
  state.timeline = state.timeline || [];
  state.timeline.push({
    time: Date.now(),
    value: affinity,
    type: "Test Lab",
    reason: `[Test Lab] ${actor.name} prepared at ${stage}/${affinity}`
  });
  await TFRSetRelicState(relic.id, state);

  return item;
}


async function TFRCreateTestLab(options = {}) {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics Test Lab: GM only.");
  const stage = options.stage || "exalted";
  const affinity = Number(options.affinity ?? 1000);

  if (!options.preserveBackup) await TFRBackupWorldStateForTestLab(false);
  await TFRDeleteTestLab();

  const relics = await TFRLoadRelics();

  // Create missing world relic items automatically so the lab can be run directly.
  const missingWorldItems = relics.filter(r => !game.items.find(i => i.getFlag("the-first-relics", "relicId") === r.id || i.name === r.name));
  if (missingWorldItems.length) {
    ui.notifications.info(`The First Relics Test Lab: creating ${missingWorldItems.length} missing world relic item(s).`);
    await TFRCreateAll();
  }

  const folder = await TFRGetOrCreateTestFolder("Actor");
  const rows = [];

  for (const relic of relics) {
    const actor = await TFRCreateTestActor(relic, folder);
    const item = await TFRPrepareRelicForTestActor(actor, relic, stage, affinity);
    rows.push({
      actor: actor.name,
      relic: relic.name,
      item: item.name,
      stage,
      affinity,
      activities: TFRActivityCount(item)
    });
  }

  console.table(rows);
  ui.notifications.info(`The First Relics Test Lab created: ${rows.length} actors with relics.`);
  return rows;
}

async function TFRAuditTestLab() {
  const relics = await TFRLoadRelics();
  const rows = [];

  for (let index = 0; index < relics.length; index++) {
    const relic = relics[index];
    const actor = game.actors.getName(TFRTestActorName(relic));
    const item = actor?.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name);
    const stage = item?.getFlag("the-first-relics", "stage") || "";
    const signature = !!item?.getFlag("the-first-relics", "signatureUnlocked");
    const finalForm = !!item?.getFlag("the-first-relics", "finalForm");
    const finalBonus = item ? TFRHasUniversalRelicBonus(item, TFR_FINAL_FORM_BONUS) : false;
    const finalCharges = Number(item?.system?.uses?.max) === TFR_FINAL_FORM_CHARGES;
    const expectedActivities = Object.keys(TFRBuildActivities(relic, "exalted", index + 1, true) || {}).length;
    const actualActivities = TFRActivityCount(item);
    const issues = [];
    if (!actor) issues.push("missing actor");
    if (!item) issues.push("missing relic item");
    if (item && stage !== "exalted") issues.push(`stage ${stage || "blank"} != exalted`);
    if (item && !signature) issues.push("signature not unlocked");
    if (item && !finalForm) issues.push("final form not unlocked");
    if (item && !finalBonus) issues.push(`universal relic bonus is not +${TFR_FINAL_FORM_BONUS}`);
    if (item && !finalCharges) issues.push(`maximum charges are not ${TFR_FINAL_FORM_CHARGES}`);
    if (item && actualActivities !== expectedActivities) issues.push(`activities ${actualActivities} != ${expectedActivities}`);

    rows.push({
      relic: relic.name,
      actor: actor?.name || "MISSING",
      hasItem: !!item,
      stage,
      signature,
      finalForm,
      finalBonus,
      finalCharges,
      expectedActivities,
      activities: actualActivities,
      activityOK: actualActivities === expectedActivities,
      icon: item?.img || "",
      ok: issues.length === 0,
      issues: issues.join("; ")
    });
  }

  console.table(rows);
  const failed = rows.filter(r => !r.ok);
  if (failed.length) ui.notifications.warn(`The First Relics Test Lab: ${failed.length} issue(s). Check console.`);
  else ui.notifications.info("The First Relics Test Lab audit passed.");
  return rows;
}



async function TFRRunDiagnostics(options = {}) {
  const relics = await TFRLoadRelics();
  const rows = [];
  let totalExpected = 0;
  let totalActual = 0;
  let iconsOK = 0;

  for (let i = 0; i < relics.length; i++) {
    const relic = relics[i];
    const worldItem = game.items.find(it => it.getFlag("the-first-relics", "relicId") === relic.id || it.name === relic.name);
    const actor = game.actors.getName(TFRTestActorName(relic));
    const actorItem = actor?.items.find(it => it.getFlag("the-first-relics", "relicId") === relic.id || it.name === relic.name);
    const item = actorItem || worldItem;
    // Compare against the item's own stage; a Dormant/Awakened copy legitimately has fewer
    // activities than an Exalted one, so it must not count as a failure.
    const itemStage = item?.getFlag("the-first-relics", "stage") || "dormant";
    const itemSignature = !!item?.getFlag("the-first-relics", "signatureUnlocked");
    const generated = TFRBuildActivities(relic, itemStage, i + 1, itemSignature);
    const expectedActivities = Object.keys(generated || {}).length;
    const actualActivities = TFRActivityCount(item);
    const iconOK = !!(item?.img || relic.icon) && !(item?.img || relic.icon).includes("item-bag.svg");

    totalExpected += expectedActivities;
    totalActual += actualActivities;
    if (iconOK) iconsOK++;

    rows.push({
      relic: relic.name,
      worldItem: !!worldItem,
      testActor: !!actor,
      actorItem: !!actorItem,
      iconOK,
      expectedActivities,
      actualActivities,
      activityOK: actualActivities === expectedActivities,
      stage: item?.getFlag("the-first-relics", "stage") || "",
      signature: !!item?.getFlag("the-first-relics", "signatureUnlocked")
    });
  }

  console.table(rows);
  const failed = rows.filter(r => !r.worldItem || !r.iconOK || !r.activityOK);
  const summary = {
    relics: `${relics.length}/12`,
    icons: `${iconsOK}/${relics.length}`,
    activities: `${totalActual}/${totalExpected}`,
    failures: failed.length,
    status: failed.length ? "NEEDS ATTENTION" : "READY FOR PLAYTEST"
  };
  console.log("========== THE FIRST RELICS DIAGNOSTICS ==========");
  console.table([summary]);
  if (failed.length) TFRNotifyWarn(`The First Relics Diagnostics: ${failed.length} issue(s). Check console.`);
  else TFRNotifyInfo("The First Relics Diagnostics: READY FOR PLAYTEST.");
  return { summary, rows };
}

async function TFRRunPlaytestHealthCheck() {
  const diagnostics = await TFRRunDiagnostics();
  const qaMatrix = await TFRAuditRelicQAMatrix();
  const runtimeCoverage = await TFRAuditRuntimeCoverage();
  const relicCleanup = await TFRAuditRelicCleanup();
  const testLabRows = await TFRAuditTestLab();
  const testLabIssues = testLabRows.filter(row => !row.ok).length;
  const checks = [
    {
      check: "Diagnostics",
      issues: Number(diagnostics?.summary?.failures || 0),
      status: diagnostics?.summary?.status || ""
    },
    {
      check: "12 Relic QA Matrix",
      issues: Number(qaMatrix?.summary?.issues || 0),
      status: qaMatrix?.summary?.status || ""
    },
    {
      check: "Runtime Coverage",
      issues: Number(runtimeCoverage?.summary?.issues || 0),
      status: runtimeCoverage?.summary?.status || ""
    },
    {
      check: "Relic Cleanup",
      issues: Number(relicCleanup?.summary?.issues || 0),
      status: relicCleanup?.summary?.status || ""
    },
    {
      check: "Exalted Test Lab",
      issues: testLabIssues,
      status: testLabIssues ? "NEEDS ATTENTION" : "TEST LAB READY"
    }
  ];
  const issues = checks.reduce((total, row) => total + row.issues, 0);
  const summary = {
    checks: checks.length,
    issues,
    status: issues ? "NEEDS ATTENTION" : "PLAYTEST STABLE"
  };

  console.log("========== THE FIRST RELICS PLAYTEST HEALTH CHECK ==========");
  console.table(checks);
  console.table([summary]);
  if (issues) {
    console.info("The First Relics Playtest Health Check next steps:", [
      "Run Create Playtest Lab if Exalted Test Lab actors are missing.",
      "Run Rebuild Existing Relics after replacing the module folder.",
      "Review issue tables above before testing selected relic quick actions."
    ]);
    TFRNotifyWarn(`The First Relics Playtest Health Check: ${issues} issue(s). Check console.`);
  } else {
    TFRNotifyInfo("The First Relics Playtest Health Check: PLAYTEST STABLE.");
  }
  return { summary, checks, diagnostics, qaMatrix, runtimeCoverage, relicCleanup, testLabRows };
}

async function TFRFetchModuleText(path) {
  const response = await fetch(`modules/${TFR_MODULE_ID}/${path}`);
  if (!response?.ok) throw new Error(`Could not fetch ${path}`);
  return response.text();
}

async function TFRRunReleaseCandidateCheck() {
  const checks = [];
  const issues = [];
  let stageSafetyRows = [];
  let trueNameAudit = null;
  let appearanceAudit = null;
  let finalFormAudit = null;
  const addCheck = (check, ok, status, detail = "") => {
    const row = { check, issues: ok ? 0 : 1, status, detail };
    checks.push(row);
    if (!ok) issues.push({ check, issue: detail || status });
  };

  const playtest = await TFRRunPlaytestHealthCheck();
  addCheck(
    "Playtest Health",
    Number(playtest?.summary?.issues || 0) === 0,
    playtest?.summary?.status || "",
    `${playtest?.summary?.checks || 0} checks, ${playtest?.summary?.issues || 0} issue(s)`
  );

  try {
    stageSafetyRows = await TFRAuditStageSyncSafety();
    const stageSafetyIssues = stageSafetyRows.filter(row => !row.ok).length;
    addCheck(
      "Stage Rebuild Safety",
      stageSafetyIssues === 0,
      stageSafetyIssues ? "NEEDS ATTENTION" : "CREATE-VALIDATE-DELETE READY",
      `${stageSafetyRows.length} strategy/item check(s), ${stageSafetyIssues} issue(s)`
    );
  } catch (error) {
    addCheck("Stage Rebuild Safety", false, "NEEDS ATTENTION", error?.message || String(error));
  }

  try {
    trueNameAudit = await TFRAuditTrueNameSealing();
    addCheck(
      "True Name Sealing",
      !!trueNameAudit?.ok,
      trueNameAudit?.ok ? "SEALED UNTIL 1000" : "NEEDS ATTENTION",
      `${trueNameAudit?.checked || 0} pre-Signature description check(s), ${trueNameAudit?.failed?.length || 0} issue(s)`
    );
  } catch (error) {
    addCheck("True Name Sealing", false, "NEEDS ATTENTION", error?.message || String(error));
  }

  try {
    appearanceAudit = await TFRAuditProgressiveAppearanceUnlocks();
    addCheck(
      "Progressive Player Lore",
      !!appearanceAudit?.ok,
      appearanceAudit?.ok ? "STAGE-GATED / GM SECRETS SEALED" : "NEEDS ATTENTION",
      `${appearanceAudit?.checked || 0} relic/form description check(s), ${appearanceAudit?.failed?.length || 0} issue(s)`
    );
  } catch (error) {
    addCheck("Progressive Player Lore", false, "NEEDS ATTENTION", error?.message || String(error));
  }

  try {
    finalFormAudit = await TFRAuditFinalFormBonuses();
    addCheck(
      "Final Form +5 / 15 Charges",
      !!finalFormAudit?.ok,
      finalFormAudit?.ok ? "1000 AFFINITY / +5 / 15 READY" : "NEEDS ATTENTION",
      `${finalFormAudit?.checked || 0} relic build check(s), ${finalFormAudit?.failed?.length || 0} issue(s)`
    );
  } catch (error) {
    addCheck("Final Form +5 / 15 Charges", false, "NEEDS ATTENTION", error?.message || String(error));
  }

  try {
    const manifest = JSON.parse(await TFRFetchModuleText("module.json"));
    addCheck("Manifest Version", manifest.version === TFR_VERSION, manifest.version || "missing", `expected ${TFR_VERSION}`);
    addCheck("Foundry Compatibility", manifest.compatibility?.minimum === "13" && !!manifest.compatibility?.verified, "Foundry v13", `verified ${manifest.compatibility?.verified || "missing"}`);
    addCheck("dnd5e System", (manifest.systems || []).includes("dnd5e"), "dnd5e", "module declares dnd5e system");
    addCheck("Entrypoints", (manifest.esmodules || []).includes("scripts/the-first-relics.js") && (manifest.styles || []).includes("styles/the-first-relics.css"), "module assets", "script and stylesheet declared");
  } catch (err) {
    addCheck("Manifest Read", false, "NEEDS ATTENTION", err?.message || String(err));
  }

  try {
    const readme = await TFRFetchModuleText("README.md");
    const changelog = await TFRFetchModuleText("CHANGELOG.md");
    addCheck(
      "README Version",
      readme.includes(`v${TFR_VERSION}`) && (readme.includes(`The First Relics v${TFR_VERSION}`) || readme.includes(`The First Relics Framework v${TFR_VERSION}`)),
      "README",
      `expected v${TFR_VERSION}`
    );
    addCheck("CHANGELOG Version", changelog.includes(`## v${TFR_VERSION}`), "CHANGELOG", `expected v${TFR_VERSION}`);
  } catch (err) {
    addCheck("Docs Read", false, "NEEDS ATTENTION", err?.message || String(err));
  }

  const expectedApi = [
    "runReleaseCheck",
    "runReleaseCandidateCheck",
    "runPlaytestHealthCheck",
    "auditRelicQAMatrix",
    "auditRuntimeCoverage",
    "auditRelicCleanup",
    "auditFinalFormBonuses",
    "auditProgressiveAppearances",
    "syncAllInventoryStages",
    "createPlaytestLab",
    "useSelectedRelicAbility"
  ];
  const missingApi = expectedApi.filter(key => typeof window.FirstRelics?.[key] !== "function");
  addCheck("Public API", missingApi.length === 0, missingApi.length ? "NEEDS ATTENTION" : "READY", missingApi.length ? `missing: ${missingApi.join(", ")}` : `${expectedApi.length} exports ready`);

  const summary = {
    version: TFR_VERSION,
    checks: checks.length,
    issues: issues.length,
    status: issues.length ? "NEEDS ATTENTION" : "RELEASE READY"
  };

  console.log("========== THE FIRST RELICS RELEASE CHECK ==========");
  console.table(checks);
  console.table([summary]);
  if (issues.length) console.table(issues);
  if (issues.length) TFRNotifyWarn(`The First Relics Release Check: ${issues.length} issue(s). Check console.`);
  else TFRNotifyInfo("The First Relics Release Check: RELEASE READY.");
  return { summary, checks, issues, playtest, stageSafetyRows, trueNameAudit, appearanceAudit, finalFormAudit };
}

async function TFRAuditRelicCleanup() {
  const relics = await TFRLoadRelics();
  const rows = [];
  const issues = [];
  const placeholderPatterns = [
    /New relic is in playtesting status/i,
    /placeholder/i,
    /TODO|TBD/i,
    /The relic watches\./i,
    /The relic begins to respond\./i,
    /The relic tests the bearer\./i,
    /The relic accepts the bearer\./i,
    /Scholars disagree about this relic's true origin/i,
    /The relic remembers a failure from the First Age/i,
    /A quiet relic/i,
    /\bBA,\s*\d/i
  ];

  for (const relic of relics) {
    const text = JSON.stringify(relic);
    const relicIssues = [];
    const actives = relic.features?.actives || [];
    if (actives.length !== 4) relicIssues.push(`active count ${actives.length} != 4`);
    if (!relic.features?.avatar) relicIssues.push("missing avatar text");
    if (!relic.features?.signature) relicIssues.push("missing signature text");
    if (!relic.personality?.roleplayGuidance || relic.personality.roleplayGuidance.length < 80) relicIssues.push("roleplay guidance too short");
    if (!relic.lore?.origin || !relic.lore?.hiddenSorrow || !relic.lore?.knownRumor) relicIssues.push("incomplete lore");
    if (!relic.v1Checklist?.relicCleanup) relicIssues.push("relicCleanup checklist flag missing");
    for (const pattern of placeholderPatterns) {
      if (pattern.test(text)) relicIssues.push(`placeholder pattern: ${pattern.source}`);
    }

    const row = {
      relic: relic.name,
      trueName: relic.trueName?.name || "",
      virtue: relic.virtue || "",
      actives: actives.length,
      roleplayGuidance: relic.personality?.roleplayGuidance ? "ready" : "missing",
      lore: relic.lore?.origin && relic.lore?.hiddenSorrow && relic.lore?.knownRumor ? "ready" : "missing",
      relicCleanup: !!relic.v1Checklist?.relicCleanup,
      ok: relicIssues.length === 0,
      issues: relicIssues.join("; ")
    };
    if (relicIssues.length) issues.push({ relic: relic.name, issues: relicIssues.join("; ") });
    rows.push(row);
  }

  const summary = {
    relics: relics.length,
    cleaned: rows.filter(row => row.ok).length,
    issues: issues.length,
    status: issues.length ? "NEEDS ATTENTION" : "RELIC CLEANUP READY"
  };

  console.log("========== THE FIRST RELICS RELIC CLEANUP AUDIT ==========");
  console.table(rows);
  console.table([summary]);
  if (issues.length) console.table(issues);
  if (issues.length) TFRNotifyWarn(`The First Relics Relic Cleanup Audit: ${issues.length} issue(s). Check console.`);
  else TFRNotifyInfo("The First Relics Relic Cleanup Audit passed.");
  return { summary, rows, issues };
}

async function TFRAuditRelicQAMatrix() {
  const relics = await TFRLoadRelics();
  const rows = [];
  const issues = [];
  let nativeEffectRefs = 0;
  let nativeCovered = 0;
  let moduleCovered = 0;
  let manualReminder = 0;
  let manualOnly = 0;

  for (let index = 0; index < relics.length; index++) {
    const relic = relics[index];
    const item = TFRBuildItem(relic, "exalted", index + 1, true);
    const activities = item?.system?.activities || {};
    const itemEffectIds = new Set((item?.effects || []).map(effect => effect?._id).filter(Boolean));

    for (const slot of TFR_ACTIVITY_SLOTS) {
      const def = TFRGetAbilityDefinition(relic, slot);
      const activity = activities[slot];
      const spec = TFRRelicAbilityRuntimeSpec(relic.id, slot);
      const effectRefs = activity?.effects || [];
      const missingEffectRefs = effectRefs.filter(ref => !itemEffectIds.has(ref?._id));
      const coverage = [];
      if (def?.type === "damage") coverage.push("native damage");
      if (def?.type === "heal") coverage.push("native healing");
      if (def?.type === "save") coverage.push("native save");
      if (TFRRuntimeWorkCoveredByNativeEffects(spec)) coverage.push("native tray");
      else if (effectRefs.length) coverage.push("native refs");
      if (spec.teleport) coverage.push("module teleport");
      if (spec.removeSelf?.length || spec.removeTarget?.length || spec.tempHp) coverage.push("module helper");
      if (!coverage.length && spec.note) coverage.push("manual reminder");
      const runtimeCoverage = coverage.length ? coverage.join(" + ") : "manual/metadata";

      nativeEffectRefs += effectRefs.length;
      if (coverage.some(part => part.startsWith("native"))) nativeCovered++;
      if (coverage.some(part => part.startsWith("module"))) moduleCovered++;
      if (coverage.includes("manual reminder")) manualReminder++;
      if (runtimeCoverage === "manual/metadata") manualOnly++;
      const coverageKind = coverage.includes("manual reminder")
        ? "manualReminder"
        : runtimeCoverage === "manual/metadata"
          ? "manualOnly"
          : coverage.some(part => part.startsWith("module"))
            ? "module"
            : coverage.some(part => part.startsWith("native"))
              ? "native"
              : "metadata";

      const row = {
        relic: relic.name,
        slot,
        ability: def?.name || "",
        stage: TFRRequiredStageForSlot(slot),
        type: activity?.type || "",
        activation: activity?.activation?.type || "",
        target: activity?.target?.affects?.type || "",
        range: activity?.range?.units === "self" ? "self" : `${activity?.range?.value || 0} ${activity?.range?.units || ""}`.trim(),
        save: activity?.save?.ability || "",
        damage: (activity?.damage?.parts || []).map(part => `${part.number}d${part.denomination} ${part.types?.[0] || ""}`.trim()).join(", "),
        healing: activity?.healing ? `${activity.healing.number}d${activity.healing.denomination}` : "",
        effectRefs: effectRefs.length,
        coverageKind,
        runtimeCoverage,
        manualNote: coverageKind === "manualReminder" ? spec.note : "",
        ok: !!def && !!activity && missingEffectRefs.length === 0
      };

      if (!row.ok) issues.push({
        relic: relic.name,
        slot,
        issue: !def ? "missing definition" : !activity ? "missing activity" : `missing effect refs: ${missingEffectRefs.map(ref => ref?._id).join(", ")}`
      });

      rows.push(row);
    }
  }

  const summary = {
    relics: relics.length,
    activities: rows.length,
    nativeEffectRefs,
    nativeCovered,
    moduleCovered,
    manualReminder,
    manualOnly,
    issues: issues.length,
    status: issues.length ? "NEEDS ATTENTION" : "QA MATRIX READY"
  };

  console.log("========== THE FIRST RELICS QA MATRIX ==========");
  console.table(rows);
  console.table([summary]);
  if (issues.length) console.table(issues);
  if (issues.length) TFRNotifyWarn(`The First Relics QA Matrix: ${issues.length} issue(s). Check console.`);
  else TFRNotifyInfo(`The First Relics QA Matrix: ${rows.length} activities checked.`);
  return { summary, rows, issues };
}

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
  if (issues.length) TFRNotifyWarn(`The First Relics Runtime Coverage Audit: ${issues.length} issue(s). Check console.`);
  else TFRNotifyInfo(`The First Relics Runtime Coverage Audit passed: ${rows.length} activities checked.`);
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
  if (!game.user.isGM) return ui.notifications.warn("The First Relics Test Lab: GM only.");

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
      ui.notifications.warn(`The First Relics Test Lab: missing world item for ${relic.name}.`);
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
  ui.notifications.info("The First Relics Test Lab reset to dormant / 0 affinity.");
  return rows;
}


async function TFRCreatePlaytestLabSafe() {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics Test Lab: GM only.");
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
  ui.notifications.info("The First Relics Playtest Lab created at exalted / 1000 affinity.");
  return rows;
}


async function TFRRestoreAfterTestLabSafe() {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics Test Lab: GM only.");
  return TFRRestoreAfterTestLab();
}


async function TFRDestroyTestLabSafe() {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics Test Lab: GM only.");
  await TFRDeleteTestLab();
  ui.notifications.info("The First Relics Test Lab destroyed. Relic world state unchanged.");
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
  if (issues.length) ui.notifications.warn(`The First Relics Activity Audit: ${issues.length} issue(s). Check console.`);
  else ui.notifications.info(`The First Relics Activity Audit passed: ${totalActual}/${totalExpected} current item activities checked.`);
  return { coverage, summaryRows, rows, issues };
}

async function TFRInspectRelicActivities(relicIdOrName) {
  const relics = await TFRLoadRelics();
  const query = String(relicIdOrName || "").toLowerCase();
  const relic = relics.find(r => r.id.toLowerCase() === query || r.name.toLowerCase() === query || r.name.toLowerCase().includes(query));

  if (!relic) {
    ui.notifications.warn(`The First Relics: relic not found for "${relicIdOrName}".`);
    return [];
  }

  const actor = game.actors.getName(`TFR Test — ${relic.name}`);
  const item = actor?.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name)
    || game.items.find(i => i.getFlag("the-first-relics", "relicId") === relic.id || i.name === relic.name);

  if (!item) {
    ui.notifications.warn(`The First Relics: item not found for ${relic.name}.`);
    return [];
  }

  const rows = TFRGetActivitiesArray(item).map(activity => ({
    relic: relic.name,
    item: item.name,
    ...TFRActivitySummary(activity)
  }));

  console.table(rows);
  ui.notifications.info(`The First Relics: inspected ${rows.length} activities for ${relic.name}.`);
  return rows;
}


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
      active1: { type: "utility", activation: "bonus", target: "creature", range: "30 ft" },
      active2: { type: "save", activation: "action", target: "creature", range: "60 ft", save: "wis" },
      active3: { type: "utility", activation: "action", target: "self", range: "self" },
      active4: { type: "utility", activation: "action", target: "creature", range: "30 ft" },
      avatar: { type: "utility", activation: "bonus", target: "self", range: "self" },
      signature: { type: "save", activation: "action", target: "creature", range: "60 ft", save: "wis" }
    },
    bands_inner_dragon: {
      active1: { type: "utility", activation: "bonus", target: "self", range: "self" },
      active2: { type: "utility", activation: "reaction", target: "self", range: "self" },
      active3: { type: "utility", activation: "action", target: "self", range: "self" },
      active4: { type: "utility", activation: "action", target: "self", range: "self" },
      avatar: { type: "utility", activation: "bonus", target: "self", range: "self" },
      signature: { type: "utility", activation: "special", target: "self", range: "self" }
    },
    cloak_shadowfell: {
      active1: { type: "utility", activation: "bonus", target: "space", range: "30 ft" },
      active2: { type: "utility", activation: "reaction", target: "self", range: "self" },
      active3: { type: "utility", activation: "action", target: "space", range: "60 ft" },
      active4: { type: "damage", activation: "action", target: "creature", range: "5 ft", damage: "8d6 necrotic" },
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
      active1: { type: "save", activation: "bonus", target: "creature", range: "30 ft", save: "wis" },
      active2: { type: "utility", activation: "bonus", target: "self", range: "self" },
      active3: { type: "utility", activation: "action", target: "self", range: "self" },
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
      active3: { name: "Nature's Pursuit", type: "utility", activation: "bonus", range: "self", target: "self", charges: "3 itemUses" },
      active4: { name: "Briar Snare", type: "save", activation: "action", range: "60 ft", target: "creature", save: "str", charges: "4 itemUses" },
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

async function TFRAuditSprint1() {
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
  if (failed.length) ui.notifications.warn(`The First Relics Sprint 1 Audit: ${failed.length} issue(s). Check console.`);
  else ui.notifications.info("The First Relics Sprint 1 Audit passed.");
  return rows;
}



const TFRAutomation = {
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

async function TFRAuditAutomationEngine() {
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
  if (failed.length) ui.notifications.warn(`The First Relics Automation Engine: ${failed.length} issue(s). Check console.`);
  else ui.notifications.info("The First Relics Automation Engine audit passed.");
  return rows;
}

async function TFRTestAutomationEngine(relicId, slot = "active1") {
  const result = await TFRAutomation.dryRun(relicId, slot);
  console.table([result]);
  if (result.ok) ui.notifications.info(`Automation dry run OK: ${result.relic} / ${result.activity}`);
  else ui.notifications.warn(`Automation dry run failed: ${result.relic || relicId} / ${slot}`);
  return result;
}



function TFRSelectedToken() {
  return (canvas?.tokens?.controlled || [])[0] || null;
}

function TFRTokenCenter(token) {
  const doc = token.document || token;
  const gridSize = canvas?.grid?.size || 100;
  const width = (doc.width || 1) * gridSize;
  const height = (doc.height || 1) * gridSize;
  return {
    x: (doc.x ?? token.x ?? 0) + width / 2,
    y: (doc.y ?? token.y ?? 0) + height / 2
  };
}

function TFRDistanceFeet(a, b) {
  const gridSize = canvas?.grid?.size || 100;
  const gridDistance = canvas?.scene?.grid?.distance || 5;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (Math.sqrt(dx * dx + dy * dy) / gridSize) * gridDistance;
}

function TFRDestinationTopLeftForToken(token, center) {
  const doc = token.document || token;
  const gridSize = canvas?.grid?.size || 100;
  return {
    x: Math.round(center.x - ((doc.width || 1) * gridSize) / 2),
    y: Math.round(center.y - ((doc.height || 1) * gridSize) / 2)
  };
}

function TFRFindActorRelicItem(actor, relicId) {
  return actor?.items?.find(i => i.getFlag("the-first-relics", "relicId") === relicId);
}

function TFRIsCloakItem(item) {
  if (!item) return false;
  return item.getFlag("the-first-relics", "relicId") === "cloak_feywilds"
    || TFR_CLOAK_ITEM_NAMES.has(item.name);
}

async function TFRMigrateCloakDisplayName() {
  if (!game.user?.isGM) return { renamed: 0 };

  const targets = [...game.items.filter(item => TFR_CLOAK_LEGACY_NAMES.has(item.name))];
  for (const actor of game.actors) {
    targets.push(...actor.items.filter(item => TFR_CLOAK_LEGACY_NAMES.has(item.name)));
  }
  let renamed = 0;
  for (const item of targets) {
    if (!TFRIsCloakItem(item)) continue;
    await item.update({ name: TFR_CLOAK_DISPLAY_NAME });
    renamed += 1;
  }
  if (renamed) console.log(`The First Relics | Renamed ${renamed} existing item(s) to ${TFR_CLOAK_DISPLAY_NAME}.`);
  return { renamed };
}

function TFRGetItemCharges(item) {
  const uses = item?.system?.uses || {};
  if (Number.isFinite(Number(uses.value))) return Number(uses.value);
  if (Number.isFinite(Number(uses.max)) && Number.isFinite(Number(uses.spent))) return Number(uses.max) - Number(uses.spent);
  return null;
}

async function TFRConsumeItemCharges(item, amount = 1) {
  const uses = item?.system?.uses || {};
  const value = Number(uses.value);
  const spent = Number(uses.spent);
  const max = Number(uses.max);

  if (Number.isFinite(value)) {
    if (value < amount) return false;
    await item.update({ "system.uses.value": Math.max(0, value - amount) });
    return true;
  }

  if (Number.isFinite(spent) && Number.isFinite(max)) {
    if ((max - spent) < amount) return false;
    await item.update({ "system.uses.spent": spent + amount });
    return true;
  }

  console.warn("The First Relics: item uses model not found; charge consumption skipped.", item);
  return true;
}


async function TFRPickCanvasPoint({ message = "Click a destination on the canvas." } = {}) {
  ui.notifications.info(message);

  return new Promise((resolve, reject) => {
    const stage = canvas?.stage;
    const appStage = canvas?.app?.stage;

    if (!stage || !appStage) {
      reject(new Error("Canvas stage is not available."));
      return;
    }

    const oldCursor = stage.cursor;
    stage.cursor = "crosshair";

    const cleanup = () => {
      try { stage.off("mousedown", onClick); } catch (err) {}
      window.removeEventListener("keydown", onKey);
      stage.cursor = oldCursor;
    };

    const onKey = event => {
      if (event.key === "Escape") {
        cleanup();
        resolve(null);
      }
    };

    const onClick = event => {
      const pos = event.data.getLocalPosition(appStage);
      cleanup();
      resolve({ x: pos.x, y: pos.y });
    };

    window.addEventListener("keydown", onKey);
    stage.once("mousedown", onClick);
  });
}



function TFRFeyStepTokenKey(token, actor = null) {
  const doc = token?.document || token;
  const sceneId = canvas?.scene?.id || doc?.parent?.id || "scene";
  const tokenId = doc?.id || token?.id || token?.name || "token";
  const actorId = actor?.id || token?.actor?.id || doc?.actorId || "actor";
  return `${sceneId}:${tokenId}:${actorId}`;
}

function TFRMarkRecentFeyStep(key) {
  if (!key) return;
  const now = Date.now();
  TFR_FEY_STEP_RECENT.set(key, now);
  for (const [k, t] of TFR_FEY_STEP_RECENT.entries()) {
    if (now - t > TFR_FEY_STEP_DEBOUNCE_MS * 4) TFR_FEY_STEP_RECENT.delete(k);
  }
}

function TFRIsRecentFeyStep(key) {
  if (!key) return false;
  const previous = TFR_FEY_STEP_RECENT.get(key) || 0;
  return Date.now() - previous < TFR_FEY_STEP_DEBOUNCE_MS;
}

function TFRIsFeyStepInFlight(key) {
  return !!key && TFR_FEY_STEP_IN_FLIGHT.has(key);
}

function TFRSetFeyStepInFlight(key, active) {
  if (!key) return;
  if (active) TFR_FEY_STEP_IN_FLIGHT.add(key);
  else TFR_FEY_STEP_IN_FLIGHT.delete(key);
}

async function TFRExecuteFeyStep(options = {}) {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: Fey Step automation currently requires GM.");

  const token = options.token || TFRSelectedToken();
  if (!token) {
    ui.notifications.warn("Fey Step: select one token first.");
    return { ok: false, issue: "No selected token" };
  }

  const actor = token.actor;
  if (!actor) {
    ui.notifications.warn("Fey Step: selected token has no actor.");
    return { ok: false, issue: "Selected token has no actor" };
  }

  const tokenKey = TFRFeyStepTokenKey(token, actor);
  if (TFRIsFeyStepInFlight(tokenKey)) {
    ui.notifications.warn("Fey Step: this token already has an active destination picker.");
    return { ok: false, issue: "Fey Step already in progress", actor: actor.name };
  }

  TFRSetFeyStepInFlight(tokenKey, true);

  try {
    const relics = await TFRLoadRelics();
    const relic = relics.find(r => r.id === "cloak_feywilds");
    const item = TFRFindActorRelicItem(actor, "cloak_feywilds");

    if (!item) {
      ui.notifications.warn(`${actor.name} does not have ${TFR_CLOAK_DISPLAY_NAME}.`);
      return { ok: false, issue: `Actor does not have ${TFR_CLOAK_DISPLAY_NAME}`, actor: actor.name };
    }
    if (TFRBlockRelicFeatureUse(item, "Fey Step")) {
      return { ok: false, issue: "Attunement refused", actor: actor.name };
    }

    const def = TFRGetAbilityDefinition(relic, "active1");
    const charges = def?.charges ?? 1;
    const maxRange = def?.range ?? 60;
    const shouldConsumeCharges = options.consumeCharges !== false;
    let spentCharges = 0;

    const from = TFRTokenCenter(token);

    let destination = null;
    if (Number.isFinite(Number(options.x)) && Number.isFinite(Number(options.y))) {
      destination = { x: Number(options.x), y: Number(options.y) };
    } else {
      destination = await TFRPickCanvasPointWithRange({
        origin: from,
        rangeFeet: maxRange,
        message: `Fey Step: click a destination within ${maxRange} ft. Press Esc to cancel.`
      });
    }

    if (!destination) {
      ui.notifications.info("Fey Step cancelled.");
      return { ok: false, issue: "Cancelled", actor: actor.name };
    }

    const distance = TFRDistanceFeet(from, destination);

    if (distance > maxRange + 0.001) {
      ui.notifications.warn(`Fey Step: destination is ${distance.toFixed(1)} ft away, max is ${maxRange} ft.`);
      return {
        ok: false,
        issue: "Destination out of range",
        actor: actor.name,
        distance: Number(distance.toFixed(2)),
        maxRange
      };
    }

    if (shouldConsumeCharges) {
      const remaining = TFRGetItemCharges(item);
      if (remaining !== null && remaining < charges) {
        ui.notifications.warn(`Fey Step: not enough charges. Need ${charges}, have ${remaining}.`);
        return { ok: false, issue: "Not enough charges", actor: actor.name, remaining, charges };
      }

      const consumed = await TFRConsumeItemCharges(item, charges);
      if (!consumed) {
        ui.notifications.warn("Fey Step: charge consumption failed.");
        return { ok: false, issue: "Charge consumption failed", actor: actor.name };
      }
      spentCharges = charges;
    }

    const topLeft = TFRDestinationTopLeftForToken(token, destination);
    const restoreTeleportVisual = await TFRPlaySimpleTeleportAnimation(token, destination);
    await TFRMoveTokenAsTeleport(token, topLeft);
    if (typeof restoreTeleportVisual === "function") await restoreTeleportVisual();

    TFRMarkRecentFeyStep(tokenKey);

    await TFRAutomation.logTimeline("cloak_feywilds", {
      type: "Automation Execute",
      slot: "active1",
      actor: actor.name,
      activity: "Fey Step",
      reason: `${actor.name} used Fey Step (${distance.toFixed(1)} ft).${shouldConsumeCharges ? "" : " Charges were already consumed by dnd5e."}`
    });

    ui.notifications.info(`${actor.name} used Fey Step.`);
    return {
      ok: true,
      relic: TFR_CLOAK_DISPLAY_NAME,
      activity: "Fey Step",
      actor: actor.name,
      from,
      to: destination,
      distance: Number(distance.toFixed(2)),
      chargesSpent: spentCharges,
      chargeSource: shouldConsumeCharges ? "first-relics" : "dnd5e-card"
    };
  } finally {
    TFRSetFeyStepInFlight(tokenKey, false);
  }
}

function TFRControlPanelHtml() {
  return TFRControlPanelHtmlV2();
}

function TFRControlButton(action, icon, label, detail = "") {
  return `
    <button type="button" class="tfr-control-button" data-tfr-action="${TFREscapeHtml(action)}" aria-label="${TFREscapeHtml(label)}">
      <i class="${TFREscapeHtml(icon)}" inert></i>
      <span>
        <strong>${TFREscapeHtml(label)}</strong>
        ${detail ? `<small>${TFREscapeHtml(detail)}</small>` : ""}
      </span>
    </button>
  `;
}

function TFRControlPanelResultSummary(result, fallbackLabel = "Action") {
  const summary = result?.summary || {};
  const rows = Array.isArray(result) ? result : (result?.rows || result?.checks || result?.testLabRows || []);
  const issueCount = Number(summary.issues ?? summary.failures ?? result?.issues?.length ?? rows.filter?.(row => row?.ok === false || row?.issue || row?.issues)?.length ?? 0);
  const status = String(summary.status || (result?.ok === false ? "NEEDS ATTENTION" : issueCount ? "NEEDS ATTENTION" : "READY")).trim();
  const tone = /NEEDS ATTENTION|WARNING|MISSING|FAILED/i.test(status) || issueCount > 0 || result?.ok === false
    ? "warn"
    : /READY|STABLE|PASSED|COMPLETE|DONE/i.test(status)
      ? "ready"
      : "neutral";
  const facts = [];
  if (summary.version !== undefined) facts.push(`Version: ${summary.version}`);
  if (summary.relics !== undefined) facts.push(`Relics: ${summary.relics}`);
  if (summary.activities !== undefined) facts.push(`Activities: ${summary.activities}`);
  if (summary.checks !== undefined) facts.push(`Checks: ${summary.checks}`);
  if (summary.cleaned !== undefined) facts.push(`Cleaned: ${summary.cleaned}`);
  if (summary.native !== undefined) facts.push(`Native: ${summary.native}`);
  if (summary.module !== undefined) facts.push(`Module: ${summary.module}`);
  if (summary.manualReminder !== undefined) facts.push(`Manual reminders: ${summary.manualReminder}`);
  facts.push(`Issues: ${issueCount}`);
  return {
    label: fallbackLabel,
    status,
    tone,
    issueCount,
    facts
  };
}

function TFRControlPanelResultHtml(result, fallbackLabel = "Action") {
  const data = TFRControlPanelResultSummary(result, fallbackLabel);
  return `
    <strong>${TFREscapeHtml(data.status)}</strong>
    <span>${TFREscapeHtml(data.facts.join(" | "))}</span>
  `;
}

function TFRControlPanelHtmlV2() {
  return `
    <div class="the-first-relics-control-panel tfr-control-panel-v2">
      <div class="tfr-control-status" data-tfr-control-status>Ready.</div>
      <div class="tfr-control-result tfr-control-result-neutral" data-tfr-control-result>
        <strong>No QA run yet.</strong>
        <span>Run Playtest Health Check for a dashboard readiness summary.</span>
      </div>

      <section class="tfr-control-section">
        <div class="tfr-control-section-header">
          <h2>World Setup</h2>
          <p>Create, rebuild, and verify relic item copies.</p>
        </div>
        <div class="tfr-control-grid">
          ${TFRControlButton("createAll", "fa-solid fa-plus", "Create Missing World Items", "Adds relic world items and journal if missing.")}
          ${TFRControlButton("syncAllInventoryStages", "fa-solid fa-arrows-rotate", "Rebuild Existing Relics", "Refreshes actor/world item copies for the current module version.")}
          ${TFRControlButton("auditInventorySync", "fa-solid fa-list-check", "Audit Inventory Sync", "Reports actor/world relic stage mismatches.")}
          ${TFRControlButton("auditStageSyncSafety", "fa-solid fa-shield-halved", "Audit Stage Rebuild Safety", "Checks item copies before stage rebuild work.")}
        </div>
      </section>

      <section class="tfr-control-section">
        <div class="tfr-control-section-header">
          <h2>Test Lab</h2>
          <p>Build or clean temporary playtest actors.</p>
        </div>
        <div class="tfr-control-grid">
          ${TFRControlButton("createPlaytestLab", "fa-solid fa-flask", "Create Playtest Lab", "Builds exalted test actors at 1000 affinity.")}
          ${TFRControlButton("resetTestLab", "fa-solid fa-rotate-left", "Reset Test Lab", "Returns lab relics to dormant / 0 affinity.")}
          ${TFRControlButton("restoreAfterTestLab", "fa-solid fa-broom", "Clean Test Lab", "Removes lab actors and restores the exact pre-lab world state.")}
          ${TFRControlButton("auditTestLab", "fa-solid fa-magnifying-glass", "Audit Test Lab", "Reports current test lab actors and relic items.")}
        </div>
      </section>

      <section class="tfr-control-section">
        <div class="tfr-control-section-header">
          <h2>Audits</h2>
          <p>Console reports for generated relic data.</p>
        </div>
        <div class="tfr-control-grid">
          ${TFRControlButton("runDiagnostics", "fa-solid fa-stethoscope", "Run Diagnostics", "General module health report.")}
          ${TFRControlButton("runPlaytestHealthCheck", "fa-solid fa-heart-pulse", "Playtest Health Check", "Runs diagnostics, QA matrix, runtime coverage, and test lab audits.")}
          ${TFRControlButton("runReleaseCheck", "fa-solid fa-award", "Release Check", "Verifies playtest health, manifest, docs, and public API readiness.")}
          ${TFRControlButton("auditRelicQAMatrix", "fa-solid fa-clipboard-check", "12 Relic QA Matrix", "Build-level coverage report for every relic power.")}
          ${TFRControlButton("auditFinalFormBonuses", "fa-solid fa-gem", "Final Form +5 / 15 Audit", "Verifies that +5 and 15 charges unlock only at 1000 Affinity for all twelve relics.")}
          ${TFRControlButton("auditProgressiveAppearances", "fa-solid fa-eye", "Progressive Player Lore Audit", "Verifies that each manifestation appears only at its proper Affinity stage and GM lore stays hidden.")}
          ${TFRControlButton("auditRuntimeCoverage", "fa-solid fa-code-compare", "Runtime Coverage Audit", "Compares definitions, generated activities, and helper specs.")}
          ${TFRControlButton("auditRelicCleanup", "fa-solid fa-scroll", "Relic Cleanup Audit", "Checks relic text for placeholders, short forms, and missing lore guidance.")}
          ${TFRControlButton("auditNative", "fa-solid fa-layer-group", "Native Activity Audit", "Checks native dnd5e activity data and effect references.")}
          ${TFRControlButton("auditActivitiesDetailed", "fa-solid fa-table-list", "Detailed Activity Audit", "Lists generated activity type, target, range, save, damage, and healing.")}
          ${TFRControlButton("auditAllRelicEffects", "fa-solid fa-bolt", "Effect Automation Audit", "Lists helper effects, save conditions, cleanup, and teleport coverage.")}
        </div>
      </section>

      <section class="tfr-control-section">
        <div class="tfr-control-section-header">
          <h2>Selected Relic</h2>
          <p>Select a bearer token, then run the dashboard relic's powers.</p>
        </div>
        <div class="tfr-control-grid tfr-control-grid-compact">
          ${TFRControlButton("selectedRelicAbility:active1", "fa-solid fa-1", "Use Active 1", "Runs the selected relic's first dormant power.")}
          ${TFRControlButton("selectedRelicAbility:active2", "fa-solid fa-2", "Use Active 2", "Runs the selected relic's second dormant power.")}
          ${TFRControlButton("selectedRelicAbility:active3", "fa-solid fa-3", "Use Active 3", "Runs the selected relic's first awakened power.")}
          ${TFRControlButton("selectedRelicAbility:active4", "fa-solid fa-4", "Use Active 4", "Runs the selected relic's second awakened power.")}
          ${TFRControlButton("selectedRelicAbility:avatar", "fa-solid fa-person-rays", "Use Avatar", "Runs the selected relic's avatar power.")}
          ${TFRControlButton("selectedRelicAbility:signature", "fa-solid fa-crown", "Use Signature", "Runs the selected relic's signature power.")}
        </div>
      </section>
    </div>
  `;
}

async function TFRRunControlPanelAction(action, context = {}) {
  try {
    if (action === "createPlaytestLab") {
      if (typeof TFRCreatePlaytestLabSafe === "function") return await TFRCreatePlaytestLabSafe();
      return await TFRCreateTestLab({ stage: "exalted", affinity: 1000 });
    }

    if (action === "createAll") return await TFRCreateAll();
    if (action === "syncAllInventoryStages") return await TFRSyncAllInventoryStages();

    if (action === "resetTestLab") {
      if (typeof TFRResetTestLabSafe === "function") return await TFRResetTestLabSafe();
      return await TFRDeleteTestLab();
    }

    if (action === "deleteFeatureItems") return await TFRDeleteFeatureItems();
    if (action === "auditGeneratedFeatureItems") return await TFRAuditGeneratedFeatureItems();
    if (action === "auditTestLab") return await TFRAuditTestLab();

    if (action === "restoreAfterTestLab") {
      if (typeof TFRRestoreAfterTestLabSafe === "function") return await TFRRestoreAfterTestLabSafe();
      return await TFRDeleteTestLab();
    }

    if (action === "runDiagnostics") return await TFRRunDiagnostics();
    if (action === "runPlaytestHealthCheck") return await TFRRunPlaytestHealthCheck();
    if (action === "runReleaseCheck" || action === "runReleaseCandidateCheck") return await TFRRunReleaseCandidateCheck();
    if (action === "auditRelicQAMatrix") return await TFRAuditRelicQAMatrix();
    if (action === "auditFinalFormBonuses") return await TFRAuditFinalFormBonuses();
    if (action === "auditProgressiveAppearances") return await TFRAuditProgressiveAppearanceUnlocks();
    if (action === "auditRuntimeCoverage") return await TFRAuditRuntimeCoverage();
    if (action === "auditRelicCleanup") return await TFRAuditRelicCleanup();
    if (action === "auditNative") return await TFRAuditNative();
    if (action === "auditActivitiesDetailed") return await TFRAuditActivitiesDetailed();
    if (action === "auditInventorySync") return await TFRAuditInventorySync();
    if (action === "auditStageSyncSafety") return await TFRAuditStageSyncSafety();
    if (action === "auditSprint1") return await TFRAuditSprint1();
    if (action === "auditActivityTemplates") return await TFRAuditActivityTemplates();
    if (action === "auditAutomationEngine") return await TFRAuditAutomationEngine();
    if (action === "applySystemTemplates") return await TFRApplySystemTemplates();
    if (action === "auditSystemTemplates") return await TFRAuditSystemTemplates();
    if (action === "createFeatureItems") return await TFRCreateFeatureItems();
    if (action === "createResolvedTemplateItems") return await TFRCreateResolvedTemplateItems();
    if (action === "createSpellbookFeatures") return await TFRCreateSpellbookFeatures();
    if (action === "auditSpellbookFeatures") return await TFRAuditSpellbookFeatures();
    if (action === "auditResolvedTemplateItems") return await TFRAuditResolvedTemplateItems();
    if (action === "auditFeatureItems") return await TFRAuditFeatureItems();
    if (action === "feyStep") return await TFRExecuteFeyStep();
    if (action === "auditCloakAutomation") return await TFRAuditCloakAutomation();
    if (action === "auditAllRelicEffects") return await TFRAuditAllRelicEffectAutomation();
    if (action?.startsWith?.("cloakAbility:")) {
      const abilityId = action.split(":")[1];
      return await TFRUseCloakAbility(null, abilityId);
    }
    if (action?.startsWith?.("selectedRelicAbility:")) {
      const slot = action.split(":")[1];
      return await TFRUseSelectedRelicAbility(context?.relicId, slot, { spendCharges: true, fromControlPanel: true });
    }

    ui.notifications.warn(`Unknown The First Relics action: ${action}`);
  } catch (err) {
    console.error(`The First Relics action failed: ${action}`, err);
    ui.notifications.error(`The First Relics action failed: ${action}. Check console.`);
  }
}

function TFRWireControlPanel(html) {
  const root = TFRSheetHtmlElement(html);
  if (!root) return;

  const status = root.querySelector("[data-tfr-control-status]");
  const resultPanel = root.querySelector("[data-tfr-control-result]");
  const buttons = Array.from(root.querySelectorAll("[data-tfr-action]"));
  const setStatus = text => {
    if (status) status.textContent = text;
  };
  const setResult = (result, label) => {
    if (!resultPanel) return;
    const data = TFRControlPanelResultSummary(result, label);
    resultPanel.className = `tfr-control-result tfr-control-result-${data.tone}`;
    resultPanel.innerHTML = TFRControlPanelResultHtml(result, label);
  };

  buttons.forEach(button => {
    button.addEventListener("click", async event => {
      event.preventDefault();
      const action = button.dataset.tfrAction;
      buttons.forEach(b => b.disabled = true);
      button.classList.add("tfr-action-running");
      setStatus(`Running: ${button.textContent.trim()}...`);
      try {
        const relicInput = root.querySelector("[name='relic']");
        const result = await TFRRunControlPanelAction(action, { relicId: relicInput?.value || null });
        const resultSummary = TFRControlPanelResultSummary(result, button.textContent.trim());
        const ok = resultSummary.tone !== "warn";
        setStatus(ok ? `${resultSummary.status}: ${button.textContent.trim()}.` : `${resultSummary.status}: ${resultSummary.issueCount} issue(s). Check console.`);
        setResult(result, button.textContent.trim());
      } finally {
        button.classList.remove("tfr-action-running");
        buttons.forEach(b => b.disabled = false);
      }
    });
  });
}

async function TFROpenControlPanel() {
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");
  const dialog = new foundry.applications.api.DialogV2({
    classes: ["tfr-dialog"],
    window: { title: "The First Relics — GM Control Panel", resizable: true },
    position: { width: 680, height: 720 },
    content: TFRControlPanelHtmlV2(),
    buttons: [{ action: "close", label: "Close", default: true }]
  });

  await dialog.render({ force: true });
  TFRWireControlPanel(dialog.element);
  return dialog;
}


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
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");

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
  if (failed.length) ui.notifications.warn(`The First Relics System Templates: ${failed.length} issue(s). Check console.`);
  else ui.notifications.info(`The First Relics System Templates applied to ${rows.length} item(s).`);
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
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");

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
  if (failed.length) ui.notifications.warn(`The First Relics Feature Items: ${failed.length} issue(s). Check console.`);
  else ui.notifications.info(`The First Relics Feature Items created for ${rows.length} actor(s).`);
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
  if (failed.length) ui.notifications.warn(`The First Relics Feature Item Audit: ${failed.length} missing feature item(s).`);
  else ui.notifications.info("The First Relics Feature Item Audit passed.");
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
    ui.notifications.warn(`The First Relics: template not found: ${templateName}`);
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
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");

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
  if (failed.length) ui.notifications.warn(`The First Relics Resolver: ${failed.length} issue(s). Check console.`);
  else ui.notifications.info(`The First Relics Resolver created ${rows.length} resolved template item(s).`);
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
  if (!rows.length) ui.notifications.warn("The First Relics Resolver Audit: no resolved template items found.");
  else ui.notifications.info("The First Relics Resolver Audit complete.");
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
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");

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
  if (failed.length) ui.notifications.warn(`The First Relics Spellbook Features: ${failed.length} issue(s). Check console.`);
  else ui.notifications.info(`The First Relics Spellbook Features created for ${rows.length} actor(s).`);
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
  if (!rows.length) ui.notifications.warn("The First Relics Spellbook Feature Audit: no spellbook features found.");
  else ui.notifications.info("The First Relics Spellbook Feature Audit complete.");
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
  if (!game.user.isGM) return ui.notifications.warn("The First Relics: GM only.");

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
  ui.notifications.info(`The First Relics: deleted ${rows.reduce((n, r) => n + r.deleted, 0)} generated feature item(s).`);
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
  if (!rows.length) ui.notifications.info("The First Relics: no generated feature items found.");
  else ui.notifications.warn(`The First Relics: ${rows.length} generated feature item(s) found.`);
  return rows;
}
























function TFRDrawRangeCircle(origin, rangeFeet) {
  const layer = canvas?.controls || canvas?.stage;
  if (!layer || !window.PIXI) return null;

  const gridSize = canvas?.grid?.size || 100;
  const gridDistance = canvas?.scene?.grid?.distance || 5;
  const radiusPx = (rangeFeet / gridDistance) * gridSize;

  const g = new PIXI.Graphics();

  // Foundry v13 may run newer PIXI APIs while older worlds/modules still expose legacy methods.
  // Support both so the range ring does not become the reason Fey Step fails.
  if (typeof g.circle === "function" && typeof g.fill === "function" && typeof g.stroke === "function") {
    g.circle(origin.x, origin.y, radiusPx).fill({ color: 0x7ee8ff, alpha: 0.08 });
    g.circle(origin.x, origin.y, radiusPx).stroke({ width: 3, color: 0x7ee8ff, alpha: 0.95 });
    g.circle(origin.x, origin.y, radiusPx + 3).stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
  } else {
    g.lineStyle(3, 0x7ee8ff, 0.95);
    g.beginFill(0x7ee8ff, 0.08);
    g.drawCircle(origin.x, origin.y, radiusPx);
    g.endFill();

    g.lineStyle(1, 0xffffff, 0.35);
    g.drawCircle(origin.x, origin.y, radiusPx + 3);
  }

  layer.addChild(g);
  return g;
}

async function TFRPickCanvasPointWithRange({ origin, rangeFeet = 60, message = "Click a destination." } = {}) {
  ui.notifications.info(message);

  const ring = TFRDrawRangeCircle(origin, rangeFeet);

  return new Promise((resolve, reject) => {
    const stage = canvas?.stage;
    const appStage = canvas?.app?.stage;

    if (!stage || !appStage) {
      try { ring?.destroy?.(); } catch (err) {}
      reject(new Error("Canvas stage is not available."));
      return;
    }

    const oldCursor = stage.cursor;
    stage.cursor = "crosshair";

    const cleanup = () => {
      try { stage.off("mousedown", onClick); } catch (err) {}
      window.removeEventListener("keydown", onKey);
      stage.cursor = oldCursor;
      try { ring?.destroy?.(); } catch (err) {}
    };

    const onKey = event => {
      if (event.key === "Escape") {
        cleanup();
        resolve(null);
      }
    };

    const onClick = event => {
      const pos = event.data.getLocalPosition(appStage);
      cleanup();
      resolve({ x: pos.x, y: pos.y });
    };

    window.addEventListener("keydown", onKey);
    stage.once("mousedown", onClick);
  });
}

async function TFRMoveTokenAsTeleport(token, topLeft) {
  const doc = token?.document || token;
  const obj = token?.object || doc?.object || token;

  if (!doc?.update) throw new Error("Fey Step: token document update is not available.");

  try {
    if (obj) {
      obj.alpha = 0;
      if (typeof obj.visible === "boolean") obj.visible = false;
    }
  } catch (err) {}

  const updateOptions = {
    animate: false,
    noAnimation: true,
    animation: { duration: 0 }
  };

  try {
    await doc.update(topLeft, updateOptions);
  } catch (err) {
    console.warn("The First Relics: zero-animation token update failed; retrying normal document update.", err);
    await doc.update(topLeft);
  }

  const finalObj = doc?.object || token?.object || obj;
  try {
    if (finalObj?.position?.set) finalObj.position.set(topLeft.x, topLeft.y);
    else if (finalObj) {
      finalObj.x = topLeft.x;
      finalObj.y = topLeft.y;
    }
    finalObj?.refresh?.();
  } catch (err) {}

  try {
    canvas?.perception?.update?.({ refreshLighting: true, refreshVision: true }, true);
  } catch (err) {}
}

async function TFRPlaySimpleTeleportAnimation(token, destination) {
  const doc = token?.document || token;
  const obj = token?.object || doc?.object || token;
  if (!obj) return;

  const originalAlpha = obj.alpha ?? 1;
  const originalVisible = typeof obj.visible === "boolean" ? obj.visible : true;

  try {
    if (typeof obj.visible === "boolean") obj.visible = true;
    for (const a of [0.8, 0.55, 0.3, 0.1, 0]) {
      obj.alpha = a;
      await new Promise(r => setTimeout(r, 25));
    }
    obj.alpha = 0;
    if (typeof obj.visible === "boolean") obj.visible = false;
  } catch (err) {}

  return async () => {
    const finalObj = doc?.object || token?.object || obj;
    try {
      if (typeof finalObj.visible === "boolean") finalObj.visible = true;
      finalObj.alpha = 0;
      await new Promise(r => setTimeout(r, 35));
      for (const a of [0.15, 0.35, 0.6, 0.85, originalAlpha]) {
        finalObj.alpha = a;
        await new Promise(r => setTimeout(r, 25));
      }
      finalObj.alpha = originalAlpha;
      if (typeof finalObj.visible === "boolean") finalObj.visible = originalVisible;
    } catch (err) {
      try {
        finalObj.alpha = originalAlpha;
        if (typeof finalObj.visible === "boolean") finalObj.visible = originalVisible;
      } catch (e) {}
    }
  };
}

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
  ui.notifications.warn(`${info.label} is locked. ${info.item.name} is currently ${TFRStageTitle(info.stage)}; required: ${info.required}.`);
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
    const slot = TFR_CLOAK_ABILITY_SLOTS_BY_LABEL[label.toLowerCase()];
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

  const namesRelic = text.includes("cloak of fey paths") || text.includes("cloak of verdant paths") || text.includes("cloak of feywilds")
    || flagText.includes("cloak of fey paths") || flagText.includes("cloak of verdant paths") || flagText.includes("cloak of feywilds")
    || flagText.includes("cloak_feywilds");
  const namesAbility = text.includes("fey step") || flagText.includes("fey step");
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
          ui.notifications.warn(`Fey Step: ${actor.name} için sahnede kaynak token bulunamadı. Token seçip GM Dashboard > Control Panel > Fey Step kullan.`);
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


Hooks.once("ready", async () => {
  Hooks.on("renderItemSheet", TFRApplyRelicSheetVisibility);
  Hooks.on("renderItemSheet5e", TFRApplyRelicSheetVisibility);

  window.FirstRelics = {
    loadRelics: TFRLoadRelics,
    createRelics: TFRCreateRelics,
    createItems: TFRCreateRelics,
    createJournal: TFRCreateJournal,
    createAll: TFRCreateAll,
    updateStage: TFRUpdateRelicItem,
    upgradeItem: TFRUpgradeItem,
    downgradeItem: TFRDowngradeItem,
    initActorRelicData: TFRInitActorRelicData,
    setAffinity: TFRSetAffinity,
    adjustAffinity: TFRAdjustAffinity,
    deleteAll: TFRDeleteAll,
    openDashboard: TFROpenDashboard,
    dashboard: TFROpenDashboard,
    syncStageFromAffinity: TFRSyncStageFromAffinity,
    getRelicState: TFRGetRelicState,
    setRelicAffinity: TFRSetRelicAffinity,
    adjustRelicAffinity: TFRAdjustRelicAffinity,
    applyAffinityEvent: TFRApplyAffinityEvent,
    audit: TFRAuditRelics,
    auditActivities: TFRAuditActivities,
    auditMidiEffects: TFRAuditMidiEffects,
    auditNative: TFRAuditNative,
    auditTargeting: TFRAuditTargeting,
    auditAbilityDesign: TFRAuditAbilityDesign,
    auditInventorySync: TFRAuditInventorySync,
    syncAllInventoryStages: TFRSyncAllInventoryStages,
    auditStageSyncSafety: TFRAuditStageSyncSafety,
    setRequirement: TFRSetRequirement,
    unlockMemory: TFRUnlockMemory,
    sendDream: TFRSendDream,
    addTimeline: TFRAddTimeline,
    auditProgression: TFRAuditProgression,
    createTestLab: TFRCreateTestLab,
    deleteTestLab: TFRDeleteTestLab,
    auditTestLab: TFRAuditTestLab,
    resetTestLab: TFRResetTestLabSafe,
    restoreAfterTestLab: TFRRestoreAfterTestLabSafe,
    destroyTestLab: TFRDestroyTestLabSafe,
    runDiagnostics: TFRRunDiagnostics,
    runPlaytestHealthCheck: TFRRunPlaytestHealthCheck,
    runReleaseCheck: TFRRunReleaseCandidateCheck,
    runReleaseCandidateCheck: TFRRunReleaseCandidateCheck,
    auditRelicQAMatrix: TFRAuditRelicQAMatrix,
    auditFinalFormBonuses: TFRAuditFinalFormBonuses,
    auditProgressiveAppearances: TFRAuditProgressiveAppearanceUnlocks,
    syncExistingLoreJournal: TFRSyncExistingLoreJournal,
    auditRuntimeCoverage: TFRAuditRuntimeCoverage,
    auditRelicCleanup: TFRAuditRelicCleanup,
    activityCount: TFRActivityCount,
    createPlaytestLab: TFRCreatePlaytestLabSafe,
    auditActivitiesDetailed: TFRAuditActivitiesDetailed,
    inspectRelicActivities: TFRInspectRelicActivities,
    auditSprint1: TFRAuditSprint1,
    auditAutomationEngine: TFRAuditAutomationEngine,
    testAutomationEngine: TFRTestAutomationEngine,
    automation: TFRAutomation,
    feyStep: TFRExecuteFeyStep,
    auditActivityTemplates: TFRAuditActivityTemplates,
    openControlPanel: TFROpenControlPanel,
    applySystemTemplates: TFRApplySystemTemplates,
    auditSystemTemplates: TFRAuditSystemTemplates,
    createFeatureItems: TFRCreateFeatureItems,
    auditFeatureItems: TFRAuditFeatureItems,
    resolveTemplate: TFRResolveTemplate,
    createResolvedTemplateItems: TFRCreateResolvedTemplateItems,
    auditResolvedTemplateItems: TFRAuditResolvedTemplateItems,
    createSpellbookFeatures: TFRCreateSpellbookFeatures,
    auditSpellbookFeatures: TFRAuditSpellbookFeatures,
    deleteFeatureItems: TFRDeleteFeatureItems,
    auditGeneratedFeatureItems: TFRAuditGeneratedFeatureItems,
    useCloakAbility: TFRUseCloakAbility,
    useRelicAbility: TFRUseRelicAbility,
    useSelectedRelicAbility: TFRUseSelectedRelicAbility,
    shadowStep: (actorOrId = null, options = {}) => TFRUseRelicAbility(actorOrId, "cloak_shadowfell", "active1", options),
    fadeAway: (actorOrId = null, options = {}) => TFRUseRelicAbility(actorOrId, "cloak_shadowfell", "active2", options),
    auditAllRelicEffects: TFRAuditAllRelicEffectAutomation,
    auditSaveAwarePending: TFRAuditSaveAwarePending,
    resolveSaveAwareManual: TFRResolveSaveAwareManual,
    applyBriarSnare: TFRApplyVerdantSnare,
    applyVerdantSnare: TFRApplyVerdantSnare,
    applyRestrainedCondition: TFRApplyRestrainedCondition,
    refreshActorAndItemSheets: TFRRefreshActorAndItemSheets,
    auditCloakAutomation: TFRAuditCloakAutomation,
    migrateCloakDisplayName: TFRMigrateCloakDisplayName,
    syncSealedTrueNameDescriptions: TFRSyncSealedTrueNameDescriptions,
    syncProgressiveAppearanceDescriptions: TFRSyncProgressiveAppearanceDescriptions,
    syncFinalFormItems: TFRSyncFinalFormItems,
    auditTrueNameSealing: TFRAuditTrueNameSealing,
    clearLockedActivities: TFRClearLockedActivities,
    setAttunementRefusal: TFRSetAttunementRefusal,
    setRelicAttunementRefusal: TFRSetRelicAttunementRefusal,
    refuseAttunement: itemOrUuid => TFRSetAttunementRefusal(itemOrUuid, true),
    allowAttunement: itemOrUuid => TFRSetAttunementRefusal(itemOrUuid, false)
  };
  TFRRegisterWorldState();
  TFRRegisterSettings();
  TFRRegisterFeyStepChatAutomation();
  TFRRegisterRelicActivityGateHooks();
  TFRRegisterTimedEffectExpiry();
  TFRRegisterSaveAwareAutomation();
  TFRRegisterSaveAwareChatButtons();
  TFRRegisterAttunementRefusal();
  try {
    await TFRNormalizeRefusingRelicItems();
  } catch (error) {
    console.error("The First Relics | Could not normalize refused relic feature suppression.", error);
  }
  try {
    await TFRMigrateCloakDisplayName();
  } catch (error) {
    console.error(`The First Relics | Could not migrate existing items to ${TFR_CLOAK_DISPLAY_NAME}.`, error);
  }
  try {
    await TFRSyncSealedTrueNameDescriptions();
  } catch (error) {
    console.error("The First Relics | Could not repair prematurely revealed true names.", error);
  }
  try {
    await TFRSyncExistingLoreJournal();
  } catch (error) {
    console.error("The First Relics | Could not synchronize the existing lore journal.", error);
  }
  try {
    await TFRSyncFinalFormItems();
  } catch (error) {
    console.error("The First Relics | Could not synchronize 1000-Affinity Final Form bonuses.", error);
  }
  try {
    await TFRSyncProgressiveAppearanceDescriptions();
  } catch (error) {
    console.error("The First Relics | Could not synchronize progressive player manifestations.", error);
  }
  console.log(`The First Relics Framework v${TFR_VERSION} loaded.`);
});
