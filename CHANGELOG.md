# Changelog

## v0.7.0

- Redesigned the Cloak of Fey Paths (Ranger) around Hunter's Mark. The old Hunter's Instinct, Path of the Wild, Predator's Patience and Nature's Pursuit are replaced.
  - Passives: Unbroken Mark (Hunter's Mark doesn't require concentration, automated), Shroud of Leaves (temporary hit points equal to Wisdom modifier + relic bonus when you cast or move Hunter's Mark, automated), Marked Quarry (the Hunter's Mark die grows a step, or adds the relic bonus from d10, automated on the Hunter's Mark damage roll) and Eternal Hunt (tracking, no invisibility, ignores half and three-quarters cover).
  - Actives: Arrow of the First Hunt works after any weapon hit and moves Hunter's Mark; Glamour Veil (reaction, disadvantage on the attack and a counterattack on a miss) replaces Nature's Pursuit; Briar Snare is used after a weapon hit instead of costing an action.
  - The avatar keeps Hunter's Mark on two creatures, doubles its damage dice (automated) and empowers the Primal Companion; the signature maximizes Hunter's Mark damage (automated) and grants an extra attack.
- The GM Control Panel's Cloak quick use now runs the Glamour Veil, avatar and signature through the shared relic runtime, so it applies the same effects as the item.

## v0.6.0

- Redesigned the Bands of the Inner Dragon (Monk) around grappling, Focus Points, survival and damage. The old features (Centered Mind, Perfect Motion, Body Beyond Limits, Flow State, Dragon Breath, Iron Soul, Hundred Forms) are replaced.
  - Passives: Dragon's Grip (grapple up to Huge, disadvantage on escape, no extra movement when moving a grappled creature), Breath Between Blows (regain 1 Focus Point when a creature fails a save against your Monk features or grapple/shove, relic bonus uses per short or long rest), Dragon Hide (hit point maximum + Monk level, automated) and Dragon's Fang (relic bonus force damage on hits, automated for all melee weapon attacks).
  - Actives: Dragon Seizes (reaction grapple), Still Breath (regain relic bonus + 1 Focus Points, automated), Coiled Scales (reaction, +5 AC until your next turn, automated) and Perfect Strike (no action, extra force damage equal to four Martial Arts dice).
  - Inner Dragon Manifest also lets you grapple two creatures, damages grappled creatures and restores 1 Focus Point at the start of each of your turns (automated in combat). Dragon Unbound restores all Focus Points, lowers Monk feature costs by 1 and gives resistance to all damage except psychic, immunity to grappled, restrained and stunned, and a 19–20 critical range.
- Relic damage abilities can roll a formula (such as `4@scale.monk.die`) instead of fixed dice.
- Fixed ability helpers that scale with the relic bonus (temporary hit points, Focus Points) using the Exalted bonus on Final Form relics instead of the Final Form bonus.
- Fixed hover never turning on for relic flight (avatars of the Bands, Girdle, Mantle, Cloaks, Chains and Blood of the First Dragon). With DAE active, an OVERRIDE "true" on a boolean field was evaluated to "1" and read as false; hover is now written in CUSTOM mode and applied by the module.
- Fixed relic abilities whose chat card badges match another ability (such as a bonus action on yourself next to the avatar) not running their helper; the ability is now read from the activity recorded on the card.

## v0.5.1

- The item sheet now says, under the attunement row, when the bearer lacks the relic's class, so players see it before they try to attune.
- Fixed relic item sheet adjustments on dnd5e 5 sheets: hiding the GM-only relic notes and the personality section, and trimming the mood history for players, were applied to the sheet's first field instead of the sheet and so did nothing.
- Relic data is fetched once per session instead of on every use.
- The Mantle of the First Seer, Girdle of the Unbroken and Chains of the Patron now show their automation summary in the Affinity Dashboard like the other relics.
- The relic id migration also covers relic items owned by unlinked tokens.
- Removed the unused `manacles-unbroken.svg` icon.

## v1.5.0

- Each relic's game definitions (damage type, abilities, automation notes, passive effects and triggers, ability effects, runtime behaviour) now live in one file per relic under `src/relics/`, instead of being spread over seven tables in four files. Behaviour is unchanged: the tables the code reads are built from these files and were compared against the previous ones.
- Added automated tests that run without Foundry (`node --test "tests/*.test.mjs"`): progression thresholds, relic data consistency, class-gated attunement and the relic id migration.

## v1.4.1

- "Requires attunement by a <class>" is now enforced. A player cannot attune a relic to a character that has no levels in the relic's class; the attempt is cancelled with a warning. A GM can still attune it to anyone and gets a notice that it was an override. Relics that are already attuned are left as they are.

## v1.4.0

- The module code is now loaded as separate ES modules from `src/` instead of one generated 9,900-line file. `scripts/the-first-relics.js` is a three-line entry point, each part states what it imports and exports, and console errors point at the part and line they come from. There is no build step any more. Behaviour is unchanged.
- Fixed `FirstRelics.useSelectedRelicAbility()`, which called a helper that did not exist and always failed. It now uses the selected token's actor, or the user's character.

## v1.3.4

- The Girdle of the Unbroken now uses the relic id `girdle_unbroken` instead of the leftover `manacles_unbroken`. On world load the active GM client moves the saved relic state, existing Girdle items (world and actor inventories, including their activities) and the lore journal page to the new id automatically. Macros that pass the old id to the API must use `girdle_unbroken`.

## v1.3.3

- An open character sheet now refreshes right after a relic stage sync (Save in the Affinity Dashboard), so the relic item in the inventory updates without closing and reopening the sheet. The refresh looked only at legacy windows and missed dnd5e 5 sheets, which are ApplicationV2 windows.

## v1.3.2

- Removed the separate Sync Item Stage button from the GM Affinity Dashboard. Save already writes the affinity and syncs the relic item stage, so one button is enough.

## v1.3.1

- The GM Affinity Dashboard no longer closes when you press Save or Sync Item Stage. It refreshes in place with the saved values, at the same position and size and on the same tab. Changing the relic keeps the window position too.

## v1.3.0

- Automated the parts of situational passives that need no GM judgment; the judgment calls stay with the GM: Hunter's Instinct (relic bonus to Perception and passive Perception; the tracking bonus to Survival stays manual) and Path of the Wild (ignores nonmagical difficult terrain) on Cloak of Fey Paths; Scholar's Insight (Arcana and History; Investigation stays manual) and Perfect Concentration (advantage on concentration saves for divination spells, otherwise the relic bonus) on Mantle of the First Seer; Will Before Wound (while a Rage effect is active, the first damage each round is reduced by the relic bonus) on Girdle of the Unbroken; Borrowed Power (relic bonus once per turn to warlock spell and Eldritch Blast damage; pact weapons stay manual) on Chains of the Patron; and Banner of Order on Crown of the Conqueror, where the GM picks the allies in a dialog when combat starts.
- Per-round and per-turn limits follow the combat the actor is in, not the scene the GM is viewing.
- Added `FirstRelics.passiveStatus(actor)` to show which relic passives are unlocked, active and used.
- Ally aura passives are automated when the Aura Effects module is active: Royal Presence (you and allies within 30 feet add the relic bonus to Wisdom saves) on Crown of the Conqueror, Gentle Light (allies within 30 feet have advantage on death saves) on Vestments of the First Saint, and Echo of Inspiration, Song of Courage and Melody of Unity on Lyre of the First Song. Melody of Unity adds each ally's own proficiency bonus. Auras apply when a token enters range, as Aura Effects does for every aura. Without Aura Effects these passives stay GM-resolved.
- Event-triggered passive features are now automated: Dawn's Endurance (AC bonus during the first round of combat) and First Light (drop to 1 hit point instead of 0, once per long rest) on Aegis of the Dawn; Unseen Hunter on Cloak of the Umbral Veil (advantage and +2d8 necrotic on the first attack of each combat, with Midi-QOL and DAE); Living Sap (temporary hit points after a long rest), Nature's Blessing (extra healing received from chat-card healing) and Endless Spring (an ally within 30 feet drops to 1 hit point instead of 0, once per long rest) on Heart of Yggdrasil; Saint's Grace (proficiency bonus added to healing rolls) on Vestments of the First Saint; the temporary hit points of Living Chronicle on Mantle of the First Seer; and Price Paid (temporary hit points after reducing a hostile creature to 0 hit points with damage applied from a chat card) on Chains of the Patron. Once-per-long-rest uses are tracked on the relic item and reset by a long rest. Item descriptions mark which passives are automated and under which conditions.
- Always-on passive features are now automated as Active Effects on the relic item, unlocked by stage like the description (Dormant 2, Awakened 3, Exalted 4) and suppressed with the relic bonus when the relic is not attuned or refuses attunement: Blood of the First Dragon (hit point maximum +1 per level, +1 AC, advantage on Strength and Constitution saves, fire and cold resistance and frightened immunity), Bands of the Inner Dragon (advantage on concentration saves, +10 ft speed; jump distance stays GM-resolved), and Heart of Yggdrasil (poisoned and disease immunity). Automated passives are marked in the item description. Existing relic items receive the effects on load (`FirstRelics.syncPassiveEffects()`).
- Rewrote the templated content of eight relics (Aegis of the Dawn, Crown of the Conqueror, Bands of the Inner Dragon, Cloak of the Umbral Veil, Heart of Yggdrasil, Vestments of the First Saint, Blood of the First Dragon, Lyre of the First Song). Each now has its own personality, mood names, dreams, memories, quotes, origin, and true-name ceremony instead of a shared template such as "A vision of ... reaches the bearer" and "Good." / "No.". Dream and memory ids, stages, and affinity thresholds are unchanged.
- Rewrote the passive feature texts of the same eight relics as full rules sentences (for example "Dawn's Endurance: first round +relic bonus AC." became a complete description). Passives are descriptive and GM-resolved, as before; a few gaps were filled: Guardian's Burden and Commander's Resolve use your reaction, Banner of Order grants proficiency bonus + relic bonus temporary hit points, Living Sap grants temporary hit points (a long rest already restores all hit points), and per-combat or per-long-rest limits are stated explicitly.
- Fixed the hidden requirement label "Reach 1000 Resonance" to "Reach 1000 Affinity" on eight relics.
- Turkish localization is paused: the module ships in English only. The language infrastructure stays in place (interface strings, content overlays, the content language setting, which is hidden while only English ships).
- Added Turkish relic content: names, true names, features, ability names, lore, dreams, memories, mood maps, affinity events, hidden requirements, quotes, and the signature ceremony for all twelve relics (1427 strings). Content is loaded from `data/i18n/<lang>.json` as an overlay on the English data; ids, numbers, and automation data never change.
- Chat cards from the save resolver, ability helpers, and the Cloak of the Feywilds helpers (Briar Snare, Arrow / Marked by the First Hunt, Nature's Pursuit, Avatar of the First Hunt, Blessing of Sylvara) and the relic journal intro are now translated (394 interface strings).
- Activity detection, the Cloak chooser lock, and Fey Step handling also recognize localized ability names.
- Fixed: the Cloak-only "Use Notes" line was shown on all twelve relic descriptions.
- Fixed: in non-English worlds the Final Form audit and Final Form sync looked for the English text "15 charges" in item descriptions, so the release check failed and Final Form items were never treated as up to date.
- Added the world setting **Relic content language**. Relic items, descriptions, activities, effects, and the lore journal are written in this language whichever GM writes them; previously each GM's interface language was used, so a GM with an English client rewrote Turkish item descriptions in English on load and left the item names in Turkish. The setting is chosen on first load from the existing relic items.
- Fixed: the lore journal matched pages by name, so loading the world in another language added a second set of relic pages. Pages are now matched by relic id (or any known relic name for older pages), renamed in place, and duplicate generated pages are removed.
- Fixed: running Restore After Test Lab (or any stage sync) while the startup repairs were still running could rebuild the same relic copy twice and leave a duplicate item, and the startup Final Form sync could overwrite the restored relic state. Batch operations now wait for the startup repairs, rebuilds of one relic run one at a time, and an item already replaced by another rebuild is skipped.
- Fixed: the release check's dnd5e test read the old `systems` manifest field instead of `relationships.systems`.
- Development: the source now lives in 26 files under `src/` and is bundled into `scripts/the-first-relics.js` by `tools/build.cjs`. The shipped script is the same code plus comment markers.

## v1.2.0

- Added interface localization with English and Turkish language files. The GM Affinity Dashboard, GM Control Panel, status labels, and 180+ notifications now follow Foundry's language setting (290 strings).
- English source text stays in the code; `lang/en.json` is generated from it, so new strings cannot be forgotten. Relic content (names, powers, lore, chat cards) remains English for now.
- Two notifications that were written in Turkish in the source are now English in the source with Turkish translations.

## v1.1.10

- The GM Affinity Dashboard no longer overflows horizontally inside its window. An old minimum width written for the v1 dialog (760 px) was wider than the DialogV2 content area, which cut off right-aligned text and added a horizontal scrollbar.

## v1.1.9

- Fixed the GM Control Panel layout under DialogV2: its markup was a nested `<form>`, which the browser discarded inside the dialog's own form, dropping the panel's styling. Control buttons now also grow to fit their icon, label and hint instead of using Foundry v13's fixed button height.
- The GM Affinity Dashboard and Control Panel now scroll inside a fixed-height window with the Save / Sync / Close buttons pinned to the bottom.
- Run Diagnostics now compares each relic copy against the activity count for its own stage. Previously every Dormant or Awakened copy was reported as an issue because it was compared against the Exalted count.
- The scene-control button uses v13 `onChange` instead of the deprecated `onClick`.
- The standalone Control Panel opener is GM-only, like the dashboard.

## v1.1.8

- Moved the GM Affinity Dashboard and GM Control Panel from the deprecated v1 `Dialog` to Foundry v13 `DialogV2`, and replaced their jQuery wiring with plain DOM listeners. Behavior and layout are unchanged.
- Replaced the deprecated `FormApplication` settings-menu shim with an `ApplicationV2` shim that opens the dashboard.
- Cloak of Fey Paths locked-activity guards now also hook dnd5e 5's `ActivityChoiceDialog`, which replaced the old activity chooser; previously the guard only ran on legacy `Dialog` choosers.

## v1.1.7

- Resized all 60 painted relic PNGs (12 item icons and 48 stage illustrations) from 1254 px to 512 px, reducing the art folder from about 150 MB to about 27 MB. File names and paths are unchanged, so existing world and actor items keep their icons.

## v1.1.6

- Increased the 1000-Affinity Final Form Universal Relic Bonus from `+4` to `+5` for all twelve relics.
- Increased Final Form maximum charges from `10` to `15`; 750–999 Affinity remains Exalted at `+3` and `10` charges.
- Extended automatic Final Form migration, rebuild validation, Playtest Lab checks, and release audits to verify both the `+5` bonus and `15`-charge capacity.
- Expanded the GM lore journal with the full progression, attunement-refusal context, each relic's origin, rumor, hidden sorrow, and all four manifestations including Final Form; existing generated lore journals now refresh automatically on startup.
- Added stage-gated player manifestations to relic item descriptions: Dormant at acquisition, Awakened at 300, Exalted at 750, and Final Form at 1000 Affinity. GM-only origin and hidden sorrow remain excluded, and existing generated item descriptions refresh automatically.

## v1.1.5

- Added Final Form at exactly 1000 Affinity for all twelve relics.
- Increased every Universal Relic Bonus from Exalted `+3` to Final Form `+4`, covering AC, saving throws, spell save DC, spell attacks, weapon attacks, and weapon damage.
- Kept the 750–999 Exalted tier at `+3`; the new bonus cannot unlock early.
- Added automatic migration for existing 1000-Affinity item copies and a Final Form +4 release audit.

## v1.1.4

- Made Playtest Lab capture the exact campaign relic state before switching test actors to Exalted / 1000 Affinity.
- Made Clean Test Lab restore that snapshot instead of resetting every campaign relic to Dormant / 0.
- Resynchronized real world and actor relic copies to their restored stages after Playtest Lab cleanup.
- Forced each new lab run to refresh its backup so an interrupted older test cannot restore stale world data.

## v1.1.3

- Changed stage and inventory rebuilds to create and validate a replacement before deleting the original item.
- Added rollback protection when replacement validation or original-item deletion fails, preventing rebuild-related item loss.
- Expanded Stage Sync Safety and Release Check to reject unsafe rebuild ordering, invalid activity ids, missing activities, and premature true-name disclosure.
- Made relic-copy discovery use stable relic flags as well as display names, preserving stage sync after user-facing item renames.
- Restored the documented `.itchignore` packaging file.

## v1.1.2

- Sealed every relic's true name in generated item descriptions until its Signature unlock reaches 1000 Affinity.
- Reworded pre-1000 mood descriptions that exposed eleven relic true names as early as 300 Affinity.
- Added a safe, non-destructive ready-time repair that updates only leaked descriptions on existing world and actor item copies.
- Added a true-name sealing audit for all Dormant, Awakened, and Exalted pre-Signature descriptions.

## v1.1.1

- Refusing relics now suppress their passive Active Effect bonuses in addition to blocking attunement.
- Blocked all dnd5e Activity, GM Dashboard quick-action, chat-card helper, macro-helper, and Fey Step use while a relic refuses attunement.
- Refusing relics are normalized to an unattuned, attunement-required state across existing copies, new copies, and stage rebuilds; allowing attunement restores the stage's normal rule.

## v1.1.0

- Added a per-relic, GM-only **Relic Refuses Attunement** toggle to the Relics GM Dashboard.
- Refusing relics immediately clear existing attunement and reject all standard `system.attuned: true` updates, including inventory context-menu and macro attempts.
- Protected attunement consent from non-GM changes and normalized refusing relics when copied or created.
- Preserved the refusal flag and unattuned state across stage rebuilds.
- Added `FirstRelics.setRelicAttunementRefusal()`, `FirstRelics.setAttunementRefusal()`, `FirstRelics.refuseAttunement()`, and `FirstRelics.allowAttunement()` macro helpers.

## v1.0.1

- Renamed `Cloak of Verdant Paths` to `Cloak of Fey Paths` to avoid a player-name conflict.
- Preserved the internal `cloak_feywilds` id and legacy name matching for existing worlds.
- Added a safe ready-time rename for existing world and actor item copies that still use either former public name.

## v1.0.0

- Promoted the module from release candidate to stable release.
- Updated manifest, README, changelog, dashboard copy, and console banner to the shared `1.0.0` version.
- Renamed the dashboard action copy to Release Check and changed successful readiness output to `RELEASE READY`.
- Added `await FirstRelics.runReleaseCheck()` while keeping `await FirstRelics.runReleaseCandidateCheck()` as a compatibility alias.
- Added a new AI-assisted `art/icons/v1/` item icon set for all 12 relics and pointed relic data at the new assets.
- Prepared the public Patreon/itch.io package surface with buyer-facing README content, license terms, `.itchignore`, stable relic metadata, and updated icon source notes.
- Renamed public relic display names from `Cloak of Feywilds` to `Cloak of Verdant Paths` and from `Cloak of Shadowfell` to `Cloak of the Umbral Veil`; internal IDs and legacy item-name fallbacks are preserved for existing worlds.

## v0.25.0

- Promoted the module to release candidate status.
- Added Release Candidate Check to verify Playtest Health, manifest version, Foundry compatibility metadata, dnd5e system declaration, module entrypoints, README/CHANGELOG version text, and public API exports.
- Exposed the check as `await FirstRelics.runReleaseCandidateCheck()` and added it to the GM dashboard Audits section.
- Switched the console load banner to use the shared module version constant.

## v0.24.2

- Added an in-dashboard QA result panel to the GM Control Panel so audit actions show readiness status and issue counts without relying only on console tables.
- Control Panel actions now summarize returned audit data, including activities, relics, checks, native/module/manual counts, cleaned relics, and issues.
- Playtest Health Check now includes Relic Cleanup Audit, so dashboard readiness covers diagnostics, QA matrix, runtime coverage, relic text cleanup, and Exalted Test Lab state.

## v0.24.1

- Cleaned up the eight newer relics with relic-specific roleplay guidance, mood text, active power descriptions, avatar text, signature text, and lore.
- Removed generic placeholder language such as quiet relic appearances, unknown-origin rumors, generic First Age sorrow, short `BA` active summaries, and new-relic playtest notes.
- Marked relic cleanup coverage in each relic checklist.
- Added `await FirstRelics.auditRelicCleanup()` and a GM dashboard Relic Cleanup Audit button to catch future placeholder regressions.

## v0.24.0

- Added Playtest Health Check to run diagnostics, 12 Relic QA Matrix, Runtime Coverage Audit, and Exalted Test Lab audit from one dashboard action.
- Exposed the combined check as `await FirstRelics.runPlaytestHealthCheck()`.
- Tightened Test Lab audit expectations so Exalted / 1000 affinity lab relics must have Signature unlocked and all six generated activities.
- Added a README playtest checklist for rebuild, lab creation, combined audit, and selected relic quick action verification.

## v0.23.19

- Added Runtime Coverage Audit for all 72 generated relic powers.
- The audit compares ability definitions, generated dnd5e activity data, automation metadata, and runtime helper specs.
- It reports activation, target, range, charge, save, damage, healing, coverage kind, runtime note, and per-row issues.
- Exposed the audit as `await FirstRelics.auditRuntimeCoverage()` and added it to the GM dashboard Audits section.

## v0.23.18

- Polished ability helper chat cards so manual-only powers show a clear `Manual Reminder` status instead of a generic helper message.
- Added escaped, structured helper card content for module helper, save resolver, and manual reminder outcomes.
- QA Matrix rows now include `coverageKind` and `manualNote` so manual reminders can be filtered separately from native, module, and silent metadata coverage.

## v0.23.17

- Added explicit helper reminder chat cards for manual-only relic powers such as Moment of Clarity, Threads of Fate, Refuse the Fall, Hold the World, Patron's Glance, Pay the Difference, Rally, March of Kings, Iron Soul, and Verdant Bloom.
- QA Matrix now separates `manualReminder` from truly silent `manualOnly` coverage.

## v0.23.16

- Fixed the relic item description stage bar so the current stage is checked too.
- Exalted relics now show Dormant, Awakened, and Exalted as checked in the item UI.

## v0.23.15

- Fixed Test Lab actor relic preparation so cloned actor items always rebuild activities and item effects from the requested stage/signature state.
- Exalted / 1000 affinity Playtest Lab actors should now show all six relic powers instead of only dormant active1/active2 powers.

## v0.23.14

- Detailed Activity Audit now reports current item stage/signature coverage before listing individual activities.
- Added expected vs actual activity counts per relic item so dormant world items, exalted test items, and full QA Matrix coverage are easier to distinguish.

## v0.23.13

- Refined QA Matrix runtime coverage labels so native damage, native healing, and native save activities are reported as native coverage instead of manual-only metadata.
- Added summary counts for native-covered, module-covered, and manual-only powers.

## v0.23.12

- Added a 12 Relic QA Matrix audit to the GM dashboard Audits section.
- The QA matrix checks all 72 generated powers at Exalted / Signature-ready state and reports activity type, target, range, save, damage, healing, effect references, and runtime coverage.
- Exposed the audit as `await FirstRelics.auditRelicQAMatrix()`.

## v0.23.11

- Centered the icon, title, and detail text inside GM dashboard Control Panel action cards.
- Kept the World Setup, Test Lab, Audits, and Selected Relic groups on the streamlined dashboard layout.

## v0.23.10

- Removed Cloak Shortcuts and Legacy Template Tools from the GM dashboard Control Panel.
- Rebuilt Control Panel around four sections: World Setup, Test Lab, Audits, and Selected Relic.
- Added dashboard layout cleanup for tab alignment, summary cards, affinity delta buttons, panel spacing, and control button grids.
- Preserved legacy/template functions as console helpers; they are just no longer shown in the dashboard.

## v0.23.9

- Removed Dreams, Memories, Chronicle, and Progression sections from the GM Affinity Dashboard UI.
- Preserved dream, memory, and progression console helpers for non-dashboard use.
- Added Control Panel V2 with clearer action groups and more descriptive button labels.
- Added Control Panel actions for creating missing world items, rebuilding existing relic copies, native activity audit, detailed activity audit, inventory sync audit, and stage sync safety audit.
- Guarded dashboard save logic so hidden requirements are not cleared when the Progression UI is absent.

## v0.23.8

- Updated native audit coverage to derive expectations from the full 12-relic activity definitions.
- Added native item-card marker effect support for Arrow of the First Hunt.
- Fixed mixed damage/teleport activities such as One Step Behind so they keep creature targeting for the damage roll while retaining teleport metadata.
- Tightened native audit checks for healing, empty save damage containers, and item-level effect references.

## v0.23.7

- Reworked relic activity effects to use the native dnd5e item/activity model.
- Item-level ActiveEffects are now generated with stable IDs, and activities reference those IDs through `activity.effects`.
- Save-based condition effects are attached with `onSave: false`, so the native save activity treats them as failed-save effects instead of always-on effects.
- Suppressed the extra module resolver/helper card when a dnd5e chat card already contains the native effect tray.
- Expanded the native audit to verify that every activity effect reference exists on the item.
- Existing world/actor relic item copies should be rebuilt once with `await FirstRelics.syncAllInventoryStages()`.

## v0.23.6

- Updated module manifest, README, and console load banner to v0.23.6.
- Preserved v0.23.5 no sheet pop-up safeguards.
- Preserved v0.23.4 safe Foundry-style save resolver behavior.

## v0.23.5

- Fixed Test Lab / generated actor creation opening character sheets on the main screen.
- Fixed relic stage rebuild refresh logic so it only refreshes actor/item sheets that are already open.
- Added `renderSheet: false` / `render: false` safeguards to Test Lab actor/item creation and relic rebuild paths.
- Preserved v0.23.4 safe Foundry-style save resolver behavior.

# v0.23.4

- Disabled automatic failed-save condition application from guessed Midi-QOL workflow data.
- Save-based conditions now require the GM resolver button after the normal save roll is visible.
- Updated resolver card copy to make the order clearer: roll save first, target failed creatures, then apply.
- Preserved v0.23.x save resolver, Briar Snare rename, stage gates, quick actions, and broad effect automation.

# v0.23.3

- Added native-like delayed save resolver behavior.
- Save-based conditions now wait for the normal dnd5e/Midi save result before applying.
- Failed saves receive the configured condition automatically when the workflow result is readable.
- If the workflow result cannot be read, a manual GM resolver card appears as a fallback.
- This keeps the safety of v0.23.2 while reducing manual clicks when Foundry/Midi exposes reliable save data.

# v0.23.2

## Fixed

- Disabled automatic save-condition application from Midi-QOL workflow hooks.
- Save-based relic abilities now require GM confirmation from the resolver card before applying conditions.
- Updated resolver card wording so it is clear that the GM should wait for save results, target failed creatures, then apply the condition.
- Prevents Draconic Roar, Briar Snare, Chain of Binding, Verse of Silence, and The First Song from applying their conditions before save success/failure is known.

## Notes

- The tooltip error shown while hovering dnd5e roll/chat UI appears to come from Foundry/dnd5e tooltip handling, not The First Relics. This version focuses on the incorrect auto-condition behavior.

# v0.23.1

- Fixed startup-blocking `Identifier 'TFREscapeHtml' has already been declared` syntax error.
- Consolidated HTML escaping into a single helper.
- No gameplay changes from v0.23.0; Manual Save Resolver and Briar Snare rename are retained.

# v0.23.0

- Renamed Cloak of Verdant Paths ability **Verdant Snare** to **Briar Snare** to avoid a player-name conflict.
- Save-based condition helpers no longer apply conditions immediately by default.
- Added a manual save resolver chat card with **Apply to Targeted** and **No Effect / Clear** buttons.
- Midi-QOL failed-save reading is still supported; if it succeeds, the condition is applied only to failed save targets.
- If Midi-QOL cannot expose failed saves, the pending resolver remains active so the GM can target failed creatures and apply the condition manually.
- Affected examples: Briar Snare, Chain of Binding, Draconic Roar, Verse of Silence, The First Song.

# Changelog

## v0.22.9

- Added save-aware condition automation foundation for sheet/chat-card relic uses.
- Added pending save helper queue and Midi-QOL workflow listeners.
- Failed save targets can now receive conditions automatically when workflow data is readable.
- If save results are not readable, the helper posts a manual-resolution reminder instead of applying a possibly wrong condition.
- Expanded `FirstRelics.auditAllRelicEffects()` with save and save-aware columns.
- Added `FirstRelics.auditSaveAwarePending()` for debugging queued save helpers.

## v0.22.8

### Fixed
- Quieted harmless stale ActiveEffect cleanup races such as `ActiveEffect ... does not exist` when Foundry/DAE/dnd5e already removed a timed effect before The First Relics cleanup hook ran.
- Reworked timed-effect expiry to re-resolve the actor/effect before deleting, then skip missing effects silently.
- Routed helper effect replacement and condition cleanup through a safe delete helper.

### Added
- Added **Selected Relic Quick Actions** to the GM Dashboard Control Panel.
- Added generic buttons for Active 1, Active 2, Active 3, Active 4, Avatar, and Signature on the relic selected in the dashboard dropdown.
- Added `FirstRelics.useSelectedRelicAbility(relicId, slot, options)` for direct testing.
- Added an **Audit All Relic Effects** Control Panel button.

### Notes
- Dashboard selected-relic quick actions enforce the same stage locks and charge spending as normal item use.
- Targeted helper abilities still need a targeted token. Save-success cleanup remains GM-resolved for now.

## v0.22.7

### Fixed
- Fixed Umbral Veil **Fade Away** applying Invisible without a reliable expiry.
- Timed relic conditions now create explicit Active Effects with duration metadata instead of using native indefinite `toggleStatusEffect` entries.
- Added a small combat-turn expiry hook: Fade Away cleans itself up when combat advances from the turn on which it was applied.
- Added `startTime`, combat id, start round, and start turn metadata to timed condition helpers.

## v0.22.6

### Fixed
- Fixed Cloak of the Umbral Veil activity cards not triggering runtime helpers when dnd5e rendered compact cards without the activity name.
- Added badge-based activity inference for relic chat cards, e.g. REACTION + SELF => Fade Away and BONUS ACTION + 30 FT + SPACE => Shadow Step.
- Fixed self-condition helpers so they apply to the relic bearer even when another token is currently targeted.
- Added actor fallback resolution for item chat cards with missing speaker actor data.

### Added
- Added `FirstRelics.shadowStep()` and `FirstRelics.fadeAway()` console helpers for direct Umbral Veil testing.


## v0.22.5

### Added
- Added broad runtime helpers for supported effects across all 12 relics.
- Added generic chat-card automation for non-Cloak relic activities.
- Added status helpers for restrained, frightened, blinded, invisible, silenced, charmed, prone, and cleanup effects where applicable.
- Added self/target Active Effect helpers for movement, AC, damage bonuses, resistances, flight, hover, truesight-style senses, temp HP, and reminder flags where safe.
- Added Umbral Veil teleport helper support for Shadow Step and One Step Behind.
- Added `FirstRelics.useRelicAbility(actorOrId, relicId, slot, options)` and `FirstRelics.auditAllRelicEffects()`.

### Notes
- Save success/failure is not yet read directly from Midi-QOL workflows. When a target succeeds a save, remove the helper condition manually.
- Complex aura, resurrection, forced reroll, area darkness, and multi-ally effects still require GM resolution.


## v0.22.4

- Added post-rebuild actor/item sheet refresh to reduce stale character-sheet activity lists after affinity stage changes.
- Rebuilt embedded relic items now try to reuse the previous embedded item id before falling back to a fresh id.
- Added `FirstRelics.refreshActorAndItemSheets`, `FirstRelics.applyVerdantSnare`, and `FirstRelics.applyRestrainedCondition`.
- Added chat-card automation for Cloak helper abilities beyond Fey Step. Sheet uses now call the same helper path as Control Panel uses without double-spending charges.
- Updated Verdant Snare from a text-only reminder into a real Restrained helper on the currently targeted creature. Remove the condition manually if the target succeeds its save.
- Renamed the Control Panel button from “Verdant Snare Note” to “Verdant Snare”.

# Changelog

## v0.22.3

- Fixes affinity-stage upgrades failing with `Cannot read properties of undefined (reading 'cachedSpell')`.
- Rebuilds relic item documents with clean dnd5e activity data during stage sync instead of mutating stale activity collections in place.
- Avoids `setFlag` pre-updates on stale relic items before rebuild, because even flag-only updates can trigger dnd5e activity preparation errors.
- Preserves equipped/attuned state, quantity, weight, sort order, ownership, and spent charges where possible during rebuild.
- Keeps the v0.22.2 hard stage gate behavior: Dormant only exposes active1/active2; Awakened, Exalted, and Signature powers unlock at their proper thresholds.


## v0.22.1

- Fixed stage gating for relic activities. Dormant relics now only expose their Dormant powers in the dnd5e activity picker.
- Awakened powers unlock at Awakened stage; Avatar unlocks at Exalted stage.
- Signature abilities now require the Signature unlock / 1000 affinity instead of appearing merely because the relic is Exalted.
- Cloak Quick Actions now enforce the same stage locks before spending charges or creating chat/effects.
- Added clearer Control Panel note for locked stage abilities.

v0.21.8

- Fixed Fey Step movement appearing as a normal walking animation.
- Added `TFRMoveTokenAsTeleport()` to update token position with zero-duration/no-animation options.
- Fey Step now fully hides the token during the position update, then fades it back in at the destination.

# Changelog

## v0.21.7

### Added
- Added Fey Step chat-card automation: using Cloak of Verdant Paths / Fey Step from the actor sheet now asks the GM for a destination with the 60 ft range picker and moves the source/selected token.

### Fixed
- Avoids double-spending charges when the dnd5e item card already consumed the relic resource.
- Playtest Lab actor relics are now cloned as equipped/attuned so dnd5e chat cards do not show misleading NOT EQUIPPED warnings during tests.
- Updated the console load message to v0.21.7.

### Notes
- GM Dashboard > Control Panel > Fey Step remains the most direct fallback path.
- Actor-sheet item use now bridges into the same teleport automation after the dnd5e card is created.

## v0.21.6

### Fixed
- Fixed GM Dashboard / Control Panel **Create Playtest Lab** and reset flows failing with `ReferenceError: TFRCreateAll is not defined`.
- Added a shared internal `TFRCreateAll()` wrapper and routed `FirstRelics.createAll()` through it.

### Notes
- This is a hotfix on top of v0.21.5.
- Dashboard Control Panel and Fey Step range picker changes are preserved.

## v0.21.5

### Added
- Added a **Control Panel** tab back into the GM Affinity Dashboard.
- Control Panel buttons can now run from the dashboard without using F12.

### Fixed
- Fey Step now uses the visible range picker instead of the plain canvas picker.
- Fey Step shows the configured range ring before destination selection.
- Fey Step now plays the simple fade teleport visual around token movement.
- Range ring drawing now supports both legacy PIXI Graphics and newer PIXI Graphics APIs.

### Notes
- Open the dashboard from the scene toolbar gem button or with `await FirstRelics.openDashboard()`.
- Select the **Control Panel** tab, select a Cloak of Verdant Paths token, then click **Fey Step**.

## v0.21.4

### Fixed
- Fixed `Unexpected token ')'` module load failure.
- Removed risky dashboard embed fragment.

### Notes
- Use the standalone GM Control Panel for now:
```js
await FirstRelics.openControlPanel()
```
- Dashboard embedding will be reintroduced later with a cleaner refactor.

## v0.21.3

### Fixed
- Fixed duplicate `TFRSelectedToken` declaration breaking module load.
- Deduplicated Fey Step helper functions.

### Added
- GM Control Panel is now embedded inside the GM Dashboard.
- F12 is no longer needed for normal testing controls.

### Test
- Open GM Dashboard.
- Use the embedded GM Control Panel.
- Select a Cloak token and click Fey Step.

## v0.21.2

### Fixed
- Fey Step now has a reliable fallback automation path.
- Adds visible 60 ft range circle.
- Adds click-to-target teleport.
- Adds simple fade teleport animation.
- Moves the token directly.
- Consumes Cloak of Verdant Paths relic charge.
- Logs timeline.

### Notes
- Foundry/dnd5e Misty Step template alone does not guarantee token teleport in all module setups.
- This fallback makes Fey Step usable regardless of Automated Animations or Midi-QOL behavior.

## v0.21.1

### Fixed
- `deleteAll()` now removes actor-embedded generated feature items:
  - spellbook feature items
  - resolved template items
  - item-template feature clones
- Fixes generated `Fey Step` remaining on actors after cleanup.

### Added
```js
await FirstRelics.deleteFeatureItems()
await FirstRelics.auditGeneratedFeatureItems()
```

### Notes
- Use `deleteFeatureItems()` to remove generated spellbook/feature/template items without deleting relic/world data.

## v0.21.0

### Added
- Added Spellbook Feature Architecture.
- Added real dnd5e spell item generation from official templates.
- First spellbook feature:
  - Misty Step → Fey Step
- Added commands:
```js
await FirstRelics.createSpellbookFeatures()
await FirstRelics.auditSpellbookFeatures()
```
- Added control panel buttons:
  - Create Spellbook Features
  - Audit Spellbook Features

### Changed
- Preferred path is now actor spellbook feature items instead of relic-embedded activities.

## v0.20.0

### Added
- Added Template Resolver Architecture.
- Added resolver commands:
```js
await FirstRelics.resolveTemplate("Misty Step")
await FirstRelics.createResolvedTemplateItems()
await FirstRelics.auditResolvedTemplateItems()
```
- Added control panel buttons:
  - Create Resolved Templates
  - Audit Resolved Templates

### Changed
- New approach preserves original system template identity for automation modules.
- Fey Step now resolves from Misty Step while preserving `sourceName: "Misty Step"` metadata.

### Notes
- This is the start of the resolver architecture.
- The old feature item clone system remains for comparison but is no longer the preferred path.

## v0.19.0

### Added
- Started Item Template Architecture.
- Added complete system item cloning for relic feature items.
- First feature item:
  - Misty Step → Fey Step
- Added commands:
```js
await FirstRelics.createFeatureItems()
await FirstRelics.auditFeatureItems()
```
- Added GM Control Panel buttons:
  - Create Feature Items
  - Audit Feature Items

### Changed
- New architecture focuses on cloning whole Foundry/dnd5e items instead of cloning only activities.
- This should allow Midi-QOL, Automated Animations, Sequencer, and other modules to see real item usage.

### Notes
- v0.19.0 only creates Fey Step as a separate feature item.
- Existing relic item activities are preserved for now.

## v0.18.0

### Added
- Added System Template Clone Engine.
- Added first system-template clone:
  - Misty Step → Fey Step
- Added commands:
```js
await FirstRelics.applySystemTemplates()
await FirstRelics.auditSystemTemplates()
```
- Added GM Control Panel buttons:
  - Apply System Templates
  - Audit System Templates

### Changed
- Direction changed from custom fake automation to cloning Foundry/dnd5e system behavior where possible.

### Notes
- v0.18.0 starts with Fey Step only.
- Future passes will map damage, save, heal, reaction, and buff abilities to system templates.

## v0.17.9

### Fixed
- Restored missing `TFRPickCanvasPoint`.
- Fixed GM Control Panel `Fey Step` button failing with:

```text
ReferenceError: TFRPickCanvasPoint is not defined
```

### Test
1. Open the control panel.
2. Select a token with Cloak of Verdant Paths.
3. Click `Fey Step`.
4. Click a destination within 60 ft.

## v0.17.8

### Fixed
- Fixed module load failure caused by a broken duplicate Fey Step function fragment.
- Restored `FirstRelics` initialization.

### Test
```js
await FirstRelics.openControlPanel()
```


## v0.17.7

### Fixed
- Fixed v0.17.6 module load failure caused by a dashboard patch syntax error.

### Added
- Added safe standalone GM Control Panel:

```js
await FirstRelics.openControlPanel()
```

### Notes
- This version does not patch the existing dashboard markup.
- The control panel is standalone to avoid breaking module initialization.


## v0.17.5

### Fixed
- Template audit passing no longer implies teleport behavior.
- Fey Step now has a real click-to-teleport automation helper.

### Added
- `FirstRelics.feyStep()` opens a canvas click picker.
- Esc cancels the teleport.
- Range, charge, token movement, and timeline logging are handled.

### Usage
```js
await FirstRelics.feyStep()
```


## v0.17.4

### Added
- Added Activity Template Engine.
- Added template families:
  - Teleport
  - Damage
  - Save
  - Heal
  - Buff
  - Utility
- Added template metadata flags to generated activities.
- Added command:

```js
await FirstRelics.auditActivityTemplates()
```

### Changed
- Teleport abilities are now classified through the template layer instead of one-off handling.


## v0.17.3

### Changed
- Fey Step now uses a Misty Step-like teleport activity template.
- Shadow Step and One Step Behind are marked for the same teleport template family.
- Teleport activity metadata now includes:
  - `teleport: true`
  - `teleportTemplate: "mistyStep"`
  - `teleportRange`

### Notes
- Coordinate-based `FirstRelics.feyStep({ x, y })` remains available for controlled testing.
- UI crosshair/target picking will be added in a later pass.


## v0.17.2

### Added
- Added first real ability automation helper:
  - `FirstRelics.feyStep({ x, y })`
- Fey Step supports selected token validation, Cloak validation, 60 ft range validation, charge consumption, token teleport, and timeline logging.

### Notes
- This is coordinate-based for now. UI target picking will come later.


## v0.17.1

### Added
- Added Ability Automation Engine skeleton.
- Added shared automation metadata reader.
- Added dry-run execution path.
- Added timeline logging for automation dry-runs.
- Added commands:

```js
await FirstRelics.auditAutomationEngine()
await FirstRelics.testAutomationEngine("cloak_feywilds", "active1")
```

### Notes
- This version does not yet apply real effects or movement.
- It prepares the shared execution layer for Cloak of Verdant Paths automation.


## v0.17.0

### Added
- Started Roadmap Phase 2: Ability Automation.
- Added `CHANGELOG.md`.
- Added Sprint 1 focus audit for:
  - Cloak of Verdant Paths
  - Mantle of the First Seer
- Added console command:

```js
await FirstRelics.auditSprint1()
```

### Changed
- Development direction is now sprint-based.
- Sprint 1 focuses only on the first two relics and their 12 activities.

### Current Sprint 1 Targets
- Cloak of Verdant Paths
  - Fey Step
  - Arrow of the First Hunt
  - Nature's Pursuit
  - Verdant Snare
  - Avatar of The Hunt
  - Signature of The Hunt
- Mantle of the First Seer
  - Echo of Tomorrow
  - Moment of Clarity
  - Threads of Fate
  - Spell Insight
  - Avatar of Understanding
  - Signature of Understanding

## v0.16.1

### Changed
- Updated module author to `yolgonis`.

## v0.16.0

### Added
- Data-driven Activity Engine Rewrite.
- Centralized activity definitions for all 72 relic activities.

## v0.15.x

### Added
- Test Lab.
- Playtest Lab.
- Diagnostics.
- Detailed activity audit tools.
- Test Lab reset and restore tools.

## v0.21.9

- Added Fey Step duplicate-prompt protection for chat-card automation.
- Added per-token Fey Step in-flight locking so repeated chat hooks cannot open multiple destination pickers.
- Fixed Fey Step result metadata so sheet-triggered uses report `chargesSpent: 0` when dnd5e already consumed the resource.
- Dashboard now remembers the last opened tab while switching relics or reopening during the same session.
- Control Panel now shows a small status line and temporarily disables all action buttons while an action is running.
- Added internal teleport-animation hints to Fey Step activity data so external animation modules are less likely to fight the built-in snap/fade teleport flow.

## v0.22.0

- Added **Cloak Quick Actions** to the GM Control Panel.
- Added Control Panel buttons for Fey Step, Arrow Mark Target, Nature's Pursuit, Verdant Snare Note, Avatar, Signature, and Cloak automation audit.
- Added `FirstRelics.useCloakAbility(actorOrId, abilityId, options)`.
- Added `FirstRelics.auditCloakAutomation()`.
- Updated Cloak quick actions so non-Fey Step uses write to the relic timeline.
- Updated `TFRUseCloakAbility("feyStep")` to call the working 60 ft Fey Step picker instead of posting an old manual movement note.
- Kept the stable snap teleport behavior; no forced particle animation added in this version.
