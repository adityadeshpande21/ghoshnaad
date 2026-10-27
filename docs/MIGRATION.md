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
| `app.js`: language core | ~50 | **done** | `src/ui/i18n.loose.js` over `src/i18n/` (`I18n` class, ICU-lite messages, `mr/hi/en.json`, `legacy-keys.json` keeps the old `I18N[lang][key]` tables working while screens move to `i18n.t`); every text of all three languages and the helpers equal to v1.1.0 (`screens.spec.mjs`). Two deliberate differences: the link of the correction legend is a text of its own (`f_legendGuide`; a message may not hold an `<a>`), and the unreachable Hindi singular of `f_changed` stays unreachable (v1.1.0 compared with a Devanagari digit while Hindi shows Latin digits: a grammar fix for the wording review) | — |
| `app.js`: data loading | ~15 | **done** | `Catalog` in `src/data/catalog.ts` (the embedded pack only; unit-tested against the released pack) | — |
| `app.js`: rachana list | ~30 | **done** | `src/screens/list/list.loose.js`; same rows, chips and counts through search and every filter in 3 languages | — |
| `app.js`: player, sound wiring, settings sheet | ~320 | **moved** | `src/screens/player/player.loose.js` (one closure, as before). Same list, score, sheet and playback behaviour; all tests pass. Still to do: split it into `PlayerScreen`, `SettingsSheet`, and a sound-settings piece; retire the `window` handles it keeps for `platform.js` and the tests | — |
| `app.js`: what remains | 42 | **done** | helpers, theme toggle, language switching, the services object, start-up | — |
| `legacy/tala-velresha.html` | 595 KB | **done** | `TalaTimelineScreen` in `src/screens/tala/` (shadow DOM, text in `tala.*` keys in mr / hi / en; shared `AudioEngine` and `Transport`; sounds in `src/audio/tala.ts`; same `tala.v3` key). Draws the same as the standalone page through 27 filter steps, and its sounds match to 1e-6 (`tala.spec.mjs`). Its text is still Marathi only | — |

Rules while migrating: one script per change; the old script is deleted in the same change that adds its replacement;
`tests/dist/parity.test.mjs` lists the scripts that differ from v1.1.0, so an unplanned change shows up as a failing test.

## Files marked `.loose.js`

A script moved from v1.1.0 with its shared names replaced by explicit services (`env.audio`, `env.player`, `env.settings`, …)
starts with `// @ts-nocheck` and ends in `.loose.js`. It is not fully typed yet, but `npm run typecheck` runs `tools/check-names.mjs`,
which fails on any name that no longer exists, so a forgotten global cannot slip through. Typing a file means removing the marker
and the `.loose` suffix.

## Remaining work, in order (merged with the Work Brief)

Source of the tasks: [Ghoshnaad v2 — Work Brief](Ghoshnaad%20v2%20—%20Work%20Brief%20review%20fixes,%20localization,%20झल्लरी%20sound.md)
(A = review fixes, B = localization, C = झल्लरी). The earlier migration list above stays, and its open items are placed below.

