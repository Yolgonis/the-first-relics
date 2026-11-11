import "./00-core.js"; // keeps the original load order
import { TFRRelicTable } from "./relics/index.js";
import { TFRContentScoped, TFRT, TFR_FINAL_FORM_BONUS, TFR_FINAL_FORM_CHARGES } from "./00-core.js";

export function TFRMode(name) {
  return CONST.ACTIVE_EFFECT_MODES[name];
}

function TFRActivityId(index) {
  return `TFR${String(index).padStart(13, "0")}`.slice(0, 16);
}

export function TFRStageTitle(stage) {
  return stage[0].toUpperCase() + stage.slice(1);
}

export function TFRIsFinalForm(stage, signatureUnlocked = false) {
  return stage === "exalted" && !!signatureUnlocked;
}

export function TFRGetStageData(relic, stage, signatureUnlocked = false) {
  const stageData = relic.stages[stage] ?? relic.stages.dormant;
  if (!TFRIsFinalForm(stage, signatureUnlocked)) return stageData;
  return {
    ...stageData,
    title: "Final Form",
    bonus: TFR_FINAL_FORM_BONUS,
    charges: TFR_FINAL_FORM_CHARGES
  };
}

export function TFRDisplayStage(stage, signatureUnlocked = false) {
  return TFRIsFinalForm(stage, signatureUnlocked) ? "final form" : stage;
}

/** Translated label for a stage id; stage ids themselves stay English in flags and data. */
export function TFRStageLabel(stage) {
  const labels = {
    dormant: TFRT("dormant"),
    awakened: TFRT("awakened"),
    exalted: TFRT("exalted"),
    "final form": TFRT("final form")
  };
  return labels[stage] ?? stage;
}


export function TFRAttunementForStage(stage) {
  // dnd5e uses "required" for attunement-required items.
  // Empty string is the safest no-attunement value for item data.
  return stage === "exalted" ? "" : "required";
}

export function TFRAttunementText(stage) {
  return stage === "exalted"
    ? TFRT("The relic has become part of its bearer and no longer requires attunement.")
    : TFRT("This relic requires attunement.");
}


export function TFRBaseChanges(stageData) {
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


export function TFRDamageTypeForRelic(relic) {
  const map = TFRRelicTable("damageType");
  return map[relic.id] ?? "force";
}

export function TFRMakeDamageActivity(activity, relic, number = 4, denomination = 8, forcedType = null) {
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

export function TFRAvatarEffect(relic) {
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

export function TFRTrueNameLeaks(relic, text) {
  const source = String(text || "");
  return TFRTrueNameTokens(relic).filter(token => new RegExp(TFREscapeRegExp(token), "i").test(source));
}

export function TFRSealTrueNameText(relic, text, signatureUnlocked = false) {
  let sealed = String(text || "");
  if (signatureUnlocked) return sealed;
  for (const token of TFRTrueNameTokens(relic)) {
    sealed = sealed.replace(new RegExp(TFREscapeRegExp(token), "gi"), TFRT("[True Name Sealed]"));
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

export function TFRRelicMoodHtml(relic, stage, signatureUnlocked = false) {
  const current = TFRRelicCurrentMoodEntry(relic, stage, signatureUnlocked);
  if (!current) return "";

  return `
    <h3 data-tfr-section="signs">${TFRT("Revealed Relic Signs")}</h3>
    <p><strong>${TFRT("Current Presence:")}</strong> ${current.mood}</p>
    <p><em>${TFRSealTrueNameText(relic, current.description, signatureUnlocked)}</em></p>
  `;
}

function TFRRelicUnlockedAppearanceEntries(relic, stage, signatureUnlocked = false) {
  const lore = relic?.lore || {};
  const stageRank = stage === "exalted" ? 2 : stage === "awakened" ? 1 : 0;
  return [
    { label: TFRT("Dormant"), text: lore.appearanceDormant, unlocked: stageRank >= 0 },
    { label: TFRT("Awakened"), text: lore.appearanceAwakened, unlocked: stageRank >= 1 },
    { label: TFRT("Exalted"), text: lore.appearanceExalted, unlocked: stageRank >= 2 },
    { label: TFRT("Final Form"), text: lore.appearanceSignature, unlocked: TFRIsFinalForm(stage, signatureUnlocked) }
  ].filter(entry => entry.unlocked && entry.text);
}

export function TFRRelicAppearanceHtml(relic, stage, signatureUnlocked = false) {
  const entries = TFRRelicUnlockedAppearanceEntries(relic, stage, signatureUnlocked);
  if (!entries.length) return "";
  return `
    <h3>${TFRT("Revealed Manifestations")}</h3>
    <ul>${entries.map(entry => `<li><strong>${entry.label}.</strong> ${entry.text}</li>`).join("")}</ul>
  `;
}

function TFRRelicGmSecretsHtml(relic) {
  const moodRows = (Array.isArray(relic?.moodMap) ? relic.moodMap : [])
    .map(entry => `<li><strong>${entry.min}-${entry.max} ${entry.mood}.</strong> ${entry.description}</li>`)
    .join("");
  const likes = relic?.personality?.likes?.length ? `<p><strong>${TFRT("Likes:")}</strong> ${relic.personality.likes.join(", ")}</p>` : "";
  const dislikes = relic?.personality?.dislikes?.length ? `<p><strong>${TFRT("Dislikes:")}</strong> ${relic.personality.dislikes.join(", ")}</p>` : "";
  const guidance = relic?.personality?.roleplayGuidance ? `<p><strong>${TFRT("Roleplay Guidance:")}</strong> ${relic.personality.roleplayGuidance}</p>` : "";
  if (!moodRows && !likes && !dislikes && !guidance) return "";

  return `
    <section class="tfr-gm-relic-notes" data-tfr-gm-notes="true">
      <h3>${TFRT("GM Relic Notes")}</h3>
      ${guidance}
      ${likes}
      ${dislikes}
      ${moodRows ? `<h4>${TFRT("Full Affinity Mood Map")}</h4><ul>${moodRows}</ul>` : ""}
    </section>
  `;
}

export function TFRSheetHtmlElement(html) {
  // An ApplicationV2 sheet passes its <form>; form[0] would be its first field, not the sheet.
  if (html instanceof globalThis.HTMLElement) return html;
  return html?.jquery ? html[0] : html?.[0] || html;
}

function TFRRelicDescriptionRoot(element) {
  return element?.querySelector?.(".first-relics-item-description") || null;
}

export function TFRRemovePlayerMoodHistory(element) {
  const root = TFRRelicDescriptionRoot(element);
  if (!root) return;
  const heading = Array.from(root.querySelectorAll("h3"))
    .find(node => node.dataset?.tfrSection === "signs" || node.textContent?.trim() === "Revealed Relic Signs");
  if (!heading) return;

  let node = heading.nextElementSibling;
  while (node && node.tagName !== "H3") {
    const next = node.nextElementSibling;
    if (node.tagName === "UL") node.remove();
    node = next;
  }
}

export function TFRRemoveDescriptionSection(element, headingText) {
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

// Text these builders write into world documents uses the world's relic content language, not
// the language of whichever GM triggers the write (see TFRContentScoped in 00-core.js).
TFRSealTrueNameText = TFRContentScoped(TFRSealTrueNameText);
