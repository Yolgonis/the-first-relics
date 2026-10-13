# The First Relics v1.1.10

The First Relics is a Foundry VTT module for dnd5e campaigns. It adds twelve evolving legendary relics with affinity progression, staged powers, true-name unlocks, GM dashboard tools, dnd5e activities, and custom item art.

## Requirements

- Foundry Virtual Tabletop v13, verified on 13.351.
- dnd5e system.
- Midi-QOL is recommended for the richest automation coverage, but the module keeps manual reminder paths for powers that need GM adjudication.

## Included Content

- 12 relic item frameworks with Dormant, Awakened, and Exalted stages.
- A 1000-Affinity **Final Form** for every relic: the Signature Ability and true name unlock, all Universal Relic Bonuses increase from Exalted `+3` to `+5`, and maximum charges increase from `10` to `15`.
- Progressive player-facing manifestations in item descriptions: Dormant at acquisition, Awakened at 300 Affinity, Exalted at 750, and Final Form at 1000; GM-only origin and hidden sorrow remain outside player item text.
- Affinity, memory, dream, hidden requirement, and signature unlock data.
- Generated dnd5e item activities and Active Effects where the workflow can be represented natively.
- Helper automation for supported powers, with GM-facing reminder cards for complex effects that should stay under table adjudication.
- A per-relic, GM-only **Relic Refuses Attunement** control in the Relics GM Dashboard. Refusing relics clear and block attunement, suppress their passive bonuses, and prevent their activities or automation helpers from being used until the GM allows attunement again.
- GM dashboard actions for creating relics, rebuilding existing copies, syncing stages, test-lab checks, QA audits, and release checks.
- AI-assisted PNG icon set under `art/icons/v1/`.

## Automation Scope

The First Relics is designed as a Foundry-ready relic toolkit, not a replacement for GM judgment. It provides native dnd5e activities, Active Effects, helper automation, and clear GM reminders. Effects that depend on table context, placement, narrative timing, multiple targets, or post-roll judgment remain GM-adjudicated by design.

## Artwork Disclosure

The relic item icons in `art/icons/v1/` are AI-assisted painted PNG assets prepared for this module. They are licensed for use as part of The First Relics package and are not sold as a standalone art or asset pack.

## Installation

1. Copy the `the-first-relics` folder into your Foundry `Data/modules/` directory.
2. Restart or refresh Foundry.
3. Enable **The First Relics** in your world.
4. As GM, open the module dashboard or run:

```js
await FirstRelics.createAll()
```

If you are replacing an older copy of the module, rebuild existing relic item copies once:

```js
await FirstRelics.syncAllInventoryStages()
```

## Release Check

The module includes a built-in release check for manifest metadata, documentation version text, public API exports, diagnostics, relic cleanup, QA matrix coverage, runtime coverage, and test-lab state:

```js
await FirstRelics.runReleaseCheck()
```

A clean public build should report `RELEASE READY`.

## Packaging for Patreon or itch.io

Use the contents of this folder as the module root when creating the upload zip. Do not include local development folders such as `.git`, `.agents`, or `.codex`; `.itchignore` is included for Butler uploads and is also a useful checklist for Patreon release files.

Suggested zip contents:

- `module.json`
- `README.md`
- `CHANGELOG.md`
- `LICENSE.md`
- `scripts/`
- `styles/`
- `data/`
- `art/`

## Version

Current public version: `1.1.10`.

See `CHANGELOG.md` for the full development history.

## License and Use

See `LICENSE.md`.

This package is an independent module for Foundry Virtual Tabletop and is not affiliated with Foundry Gaming LLC, Wizards of the Coast, Hasbro, or any other third-party rights holder.
