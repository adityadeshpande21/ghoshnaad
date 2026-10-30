# Ghoshnaad v2 — Plan Review and Architecture

Oct 27, 2026 · @AD

## Summary

The proposed plan is right about the method: lock today's output as golden fixtures, gate every build on a single offline HTML file, and migrate in small steps. Two of its promises do not hold in the real world, and its tooling is heavier than this app needs.

- **"Works on all major devices from a copied file" is not achievable as stated.** iPhone and iPad cannot run a local HTML file: the Files app shows a preview without running scripts, and Safari cannot open local files. Firefox on Android cannot open local files either. Desktop browsers and Chrome on Android can.
- **Browser storage cannot be trusted for user work.** For files opened from disk, each file path gets its own storage area, and browsers may change this at any time ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage?tp=1)). Replacing the HTML with a new version under another name silently "loses" a user's compositions.
- **Vite + single-file plugin + a legacy bridge fights the bundler.** The current app is ten classic scripts that share top-level names. A small build script on esbuild, which the project already uses, produces the same one-file output with less machinery.

**Recommended direction:**

1. **Main home: GitHub Pages.** The app lives at one fixed HTTPS address. Every phone and computer opens it there, installs it to the Home Screen, and then uses it offline.
2. **One build, two outputs.** The same self-contained `Ghoshnaad.html` is served as the website's page and also offered as a download for people who prefer a file on desktop or Android.
3. **The website adds three small companions** that a hosted, installable app needs: an offline-cache script, an install manifest and icons. The HTML itself still needs nothing else to run.
4. **User work** is stored by the website's address, so it survives updates. Backup files remain the guarantee.
5. **Code** reorganised into readable modules and a handful of classes, migrated in five phases with a golden-output check after every step. Every push builds and tests; a push to `release/production` publishes (see Hosting).

## Real-world constraints

Served from GitHub Pages, the app reaches every major phone and computer, including iPhone and iPad. The downloadable file still works where local files can run. Rows marked "test" must be confirmed on a real device in Phase 0.

