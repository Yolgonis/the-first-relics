/**
 * Loads the module entry point outside Foundry with stubbed globals.
 *
 *   node tools/check-load.mjs
 *
 * Fails if an import names something a part does not export, or if a part runs code at load
 * time that needs a part loaded after it. It does not run the module's functions.
 */
const stub = () => new Proxy(function () {}, {
  get: (_target, key) => (key === Symbol.toPrimitive ? () => "" : key === "then" ? undefined : stub()),
  apply: () => stub(),
  construct: () => stub()
});
const hooks = [];
Object.assign(globalThis, {
  Hooks: { on: name => hooks.push(name), once: name => hooks.push(name) },
  game: stub(), foundry: stub(), CONFIG: stub(), CONST: stub(), ui: stub(), canvas: stub(),
  document: stub(), window: globalThis
});
await import(new URL("../scripts/the-first-relics.js", import.meta.url));
if (!hooks.includes("ready")) throw new Error("The ready hook was not registered.");
console.log(`Loaded. Hooks registered at load: ${[...new Set(hooks)].join(", ")}.`);
