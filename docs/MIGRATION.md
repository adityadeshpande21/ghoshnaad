# Moving the page scripts to screens

The v1.1.0 app is a set of classic scripts that share top-level names. `src/app/` is the working copy of them;
`legacy/` is the untouched release the tests compare against. Each script becomes a **screen** (a class in `src/screens/`
that gets its services from the page instead of reaching for globals) or part of the **core** (`src/core/`, pure and tested).

A script counts as migrated only when **a test shows it does what v1.1.0 did**:
- pure code (composer model, figure): the new module and the v1.1.0 file are run side by side on real and random input;
- a screen: the HTML it draws is compared with what v1.1.0 drew, in all three languages, plus its behaviour in the browser;
- sound: the samples are compared (`tests/browser/audio-diff.spec.mjs`).

| Script | Lines | Status | Where it went / goes | Needs first |
| --- | --- | --- | --- | --- |
| `composer-core.js` (composer model) | 178 | **done** | `src/core/composer.ts`, equivalence in `tests/unit/composer.test.mjs` | — |
| `sanket.js` (Ghoshdand figure) | 295 | **done** | `src/screens/ghoshdand/figure.js`, `tests/unit/figure.test.mjs` | — |
| `guide.js` (notation guide) | 296 | **done** | `GuideScreen` in `src/screens/guide/`, `tests/browser/screens.spec.mjs` | — |
| `platform.js` (data, update, install) | 246 | new in v2 | to become `SettingsScreen` pieces | — |
| `soundlab.js` (sound check) | 319 | **done** | `SoundCheckScreen` in `src/screens/soundcheck/`; draws the same HTML on every tab in 3 languages (`screens.spec.mjs`) | — |
| `sanketui.js` (Ghoshdand page) | 342 | **done** | `GhoshdandScreen` in `src/screens/ghoshdand/`, on the shared `Transport` | — |
| ScoreView: `slotHTML`, `matraHTML`, `ganHTML`, `fitRows` | ~60 | **done** | `src/ui/scoreview.loose.js`; same HTML for every गण of all 120 rachanas (`screens.spec.mjs`) | — |
| `export.js` | 371 | **done** | `ExportScreen` in `src/screens/export/`; same sheet, text and layouts in 3 languages (`screens.spec.mjs`) | — |
| `fixer.js` | 288 | **done** | `CorrectionScreen` in `src/screens/correction/`; same screen in 3 languages (`library.spec.mjs`) | — |
| `library.js` (folder, corrections store) | 345 | **moved** | `src/screens/library/library.loose.js`; same bar, sheet and folder behaviour as v1.1.0 against an in-memory folder. Still to do: split the folder code into a typed `FolderSync` class and use `UserLibrary` for the stored data | — |
| `composer.js` (composer screens) | 584 | **done** | `src/screens/composer/composer.loose.js`; list, editor and checks identical in 3 languages; create/save/count-as-edit/play tested (`screens.spec.mjs`) | — |
| `app.js`: language core | ~50 | **done** | `src/ui/i18n.loose.js`; every text of all three languages and the helpers equal to v1.1.0 (`screens.spec.mjs`) | — |
| `app.js`: data loading | ~15 | **done** | `Catalog` in `src/data/catalog.ts` (the embedded pack only; unit-tested against the released pack) | — |
| `app.js`: rachana list | ~30 | **done** | `src/screens/list/list.loose.js`; same rows, chips and counts through search and every filter in 3 languages | — |
| `app.js`: player, sheet, boot (what is left, ~330 lines) | 330 | next | `PlayerScreen`, `SettingsSheet`, `App` start-up | the sound and Transport shims retired |
| `legacy/tala-velresha.html` | 595 KB | **done** | `TalaTimelineScreen` in `src/screens/tala/` (shadow DOM; shared `AudioEngine` and `Transport`; sounds in `src/audio/tala.ts`; same `tala.v3` key). Draws the same as the standalone page through 27 filter steps, and its sounds match to 1e-6 (`tala.spec.mjs`). Its text is still Marathi only | — |

Rules while migrating: one script per change; the old script is deleted in the same change that adds its replacement;
`tests/dist/parity.test.mjs` lists the scripts that differ from v1.1.0, so an unplanned change shows up as a failing test.

## Files marked `.loose.js`

A script moved from v1.1.0 with its shared names replaced by explicit services (`env.audio`, `env.player`, `env.settings`, …)
starts with `// @ts-nocheck` and ends in `.loose.js`. It is not fully typed yet, but `npm run typecheck` runs `tools/check-names.mjs`,
which fails on any name that no longer exists, so a forgotten global cannot slip through. Typing a file means removing the marker
and the `.loose` suffix.