| Device and browser | From the GitHub Pages link | As a downloaded file | Saving user work |
| --- | --- | --- | --- |
| iPhone, iPad — Safari (all iOS browsers use its engine) | Yes. Add to Home Screen, then works offline | No: Files shows a preview without scripts ([source](https://fcdn.macrumors.com/threads/testing-web-pages-locally-on-an-ipad.2422895/)) | Kept by the website address; Home Screen apps are exempt from Safari's 7-day deletion ([source](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519)); backup by download |
| Android — Chrome | Yes. "Install app", then works offline | Yes, "Open with Chrome" from Files or WhatsApp | By website address; backup by download |
| Android — Samsung Internet | Yes (test) | Test | By website address (test) |
| Android — Firefox | Yes, online and cached | No: cannot open local files | By website address |
| Windows, macOS, Linux — Chrome, Edge | Yes; can install as a desktop app | Yes, double-click | By website address; folder sync available |
| Windows, macOS, Linux — Firefox | Yes | Yes | By website address; save by download |
| macOS — Safari | Yes; "Add to Dock" | Yes (test) | By website address; save by download |
| Chromebook | Yes; can install | Drag the file into a Chrome tab ([source](https://malderson.nfshost.com/websound/platforms.html)) | As Chrome |

The first visit needs internet. After that, the installed app opens offline, and a new version is fetched the next time the phone is online.

Other constraints that shape the design:

- **Folder access is Chrome and Edge only.** `showDirectoryPicker` exists in Chrome and Edge 86+, not Firefox or Safari; the standard folder input works everywhere for reading ([web.dev](https://web.dev/articles/files/open-a-directory)).
- **iPhone silent switch mutes Web Audio.** Playing a silent `<audio>` element inside the first tap unblocks it ([audjust](https://www.audjust.com/blog/unmute-web-audio-on-ios)). Without this, iPhone users hear nothing and assume the app is broken.
- **Sound needs a tap first** on every browser, and Safari can suspend or interrupt audio on calls, lock screen and tab switch. Playback must pause cleanly and resume from the same matra.
- **Updates.** The website is the update channel: a new version published to GitHub Pages reaches installed apps the next time they are online. Downloaded files still need a manual replacement, so the version and "what's new" stay visible in the app.
- **Size and speed.** Today's file is about 1.2 MB. Low-end Android phones must open it in under 3 seconds and play without dropped notes; that becomes a measured budget.

## Review of the proposed plan

Keep its safety rules, simplify its machinery, and add what it leaves out: iPhone access, the update path, and where the book data comes from.

| Area | The plan says | Assessment | Change in this redesign |
| --- | --- | --- | --- |
| Golden fixtures for all 120 rachanas | Phase 0 before any change | Right; the compiler already has a validator and 122 compiled outputs to start from | Keep; also record timelines at 3 tempos and screenshots |
| One-file gate and offline browser test | Hard build gate, `file://` test | Right | Keep; run on Chromium, Firefox and WebKit |
| No runtime `fetch` of app files | Embed everything | Right | Keep |
| Vite + single-file plugin + legacy bridge | Main toolchain | Overweight: Vite does not inline classic scripts, and the 10 legacy scripts share top-level names (`S`, `ctx`, `stop`, `buildTimeline3`), not just `window.*` objects | One esbuild build script that writes the HTML; legacy scripts copied in as-is until replaced |
| TypeScript strict everywhere | Gradually | Good for core logic, costly for UI glue a non-specialist edits | TypeScript for core, audio and storage; UI in plain modern JS with JSDoc types |
| Ports and adapters for every service | Layer diagram with interfaces | More layers than one maintainer can hold | Four folders (core, audio, data, screens) and about 15 classes |
| Revision counters and disk-conflict resolution | Phase 5 | Correct goal, complex mechanism | Files are the truth; on restore, keep both copies when they differ |
| "All major devices" from a copied file | Requirement A.1 | Not possible as a file on iPhone, iPad or Firefox Android; possible from a website | GitHub Pages as the main home; the file stays available as a download |
| Seven phases | Phases 0–7 | Workable but long | Five phases, each shippable |
| Line references (e.g. "lines 1040–1045") | Audit items | They point into the built HTML, not source files | Reference source files and functions |

**Missing from the plan:**

- **The update path.** A new version under a new file name starts with empty storage. Users need one fixed name (`Ghoshnaad.html`), a backup reminder, and a "what's new" screen.
- **The book-data pipeline.** The 120 rachanas are compiled from book sources in a separate project (`ghosh-notation`). v2 should hold sources, tala rules and compiler in one repository, so a correction to a book rachana is one edit and one build.
- **All four sound schedulers.** Player, sound check, Ghoshdand signals and the separate tala-timeline page each schedule sound their own way. All four move to one audio engine.
- **Fonts.** The app relies on system Devanagari fonts, which are missing on some Linux and older Android systems. Embedding an open-licence subset (Noto Sans Devanagari or Mukta, both OFL) is a decision, not a preservation.
- **A performance budget** on a low-end Android phone, and a named list of real devices for sign-off.

## Redesigned architecture

Four layers, each in its own folder: music rules that never touch the screen, one audio engine, one place for data, and one class per screen. A person fixing a rule, a sound or a button should know which folder to open from the name alone.

&#91;embedded content: v2 layers · screens, audio, data, core\]

Arrows point to what a layer uses. Screens never touch music rules directly, and Core never touches the screen or sound, so each can be tested on its own. Three small hosting classes (UpdateManager, InstallGuide, StorageGuard) sit beside Data and are described under Hosting on GitHub Pages.

**Principles**

1. **One file out, many readable files in.** Source is split by meaning; the build stitches it into `Ghoshnaad.html`.
2. **Music rules are pure.** Notation, tala and timeline code takes data and returns data. No DOM, no audio, no language text. Every rule is testable without a browser.
3. **One owner per resource.** One `AudioEngine` owns the audio context, one `Transport` owns "what is playing", one `UserLibrary` owns the user's work.
4. **Classes for things with state and a lifetime; functions for rules.** No class wraps a single function.
5. **User data is portable.** Everything a user makes can leave as a file and come back.
6. **Behaviour changes need a fixture change.** Any diff in golden output must be approved, never accidental. A correction to a book rachana after v1.1.0 is declared in `tests/fixtures/book-corrections.json` (id, part, line, before, after, reason); the tests that compare with v1.1.0 accept a difference for exactly those ids and exactly those changes.
7. **No text and no language in the code.** Screen text is `src/i18n/<code>.json`, long content is `src/content/<code>/*.md`, and the build finds every language of `languages.json` by itself; adding a language adds files, not code (`docs/TRANSLATING.md`).

**Repository layout** (as built; `docs/MIGRATION.md` tracks what is still being moved)

```
ghoshnaad/
  README.md                how to build, test, release (one page)
  release.json             version, date, "what's new", the website address
  .github/workflows/
    release.yml            every push: typecheck, tests, build, one-file check, browser tests on 3 engines;
                           push to release/production: replace main with dist/
  build/
    build.mjs              esbuild bundles + data pack + fonts + service worker -> dist/
    check-single-file.mjs  fails if the HTML fetches or links anything external
    lib/                   pack, catalog, fonts, assemble, languages (the esbuild plugin that turns languages.json into the
                           virtual:languages/messages, /names and /content modules)
  books/                   the 120 rachanas in book notation (ghosh-notation/1); books-unshipped/ holds two kept out
  rules/                   talas.json (the only place tala facts live), catalog-order.json, composer.json;
                           names/<script>.json (corrections to transliterated names, only where one is wrong)
  web/                     website companions: sw.template.js, manifest.webmanifest, icons/
  src/
    core/                  pure music rules (TypeScript): notation, compile, timeline, tala, composer model
    audio/                 AudioEngine, Drums, melodic voices, Transport, tala sounds
    data/                  Catalog, UserLibrary, Settings, Backup, FolderSync, the tala page's choices (+ kv, schema)
    platform/              UpdateManager, InstallGuide, StorageGuard
    screens/               one folder per screen: guide, soundcheck, ghoshdand, export, correction, library, composer,
                           list, player, tala (files named *.loose.js were moved from v1.1.0: checked by tsc as plain JavaScript, not fully annotated yet)
    ui/                    Screen and App, the language core's page wrapper, score drawing
    i18n/                  languages.json, <code>.json (all screen text), context.json (notes for translators), format.ts (messages),
                           i18n.ts (the I18n class), names.ts (names in other scripts)
    content/               <code>/guide.md and ghoshdand.md: long content, one folder per language (parsers: guide.ts, keyed.ts)
    browser/               entry points that expose the bundles to the page
    app/                   what is left of the v1.1.0 page scripts, and the page's markup and CSS
  tests/
    golden/                120 compiled rachanas + timelines, recorded from v1.1.0 (and the declared corrections)
    unit/                  core rules, composer model, figure, data, platform, catalog, timeline vs v1.1.0, i18n, content, tools
    dist/                  the build equals v1.1.0 except for the named changes
    browser/               Playwright, on Chromium, Firefox and WebKit: screens equal to v1.1.0, languages, pseudo-language at 360 px,
                           colliding marks of the score at phone widths
    support/               helpers shared by tests (old text tables rebuilt from the new messages, the pseudo-language, the mark detector …)
    fixtures/              a real v1.1.0 storage dump, the old-key map, the book corrections
  legacy/                  v1.1.0 as released and its parts: the reference the tests compare against; band-score-tool/ kept as received
  tools/                   typecheck.mjs (strict for the typed files, plain-JavaScript checking for the *.loose.js ones), i18n-check.mjs, i18n-xlsx.mjs (translators'
                           spreadsheet), check-rachana.mts (a book rachana against everything that should still hold), run-tests.mjs, legacy-split.mjs
  docs/                    this file, MIGRATION.md, the notation notes and schema
  dist/                    build output (not committed): index.html, Ghoshnaad.html, sw.js, manifest, icons, version.json
```

## Hosting on GitHub Pages

`main` holds only the built website, never source, and GitHub Pages serves it from there. A push to `release/production` runs every check in GitHub Actions and, only if all pass, replaces the contents of `main` with `dist/`. Every other push and pull request runs the same checks and publishes nothing. Installed apps pick up the new version the next time they are online, and never mid-performance.

**What the website contains**

| File | Purpose | Notes |
| --- | --- | --- |
| `index.html` | The app | Byte-identical to `Ghoshnaad.html`; everything embedded |
| `Ghoshnaad.html` | Download for file use | Same file, offered from a "Download" button in the app |
| `sw.js` | Offline cache and updates | About 2 KB; generated by the build, with the version in its cache name |
| `manifest.webmanifest` | Install to Home Screen | Name, colours, start page |
| `icons/` | Home Screen and tab icons | 192, 512 and Apple touch sizes |
| `version.json` | Lets the app check for a newer version | Version, date, short "what's new" |

No rachana data files are published separately: the 120 rachanas stay inside the HTML, so the website and the downloaded file behave the same.

**How a release reaches users**

&#91;embedded content: release and update flow · GitHub to installed app\]

Tests run in GitHub Actions on every push; a failure leaves the live version untouched. On the phone, the app finds the new version by checking `version.json`, downloads it in the background, and shows "नवीन आवृत्ती उपलब्ध". Every published version is also kept as a GitHub release, so any version can be restored.

**The address must be decided before launch.** Browsers keep user work per website address. `https://<user>.github.io/ghoshnaad/` and a later `https://ghoshnaad.in/` are different addresses, so switching after launch would leave saved work behind (backup and restore would be needed). Also, every repository under the same `<user>.github.io` shares one storage area; the app's keys are prefixed `ghosh.` so they do not collide.

**New in the app for hosting**

- An install guide per device: Safari → Share → Add to Home Screen; Chrome → Install app.
- The iPhone silent-switch fix, applied on the first tap.
- A request to the browser to keep the app's storage permanently (`navigator.storage.persist()`), shown as a status in settings.

## Compatibility handles on `window`

Some names are set on `window` on purpose: `openPiece`, `renderSheet`, `announce`, `S`, `TR`, `ganHTML`, `slotHTML`, `matraHTML` (the player, set in `player.loose.js`);
`ScreenApp`, `Sanket`, `SanketUI` (`src/screens/index.js`); `ComposerUI`, `Library`, `FixerUI`, `Swarlipi` (the composer, library, correction and export screens);
`PlatformUI` (`platform.js`); `LIBROWS` (the list); `AppEnv`, `APP`, `GhoshPlatform`, `GhoshCatalog`. They are **the test contract with v1.1.0**: the browser tests run the
same `page.evaluate` code on the released page and on the new one (`Swarlipi.open(piece)`, `ComposerUI.init()`, `openPiece(id)` …) and compare what both draw. Retiring them
would drop that proof, so they stay, and they are declared in `src/ui/globals.d.ts`. New code does not use them: a screen gets what it needs from `env` (the services
`AppEnv`) or from the `App` registry (`ScreenApp.get(name)`). The ones still read inside the code (`platform.js` and the folder library reach `ComposerUI`, `Library` and
`PlatformUI` by name) are the next to move onto `env` when those screens are typed further.

## Storage, backup and updates

On the website, a user's work is kept by the site's address, so it survives every update. It still lives inside one browser on one device, so a backup file remains the only guarantee.

**Where work is kept**

| Layer | What it holds | Survives a new version? | Shown to the user as |
| --- | --- | --- | --- |
| Website storage (installed app) | Every edit, saved instantly | Yes, same address | "Saved on this device" |
| Downloaded file's storage | Every edit, saved instantly | Only if the new file has the same name and folder | "Saved on this device (file)" |
| Backup file `ghoshnaad-backup-YYYY-MM-DD.json` | All compositions, corrections, settings, and the tala page's choices (`tala.v3`) | Yes, on any device, browser or address | "Backed up 3 days ago" |
| Rachana folder (Chrome, Edge desktop) | Each rachana as its own file | Yes | "Saved to folder" |

The website and a downloaded file are separate places: work made in one does not appear in the other until moved by backup and restore. The app says which one it is running as.

**Rules**

1. Every edit autosaves to browser storage; the status line never says "saved" unless it is.
2. A backup reminder appears after 7 days or 10 edits without one, whichever comes first.
3. Restore validates the file first (format, size, every rachana compiles), shows what will change, and keeps both copies when a rachana differs. Nothing is overwritten silently.
4. Imported text is never inserted as HTML.
5. Existing formats are read unchanged: `ghosh-notation/1`, `ghosh/3`, composer files, `ghosh-fixes/1`, and v1 `ghosh.*` storage keys. The backup is a new wrapper `ghoshnaad-backup/1` that contains these.

**Updating to a new version**

1. **Installed from the website:** updates arrive by themselves when online; the app asks before switching, never during playback or an unsaved edit.
2. **Downloaded file:** keep the name `Ghoshnaad.html` and replace it in the same folder, so the browser keeps the saved work.
3. **First start of a new version:** a short "what's new" sheet; if storage is empty but the user had work before, a prompt to restore from backup.
4. **Before any address change** (for example a custom domain later): an in-app notice weeks ahead asking everyone to back up, and restore at the new address.

## Build, test and release process

Five phases, each ending in a working release that users could receive. v1.1.0 stays available throughout for comparison and recovery.

&#91;embedded content: v2 roadmap · baseline + 5 phases, each with an exit gate\]

No phase starts until the previous gate is met. MP3 export waits until the audio engine exists.

**How every change is checked**

1. **Golden output.** The 120 compiled rachanas and their timelines at tempos 60%, 100% and 140%, recorded from v1.1.0. Any difference fails the build until approved.
2. **One-file check.** The build fails if the HTML references any other file, URL, font or worker script outside itself.
3. **Translations and notation.** `npm run i18n:check` (keys, blanks, plain messages, languages); `npm run check:rachana -- all` (source, compiled output, symbols, matras, parts end together); a browser test in a pseudo-language at 360 px (text written into the code, text that does not fit) and one that finds colliding marks of the score at 360, 390 and 430 px.
4. **Browser tests in GitHub Actions** with Chromium, Firefox and WebKit, both ways: opening `Ghoshnaad.html` as a file with the network blocked, and opening the built website, installing the offline cache, going offline, reopening. Each run: 120 rachanas listed, a piece plays, a composition saves, a backup restores, an update is offered and applied.
5. **No preview address.** A preview under the same address would share the website's storage and be intercepted by its offline-cache worker. Each pull request is checked by the same jobs and its built site is kept as a downloadable artifact instead; `main` only changes when `release/production` passes.
6. **Real-device checklist** at the end of each phase: iPhone (Add to Home Screen, offline, silent switch), Android Chrome (low-end and recent phone), Windows Chrome or Edge, macOS Safari, Firefox desktop. Each tick records device, browser version and date.
7. **One change at a time.** A structural move never also changes a music rule.

**Process for each change**

1. Move one feature or module.
2. Run golden, one-file and offline tests.
3. Build, compare with v1.1.0 by ear on one rachana per tala.
4. Commit with the phase name; tag at each phase end.

## Decisions needed

All decided on 27 Oct 2026.

| # | Question | Decision |
| --- | --- | --- |
| 1 | Hosting | GitHub Pages, public repository, no paid services |
| 2 | Address | `https://adityadeshpande21.github.io/ghoshnaad/`, no custom domain; fixed for good |
| 3 | Repository | [adityadeshpande21/ghoshnaad](https://github.com/adityadeshpande21/ghoshnaad) |
| 4 | Publisher permission for the 120 rachanas | Confirmed acceptable |
| 5 | Languages for code | TypeScript for core, audio and storage; plain JavaScript for screens |
| 6 | Fonts | Embed an open-licence Devanagari subset |
| 7 | Side pages | Merge the tala timeline into the app; the Ghoshdand review sheet stays separate |
| 8 | Minimum browsers | Chrome and Edge 111+, Firefox 115+, Safari 16.4+ |
| 9 | Sign-off devices | Samsung Galaxy (Samsung Internet and Chrome), iPhone 13 (Safari), OnePlus (Chrome) |
| 10 | Early win | Publish v1.1.0 to GitHub Pages now |
| 11 | MP3 export | After v2 |

## Sources

- [MDN: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage?tp=1) — storage for `file:` URLs is undefined and varies by browser
- [web.dev: How to open a directory](https://web.dev/articles/files/open-a-directory) — folder picker support and fallback
- [Launching Local Files](https://malderson.nfshost.com/websound/platforms.html) — local HTML on Windows, macOS, Linux, Chromebook, Android
- [MacRumors: local web documents on iPad](https://fcdn.macrumors.com/threads/testing-web-pages-locally-on-an-ipad.2422895/) — Safari cannot open local pages
- [Audjust: unmute Web Audio on iOS](https://www.audjust.com/blog/unmute-web-audio-on-ios) — silent switch and the audio-element workaround
