/**
 * Relic content translation (data/relics.json -> data/i18n/<lang>.json overlay).
 *
 *   node tools/i18n-content.cjs extract     list every translatable text as "path": "English"
 *                                            in tools/translations/content-en.json
 *   node tools/i18n-content.cjs build tr    build data/i18n/tr.json from tools/translations/content-tr.cjs
 *   node tools/i18n-content.cjs build tr --partial   allow missing strings (they stay English)
 *
 * Paths are stable: arrays of objects with an id use the id (dreams.silent_forest.text),
 * other arrays use the index (moodMap.0.mood). Only the fields below are translatable;
 * ids, numbers, icons and automation metadata never are.
 * Ability names come from TFRAbilityDefinitions() in the module script (path: <relic>.abilities.<slot>).
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const RELICS = path.join(root, "data", "relics.json");
const SCRIPT = path.join(root, "scripts", "the-first-relics.js");
const TRANSLATIONS = path.join(__dirname, "translations");

const TRANSLATABLE = [
  "name", "class", "virtue", "theme",
  "trueName.name", "trueName.title", "trueName.full",
  "personality.temperament.*", "personality.likes.*", "personality.dislikes.*",
  "personality.corePhrase", "personality.roleplayGuidance",
  "moodMap.*.mood", "moodMap.*.description",
  "affinity.moods.*",
  "stages.*.title",
  "affinityEvents.*.label", "affinityEvents.*.category",
  "hiddenRequirements.*.label",
  "features.passives.*", "features.actives.*", "features.avatar", "features.signature",
  "dreams.*.title", "dreams.*.text",
  "memories.*.title", "memories.*.text",
  "quotes.*.*",
  "signatureCeremony.title", "signatureCeremony.text.*",
  "lore.*"
];

function patternMatches(pattern, parts) {
  const p = pattern.split(".");
  return p.length === parts.length && p.every((seg, i) => seg === "*" || seg === parts[i]);
}

function collect(value, parts, out, relicId) {
  if (typeof value === "string") {
    if (value.trim() && TRANSLATABLE.some(pattern => patternMatches(pattern, parts))) {
      out[`${relicId}.${parts.join(".")}`] = value;
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const key = item && typeof item === "object" && "id" in item ? String(item.id) : String(index);
      collect(item, [...parts, key], out, relicId);
    });
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) collect(child, [...parts, key], out, relicId);
  }
}

function abilityNames() {
  const source = fs.readFileSync(SCRIPT, "utf8");
  const start = source.indexOf("function TFRAbilityDefinitions()");
  const body = source.slice(start, source.indexOf("\n}\n", start) + 2);
  const defs = Function(`${body}; return TFRAbilityDefinitions();`)();
  const out = {};
  for (const [relicId, slots] of Object.entries(defs)) {
    for (const [slot, def] of Object.entries(slots)) out[`${relicId}.abilities.${slot}`] = def.name;
  }
  return out;
}

function extract() {
  const relics = JSON.parse(fs.readFileSync(RELICS, "utf8"));
  const out = {};
  for (const relic of relics) {
    const strings = {};
    collect(relic, [], strings, relic.id);
    Object.assign(out, strings);
  }
  const abilities = abilityNames();
  for (const relic of relics) {
    for (const [key, value] of Object.entries(abilities)) if (key.startsWith(`${relic.id}.`)) out[key] = value;
  }
  return out;
}

const tagSignature = text => (String(text).match(/<\/?[a-z][^>]*>/gi) || []).map(tag => tag.replace(/\s.*?>/, ">").toLowerCase()).join("");

function setPath(target, parts, value) {
  let node = target;
  for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]] ??= {};
  node[parts[parts.length - 1]] = value;
}

function build(code) {
  const english = extract();
  const translated = require(path.join(TRANSLATIONS, `content-${code}.cjs`));
  const problems = [];
  const overlay = {};
  for (const [key, text] of Object.entries(translated)) {
    if (!(key in english)) { problems.push(`unknown path (obsolete?): ${key}`); continue; }
    if (typeof text !== "string" || !text.trim()) { problems.push(`empty translation: ${key}`); continue; }
    if (tagSignature(english[key]) !== tagSignature(text)) problems.push(`HTML tags differ: ${key}`);
    const [relicId, ...parts] = key.split(".");
    setPath(overlay, [relicId, ...parts], text);
  }
  const missing = Object.keys(english).filter(key => !(key in translated));
  if (!process.argv.includes("--partial")) for (const key of missing) problems.push(`missing: ${key}`);
  if (problems.length) {
    for (const problem of problems.slice(0, 60)) console.error(problem);
    if (problems.length > 60) console.error(`... and ${problems.length - 60} more`);
    console.error(`${Object.keys(english).length - missing.length}/${Object.keys(english).length} translated`);
    process.exit(1);
  }
  // Array-backed fields without ids are stored as index-keyed objects; convert them back to arrays
  // so TFRMergeTranslatedText merges them by position.
  const toArrays = node => {
    if (!node || typeof node !== "object") return node;
    const keys = Object.keys(node);
    if (keys.length && keys.every(k => /^\d+$/.test(k))) return keys.sort((a, b) => a - b).map(k => toArrays(node[k]));
    for (const k of keys) node[k] = toArrays(node[k]);
    return node;
  };
  const dir = path.join(root, "data", "i18n");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${code}.json`), `${JSON.stringify(toArrays(overlay), null, 2)}\n`, "utf8");
  console.log(`data/i18n/${code}.json: ${Object.keys(english).length - missing.length}/${Object.keys(english).length} strings translated.`);
}

const [command, code] = process.argv.slice(2);
if (command === "extract") {
  const strings = extract();
  fs.mkdirSync(TRANSLATIONS, { recursive: true });
  fs.writeFileSync(path.join(TRANSLATIONS, "content-en.json"), `${JSON.stringify(strings, null, 2)}\n`, "utf8");
  const perRelic = {};
  for (const key of Object.keys(strings)) perRelic[key.split(".")[0]] = (perRelic[key.split(".")[0]] || 0) + 1;
  console.log(`${Object.keys(strings).length} content strings`, perRelic);
} else if (command === "build" && code) {
  build(code);
} else {
  console.error("Usage: node tools/i18n-content.cjs extract | build <lang>");
  process.exit(1);
}