| Step | Work | Notes |
| --- | --- | --- |
| 1 | **A1, A2**: `/dist/` in `.gitignore` and commit `tests/dist/`; `test:dist` fails on zero tests; read the CI logs and fix Firefox and WebKit; `timeout-minutes: 15` | A2 needs the Actions log: it cannot be read from here |
| 2 | **A3–A13**, one change each with its test | A6 (`Screen.isBusy()`) touches every screen; A11 removes `src/app/timeline3.js`, `tools/ghosh-notation-v2/`, `tools/player/` (the band-score tool is kept as untouched tooling by an earlier decision: confirm before deleting); A13 moves the timeline-vs-v1.1.0 check into `npm test` |
| 3 | **Prepare B**: split the player closure into `PlayerScreen` / `SettingsSheet` / sound settings; turn `platform.js` into a screen module; retire the `window` handles | Done before B step 3 so each screen's text is moved once, in a file that is already a screen |
| 4 | **B steps 1–9** (steps 1–9 done; step 9: `i18n.name(dev, rom)` is the one place that chooses a name — Devanagari as printed, roman letters for English, or the Devanagari name written in Gujarati / Bengali / Gurmukhi / Odia / Kannada / Telugu / Malayalam / Tamil by `src/i18n/names.ts` (code-point tables, Tamil's own table), corrected by `rules/names/<script>.json`; every screen uses it, and the list search also matches the language's own script; the build now generates the per-language imports (`virtual:languages/messages`, `/names`, `/content` from `languages.json`: `build/lib/languages.mjs`), and the guide / घोषदंड content follow the language's fallback chain, so B step 10 can be data only; the step letters of the घोषदंड page became the message `ghoshdand.letters`; steps 1–8: step 8: `npm run i18n:export -- --lang <code>` writes a spreadsheet (key, where it appears, blanks, max length, English, Marathi, the language) and `npm run i18n:import -- file.xlsx [--dry-run]` reads it back, writes the valid rows in the order of `en.json`, lists refused rows and runs `i18n:check` (`tools/i18n-xlsx.mjs`, `tools/lib/xlsx.mjs` is a small writer / reader on `fflate`, no new dependency); the guide for translators is `docs/TRANSLATING.md`; steps 1–7: step 7: `npm run i18n:check` (`tools/i18n-check.mjs`, in `verify` and CI) fails on a key used in code but missing from `en.json`, a translation whose blanks or select branches differ from English, a value that is not a plain message, a language without file / fonts / fallback; it warns on unused keys (22 old v1.1.0 texts today) and reports coverage; `tests/browser/qps.spec.mjs` runs the app in the pseudo-language `qps` (`tests/support/pseudo.mjs`: [brackets], 40 % longer) at 360 px and fails on unbracketed text or text that is cut off — names from the data, notation, the guide / घोषदंड content and release notes are on its allow-list; it found and fixed seven hard-coded spoken labels and two cut-off labels; steps 1–6: step 6: `setLang()` in `app.js` only asks the core to switch; the core stores the choice and calls `i18n.onChange`, the page redraws its static texts, then the `App` (one subscription) calls `onLang` of every registered screen or service in registration order — player, list and the platform group are services with an `onLang` now; no per-language table remains; step 5: the tala screen's text is `tala.*` keys (57, mr as before, hi and en new — the approved text change; the tala names follow the language's script, numbers its digits, and the screen redraws when the language changes while it is open; the legend colours moved to the stylesheet, so the drawing test ignores those two attributes); step 4: the guide is `src/content/<lang>/guide.md` (parser `src/content/guide.ts`) and the words of the घोषदंड signals are `src/content/<lang>/ghoshdand.md` (parser `src/content/keyed.ts`, filled into the figure data by `src/screens/ghoshdand/texts.js`); the घोषदंड screen strings are `ghoshdand.*` keys. Each language's files are imported by name today; B step 10 generates those imports from `languages.json`. Steps 1–3: the `I18n` core, the texts moved to JSON, every screen on `i18n.t('screen.key', { name })`; the old `I18N` / `tx` / `L()` tables are gone from the app, and `data-t*` became `data-i18n*`. `tests/fixtures/legacy-keys.json` + `tests/support/legacy-tables.ts` keep the proof against v1.1.0 alive: every old text is rebuilt from the new messages and compared) | One step per change; mr, hi and en output unchanged except step 5 (tala screen gets hi and en) |
| 5 | **C**: झल्लरी (`src/audio/jhallari.ts`) | After B step 3, as the brief says; updates `audio-diff` and the callers (player, घोषदंड, sound check, tala) |
| 6 | **Other open items**: type the `.loose.js` files; `FolderSync` split with `UserLibrary`; `tala.v3` in backups | `tala.v3` choices could become a setting key |
| 7 | **B step 10**: pilot language (default Gujarati) | Proves that only data changes |
| 8 | **Device checks** (Samsung, iPhone 13, OnePlus), real folder in Chrome/Edge, wording review; tag **v2.0.0** | Manual |
