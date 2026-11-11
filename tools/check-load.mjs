/**
 * Loads the module entry point outside Foundry with stubbed globals.
 *
 *   node tools/check-load.mjs
 *
 * Fails if an import names something a part does not export, or if a part runs code at load
 * time that needs a part loaded after it. It does not run the module's functions; the tests
 * in tests/ do that for the pure logic (node --test "tests/*.test.mjs").
 */
import { registeredHooks } from "../tests/foundry-stub.mjs";

await import(new URL("../scripts/the-first-relics.js", import.meta.url));
if (!registeredHooks.includes("ready")) throw new Error("The ready hook was not registered.");
console.log(`Loaded. Hooks registered at load: ${[...new Set(registeredHooks)].join(", ")}.`);
