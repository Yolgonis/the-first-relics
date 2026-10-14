function TFRBuildDescription(relic, stage, signatureUnlocked = false) {
  const stageData = TFRGetStageData(relic, stage, signatureUnlocked);
  const b = stageData.bonus;
  const f = relic.features;
  const passives = f.passives.slice(0, TFRUnlockedPassiveCount(stage));
  const actives = stage === "dormant" ? f.actives.slice(0, 2) : stage === "awakened" ? f.actives.slice(0, 4) : f.actives.slice(0, 4);

  const description = `
  <div class="first-relics-item-description">
    <h2>${relic.name}</h2>

    <p><em>${stage === "exalted" ? TFRT("Artifact") : TFRT("Artifact, requires attunement by a {className}", { className: relic.class })}</em></p>
    <p><strong>${TFRT("Attunement:")}</strong> ${TFRAttunementText(stage)}</p>
    <p><strong>${TFRT("Form:")}</strong> ${stageData.title}</p>
    <p><strong>${TFRT("Virtue:")}</strong> ${relic.virtue}</p>
    <p><strong>${TFRT("Theme:")}</strong> ${relic.theme}</p>
    ${relic.trueName ? `<p><strong>${TFRT("True Name:")}</strong> ${signatureUnlocked ? relic.trueName.full : "???"}</p>` : ""}
    ${TFRRelicMoodHtml(relic, stage, signatureUnlocked)}
    ${TFRRelicAppearanceHtml(relic, stage, signatureUnlocked)}

    <h3>${TFRT("Universal Relic Bonus")}</h3>
    <ul>
      <li><strong>${TFRT("+{bonus} AC", { bonus: b })}</strong></li>
      <li><strong>${TFRT("+{bonus} to all saving throws", { bonus: b })}</strong></li>
      <li>${TFRT("<strong>+{bonus} Spell Save DC</strong>, if the bearer has Spellcasting or Pact Magic", { bonus: b })}</li>
      <li>${TFRT("<strong>+{bonus} spell attack rolls</strong>, if the bearer uses spell attacks", { bonus: b })}</li>
      <li>${TFRT("<strong>+{bonus} weapon attack and weapon damage rolls</strong>, if the bearer uses weapons or unarmed strikes", { bonus: b })}</li>
    </ul>
    ${TFRIsFinalForm(stage, signatureUnlocked) ? `<p>${TFRT("<strong>Final Form:</strong> At 1000 Affinity, perfect harmony raises every Universal Relic Bonus to <strong>+{bonus}</strong> and maximum charges to <strong>{charges}</strong>.", { bonus: TFR_FINAL_FORM_BONUS, charges: TFR_FINAL_FORM_CHARGES })}</p>` : ""}

    <h3>${TFRT("Charges")}</h3>
    <p>${TFRT("The relic has <strong>{charges} charges</strong> and regains all expended charges daily at dawn.", { charges: stageData.charges })}</p>

    <h3>${TFRT("Unlocked Passive Features")}</h3>
    <ul>${passives.map((p, i) => { const auto = TFRPassiveAutomationAny(relic.id, i); return `<li>${p}${auto ? ` <em class="tfr-automated">(${TFRPassiveAutomationNote(auto)})</em>` : ""}</li>`; }).join("")}</ul>

    <h3>${TFRT("Unlocked Active Features")}</h3>
    <ul>${actives.map(a => `<li>${a}</li>`).join("")}</ul>

    ${stage === "exalted" ? `
      <h3>${TFRT("Avatar Form")}</h3>
      <p>${f.avatar}</p>
      <h3>${TFRT("Signature Ability")}</h3>
      ${signatureUnlocked ? `<p>${f.signature}</p>` : `
        <p class="tfr-locked">${TFRT("<strong>Sealed.</strong> The relic has accepted you as its Exalted bearer, but its final power remains locked.")}</p>
        <p class="tfr-locked">${TFRT("Reach <strong>1000 Affinity</strong> to awaken the relic's true name and unlock its Signature Ability.")}</p>
      `}
    ` : ""}

    <h3>${TFRT("Use Notes")}</h3>
    <p>${TFRT("<strong>Automated:</strong> charges, universal bonuses, damage rolls, and avatar helper effects.")}</p>
    ${relic.id === "cloak_feywilds" ? `<p>${TFRT("<strong>Automated:</strong> Fey Step movement, Cloak helper effects, and Briar Snare restrained helper.")}</p>` : ""}
    <p>${TFRT("<strong>Manual:</strong> prone, darkness templates, forced rerolls, and complex edge cases may still require GM resolution.")}</p>
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

/** Display name for a status id: the system status label (localized when available), else title case. */
function TFRConditionLabel(statusId = "") {
  const status = (globalThis.CONFIG?.statusEffects || []).find(s => s.id === statusId);
  const name = status?.name ? globalThis.game?.i18n?.localize?.(status.name) || status.name : "";
  return name || TFRTitleCaseStatus(statusId);
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
  const def = TFRAbilityDefinitions()[relic.id]?.[slot] || null;
  const localizedName = relic?.abilityNames?.[slot];
  return def && localizedName ? { ...def, name: localizedName } : def;
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
  if (missing.length) ui.notifications.warn(TFRT("The First Relics Template Audit: {missingCount} issue(s).", { missingCount: missing.length }));
  else ui.notifications.info(TFRT("The First Relics Activity Template Audit passed."));
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

