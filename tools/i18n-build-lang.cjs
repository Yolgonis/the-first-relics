/**
 * Builds lang/<code>.json from tools/translations/<code>.cjs (translations keyed by English text).
 *
 *   node tools/i18n-extract.cjs          (first, to refresh lang/en.json)
 *   node tools/i18n-build-lang.cjs tr
 *
 * Fails if a translation is missing, refers to an English string that no longer exists,
 * or changes the {placeholders} of its English source.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const MODULE_ID = "the-first-relics";
const code = process.argv[2];
if (!code) throw new Error("Usage: node tools/i18n-build-lang.cjs <language code>");

function translationKey(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `t${hash.toString(36)}`;
}

const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(",");

const en = JSON.parse(fs.readFileSync(path.join(root, "lang", "en.json"), "utf8"))[MODULE_ID];
const translations = require(path.join(__dirname, "translations", `${code}.cjs`));

const problems = [];
const output = {};
const englishTexts = new Set(Object.values(en));
for (const [english, translated] of Object.entries(translations)) {
  if (!englishTexts.has(english)) { problems.push(`not in lang/en.json (obsolete?): ${english}`); continue; }
  if (placeholders(english) !== placeholders(translated)) problems.push(`placeholders differ: ${english}  ->  ${translated}`);
  output[translationKey(english)] = translated;
}
for (const [key, english] of Object.entries(en)) {
  if (!(key in output)) problems.push(`missing translation: ${english}`);
}

if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

const ordered = Object.fromEntries(Object.keys(en).map(key => [key, output[key]]));
fs.writeFileSync(path.join(root, "lang", `${code}.json`), `${JSON.stringify({ [MODULE_ID]: ordered }, null, 2)}\n`, "utf8");
console.log(`lang/${code}.json: ${Object.keys(ordered).length} strings.`);
