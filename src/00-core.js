
const TFR_MODULE_ID = "the-first-relics";
const TFR_VERSION = "1.3.0";
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
// Resolves when the ready hook's item repairs have finished; batch operations wait for it so
// they never rebuild the same relic copies or write relic state at the same time.
let TFR_STARTUP_SYNC = Promise.resolve();
const TFR_RELIC_LOCKS = new Map();

/**
 * Translate a user-facing English string.
 * The English text stays in the code as the source of truth; its translation key is a
 * stable hash of that text, so tools/i18n-extract.cjs can regenerate lang/en.json and
 * report missing translations. Use {name} placeholders instead of template literals.
 * @param {string} text            English source text (must be a plain string literal).
 * @param {object} [data]          Values for {placeholders}.
 * @returns {string}
 */
function TFRT(text, data) {
  const key = `${TFR_MODULE_ID}.${TFRTranslationKey(text)}`;
  const i18n = globalThis.game?.i18n;
  if (i18n?.has?.(key, false)) return data ? i18n.format(key, data) : i18n.localize(key);
  if (!data) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in data ? String(data[name]) : match));
}

/** FNV-1a hash of the English text; must match tools/i18n-extract.cjs. */
function TFRTranslationKey(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `t${hash.toString(36)}`;
}
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


/**
 * Relic data in the world's language. data/relics.json is the canonical English source;
 * data/i18n/<lang>.json overlays translated text by relic id (see TFRApplyContentOverlay).
 */
async function TFRLoadRelics() {
  const relics = await TFRLoadCanonicalRelics();
  const overlay = await TFRContentOverlay();
  return overlay ? relics.map(relic => TFRApplyContentOverlay(relic, overlay[relic.id])) : relics;
}

/** Untranslated English relic data. */
async function TFRLoadCanonicalRelics() {
  const response = await fetch("modules/the-first-relics/data/relics.json");
  return response.json();
}

let TFR_CONTENT_OVERLAY_PROMISE = null;

/** Loads data/i18n/<lang>.json once per session; null for English or a missing file. */
function TFRContentOverlay() {
  const lang = globalThis.game?.i18n?.lang || "en";
  if (lang === "en") return Promise.resolve(null);
  TFR_CONTENT_OVERLAY_PROMISE ??= fetch(`modules/${TFR_MODULE_ID}/data/i18n/${lang}.json`)
    .then(response => (response.ok ? response.json() : null))
    .then(overlay => {
      if (overlay) TFRRegisterLocalizedIdentifiers(overlay);
      return overlay;
    })
    .catch(() => null);
  return TFR_CONTENT_OVERLAY_PROMISE;
}

/**
 * Replaces text in a relic with its translation. Only strings that already exist in the
 * English data are replaced; ids, numbers and other mechanics are never touched.
 * Arrays of objects with an `id` are translated by id, other arrays by index.
 * The overlay's `abilities` map (slot -> name) becomes `relic.abilityNames`.
 */
function TFRApplyContentOverlay(relic, overlay) {
  if (!overlay) return relic;
  const localized = TFRMergeTranslatedText(relic, overlay);
  if (overlay.abilities) localized.abilityNames = { ...overlay.abilities };
  return localized;
}

const TFR_FEY_STEP_NAMES = new Set(["fey step"]);

/**
 * A few Cloak of Fey Paths helpers recognise the item and its abilities by name
 * (legacy items without flags, dnd5e chat cards). Teach them the translated names too.
 */
function TFRRegisterLocalizedIdentifiers(overlay) {
  const cloak = overlay?.cloak_feywilds;
  if (!cloak) return;
  if (cloak.name) TFR_CLOAK_ITEM_NAMES.add(cloak.name);
  for (const [slot, name] of Object.entries(cloak.abilities || {})) {
    if (name) TFR_CLOAK_ABILITY_SLOTS_BY_LABEL[String(name).trim().toLowerCase()] = slot;
  }
  if (cloak.abilities?.active1) TFR_FEY_STEP_NAMES.add(String(cloak.abilities.active1).trim().toLowerCase());
}

function TFRMergeTranslatedText(base, translated) {
  if (translated === undefined || translated === null) return base;
  if (typeof base === "string") return typeof translated === "string" && translated ? translated : base;
  if (Array.isArray(base)) {
    if (Array.isArray(translated)) return base.map((value, index) => TFRMergeTranslatedText(value, translated[index]));
    if (typeof translated === "object") {
      return base.map(value => (value && typeof value === "object" && "id" in value)
        ? TFRMergeTranslatedText(value, translated[value.id])
        : value);
    }
    return base;
  }
  if (base && typeof base === "object" && typeof translated === "object") {
    const merged = { ...base };
    for (const [key, value] of Object.entries(translated)) {
      if (key in base && key !== "id") merged[key] = TFRMergeTranslatedText(base[key], value);
    }
    return merged;
  }
  return base;
}

