# घोषनाद (Ghoshnaad)

An offline app for RSS Ghosh rachanas: the 120 rachanas from the books, playback of every part, notation guide, sound check and घोषदंड संकेत.

**Open the app:** https://adityadeshpande21.github.io/ghoshnaad/ — on a phone, use *Add to Home Screen* (Safari) or *Install app* (Chrome); after the first visit it works without internet.
**As a file:** `Ghoshnaad.html` is the same app in one self-contained file (computers, and Chrome on Android).

Design and decisions: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Build, test, release

```
npm ci
npm run verify        # typecheck, golden + unit tests, build, one-file check, build parity, browser tests (3 engines)
npm run build         # -> dist/  (index.html, Ghoshnaad.html, sw.js, manifest, icons, version.json)
npm run golden:record # only when a change in output has been approved
```

**`main` holds only the built app** (`index.html`, `Ghoshnaad.html`, `sw.js`, manifest, icons, `version.json`), never source.
GitHub Pages serves it from there (Settings → Pages → *Deploy from a branch* → `main`, root). Source lives on the other branches.
A push to `release/production` runs the checks in GitHub Actions and, only if they all pass, replaces the contents of `main` with `dist/`.
Every other push and pull request runs the checks without publishing. Push a tag `vX.Y.Z` to also keep that version as a GitHub release.
Set the version and "what's new" in [release.json](release.json) before releasing.

## Where things are

| Folder | What |
| --- | --- |
| `books/` | the 120 rachanas in book notation (`ghosh-notation/1`); `books-unshipped/` holds two not in the app yet |
| `rules/` | `talas.json` (the only place tala facts live), book order, composer data |
| `src/core/` | music rules in TypeScript: tokenize, compile, timeline. Pure functions, no DOM or sound |
| `src/data/`, `src/platform/` | the person's work and the app around it, in TypeScript: `UserLibrary`, `Settings`, backup and restore; `StorageGuard`, `UpdateManager`, `InstallGuide`. Storage keys and formats are v1.1.0's, unchanged |
| `src/i18n/` | texts of the new data and platform screens in Marathi, Hindi, English |
| `src/audio/` | the sound, in TypeScript: `AudioEngine` (the one audio context, iPhone unlock, interruptions), `Drums`, melodic voices, `Transport` (the scheduler) |
| `src/ui/`, `src/screens/` | the screen structure (`Screen`, `App`) and the screens already migrated (notation guide; the Ghoshdand figure). See [docs/MIGRATION.md](docs/MIGRATION.md) |
| `src/app/` | the page scripts (player, composer, sound check, Ghoshdand …), forked from v1.1.0; they are replaced screen by screen |
| `src/browser/` | entry points that expose the core, timeline and audio to the page scripts |
| `legacy/` | v1.1.0 exactly as released (`v1.1.0/`) and its parts (`src/`): the reference the tests compare against; the build does not use it |
| `build/`, `web/` | the build, the one-file check, service worker template, manifest, icons |
| `tests/` | `golden/` (fingerprints of all 120 rachanas and their timelines, recorded from v1.1.0), `unit/`, `dist/` (build parity with v1.1.0), `browser/` (Playwright; `audio-diff` renders v1.1.0's sound and the new engine's and compares the samples) |
| `tools/` | `legacy-split.mjs` (proves the split rebuilds v1.1.0 byte for byte), band-score player and PDF export, the original v1 JavaScript |

## Rules

- **Behaviour changes need a fixture change.** Any difference in `tests/golden` is a failure until someone approves it.
- **One file out.** `npm run check` fails if the HTML links or fetches anything outside itself.
- **One change at a time.** A structural move never also changes a music rule.
