/**
 * Extracts every TFRT("…") string from scripts/the-first-relics.js.
 *
 *   node tools/i18n-extract.cjs          regenerate lang/en.json and report translation gaps
 *   node tools/i18n-extract.cjs --check  only report; exit 1 if any language is incomplete
 *
 * Keys are a hash of the English text (same algorithm as TFRTranslationKey in the module),
 * so editing an English string creates a new key and the old translation shows up as obsolete.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const MODULE_ID = "the-first-relics";
const SOURCE = path.join(root, "scripts", "the-first-relics.js");
const LANG_DIR = path.join(root, "lang");
const CHECK_ONLY = process.argv.includes("--check");

function translationKey(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `t${hash.toString(36)}`;
}

function extract() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const pattern = /TFRT\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g;
  const strings = new Map();
  const problems = [];
  for (const match of source.matchAll(pattern)) {
    const literal = match[1];
    const line = source.slice(0, match.index).split("\n").length;
    if (literal.startsWith("`") && literal.includes("${")) {
      problems.push(`line ${line}: template literal with \${} cannot be translated; use {placeholders}`);
      continue;
    }
    const text = Function(`"use strict"; return (${literal});`)();
    const key = translationKey(text);
    const existing = strings.get(key);
    if (existing !== undefined && existing !== text) problems.push(`line ${line}: hash collision for "${text}"`);
    strings.set(key, text);
  }
  const bare = [...source.matchAll(/(?<!function )TFRT\(\s*(?!["'`])/g)].map(m => source.slice(0, m.index).split("\n").length);
  for (const line of bare) problems.push(`line ${line}: TFRT() must be called with a string literal`);
  return { strings, problems };
}

function readLang(file) {
  const fullPath = path.join(LANG_DIR, file);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8"))[MODULE_ID] ?? {};
}

const { strings, problems } = extract();
for (const problem of problems) console.error(`ERROR ${problem}`);

if (!CHECK_ONLY) {
  fs.mkdirSync(LANG_DIR, { recursive: true });
  const en = { [MODULE_ID]: Object.fromEntries(strings) };
  fs.writeFileSync(path.join(LANG_DIR, "en.json"), `${JSON.stringify(en, null, 2)}\n`, "utf8");
}
console.log(`${strings.size} translatable strings.`);

let incomplete = false;
for (const file of fs.existsSync(LANG_DIR) ? fs.readdirSync(LANG_DIR) : []) {
  if (file === "en.json" || !file.endsWith(".json")) continue;
  const lang = readLang(file);
  const missing = [...strings.keys()].filter(key => !lang[key]);
  const obsolete = Object.keys(lang).filter(key => !strings.has(key));
  if (missing.length || obsolete.length) incomplete = true;
  console.log(`${file}: ${strings.size - missing.length}/${strings.size} translated, ${obsolete.length} obsolete`);
  for (const key of missing) console.log(`  missing ${key}: ${strings.get(key)}`);
  for (const key of obsolete) console.log(`  obsolete ${key}: ${lang[key]}`);
}

if (problems.length || (CHECK_ONLY && incomplete)) process.exit(1);
