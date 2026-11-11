/**
 * Minimal Foundry globals so the module parts can be imported and their pure logic tested in
 * Node. Anything not set here is a permissive stub: any property, call or `new` returns
 * another stub. Tests replace what they need on `globalThis.game`, `ui` and `foundry`.
 */
import fs from "node:fs";

export const stub = (overrides = {}) => new Proxy(function () {}, {
  get: (_target, key) => (
    Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key]
      : key === Symbol.toPrimitive ? () => ""
        : key === "then" ? undefined
          : stub()
  ),
  set: (_target, key, value) => { overrides[key] = value; return true; },
  apply: () => stub(),
  construct: () => stub()
});

/** Names of the hooks registered so far (module load registers "ready"). */
export const registeredHooks = [];
/** Notifications raised through ui.notifications, as "info: text" / "warn: text". */
export const notifications = [];

const root = new URL("../", import.meta.url);

Object.assign(globalThis, {
  Hooks: { on: name => registeredHooks.push(name), once: name => registeredHooks.push(name) },
  game: stub({ i18n: { has: () => false }, user: { id: "user", isGM: true }, users: stub({ activeGM: { isSelf: true } }) }),
  foundry: stub({ utils: stub({ deepClone: value => structuredClone(value) }) }),
  ui: stub({
    notifications: {
      info: text => notifications.push(`info: ${text}`),
      warn: text => notifications.push(`warn: ${text}`),
      error: text => notifications.push(`error: ${text}`)
    }
  }),
  CONFIG: stub(), CONST: stub(), canvas: stub(), document: stub(), window: globalThis,
  // The module fetches its own files by Foundry URL; serve them from the repository.
  fetch: async url => {
    const file = new URL(String(url).replace(/^modules\/the-first-relics\//, ""), root);
    const ok = fs.existsSync(file);
    return { ok, json: async () => JSON.parse(fs.readFileSync(file, "utf8")) };
  }
});

export const relics = JSON.parse(fs.readFileSync(new URL("data/relics.json", root), "utf8"));
export const repoFileExists = path => fs.existsSync(new URL(path.replace(/^modules\/the-first-relics\//, ""), root));
