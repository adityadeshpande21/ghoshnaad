# Ghoshnaad v2 — Work Brief: review fixes, localization, झल्लरी sound

Oct 27, 2026 · @AD

## Summary

Three pieces of work on branch `epic/arch-redesign-oct26`, in this order: (A) make CI green and fix the review findings, (B) move all text into one localization system so a new Indic language is a translation file and nothing else, (C) replace the झल्लरी sound, which today sounds like a drum-kit crash or hi-hat, with a pair of hand-held clash cymbals.

Ground rules, as in the repository README:

- One change at a time. A structural move never also changes a music rule or a sound.
- Behaviour changes need a fixture change. B must leave every screen identical in mr, hi and en; C is an approved sound change limited to झल्लरी, and every other instrument's samples stay equal.
- One file out. `npm run check` passes for both `Ghoshnaad.html` and `index.html`.
- Each workstream ends with `npm run verify` green and CI green on Chromium, Firefox and WebKit.

## A. Fixes from the branch review

Thirteen findings from the review of commit `3ab5831`; A1 and A2 block the merge. "Confirmed" means reproduced in the review; "likely" means read from the code and still to be proven by the test listed.

| # | Severity | Problem | Fix | Done when |
| --- | --- | --- | --- | --- |
| A1 | Must | `.gitignore` line `dist/` also hides `tests/dist/`, so `parity.test.mjs` was never committed; `npm run test:dist` runs 0 tests and passes (confirmed) | Change the line to `/dist/`; commit `tests/dist/`; make `test:dist` fail when it finds no test files | CI step "The build equals v1.1.0" reports its tests by name |
| A2 | Must | CI red: Firefox and WebKit fail; Chromium ran over 8 min (3 min locally) | Read the failing tests in the Actions log and fix each; add a per-job `timeout-minutes: 15` | All three browser jobs green twice in a row |
| A3 | Should | Service worker waits on the network for the page with no time limit; on weak signal the app opens blank for a long time | Network first with a 3 s limit, then the cached page; refresh the cache in the background | Browser test: network delayed 10 s → app shows within 4 s from cache |
| A4 | Should | Worker `install` can store a stale page: GitHub Pages lets browsers keep it for 10 min, and `addAll` uses the HTTP cache (likely) | `c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))` | Test: install after a version change stores the new `index.html` |
| A5 | Should | Restoring the same backup again adds another "(backup)" copy of every changed composition each time (confirmed) | Skip a copy whose content (all fields but id and name) equals a composition already present | Unit test: three restores of one file → one copy |
| A6 | Should | Update and restore reload the page while a correction draft is unsaved, or while sound check, घोषदंड or the tala screen plays | One `busy()` that asks every screen (`Screen.isBusy()`), not only the player and composer | Browser test: dirty correction → update refused with the "busy" message |
| A7 | Should | `check-single-file` skips every `src`/`href` check for `index.html`, not only the two install links (confirmed) | Allow exactly the two install links; check everything else as for the file | Unit test: `<img src="x.png">` in `index.html` fails |
| A8 | Low | iPhone: the silent `<audio>` is not restarted after a call; iOS 16.4 then mutes again (iOS 17+ is covered by `audioSession`) | In `unlock()`, `play()` the keep-alive element again when it is paused | Device check on iPhone 13: silent switch on, call, resume |
| A9 | Low | Each update downloads the 1.9 MB page twice (`./` and `index.html`) | Cache `index.html` only; answer `./` from it | Network log of one update shows one page download |
| A10 | Low | `upload-artifact@v4` drops hidden files, so `.nojekyll` never reaches `main` | `include-hidden-files: true` on the dist upload | `main` lists `.nojekyll` after a release |
| A11 | Low | Unused copies (about 1 MB): `src/app/timeline3.js`, `tools/ghosh-notation-v2/`, `tools/player/` | Delete, or move to `legacy/` with a one-line README | `npm run verify` green after removal |
| A12 | Low | `docs/ARCHITECTURE.md` describes "push to main" and pull-request previews; the real flow is `release/production` → `main`, no previews | Update the release sections and the repository layout | Doc matches `release.yml` |
| A13 | Low | No test ties the TypeScript timeline to v1.1.0's `timeline3.js` (the review checked by hand: all 5,976 timelines equal) | Add a golden test that runs `legacy/src/app/timeline3.js` against every book, part, order and tempo | Test in `npm test` |

Two browser tests also fail on older Chromium builds (export download name with "—" becomes "download"; preview height off by 1 px). Use ASCII in download names (`Shriram - swarlipi.txt`) and compare preview height within 2 px.

## B. Localization for many languages

The target: adding a language (Gujarati, Kannada, Telugu, Tamil, Bengali, Odia, Punjabi, Malayalam, Konkani, Sanskrit, …) is a language entry plus translation files, with no code change and no screen edited. A pseudo-language test proves it before any real language is added.

### What is wrong today

- Text lives in two systems: `src/i18n/{mr,hi,en}.json` (60 keys, `{x}` blanks) and the old tables in `src/ui/i18n.loose.js` plus 8 screen files that merge their own blocks with `Object.assign(I18N[l], …)`.
- Many strings are code (`count: n => \`${n} रचना\``) or carry HTML (`पाऊल\<br>आवाज\`); a translator cannot edit them.
- Fallbacks differ by file (`C[LANG] || C.mr`, `LS[LANG] ? LANG : 'mr'`); the correction screen keeps a regex table keyed by language.
- Language switching calls each screen by name in `setLang()`; a new screen must be added there by hand.
- Digits are only Devanagari or Latin (`latinDigits`); rachana names exist only as Devanagari and English letters.
- The tala screen is Marathi only.
- Nothing reports a missing or broken string until someone sees it.

### Four kinds of text, one home each

| Kind | Examples | Home | Translated? |
| --- | --- | --- | --- |
| Screen text | buttons, labels, messages, errors | `src/i18n/<lang>.json` | Yes, by translators |
| Long content | guide, घोषदंड rules and signal texts, "what's new" | `src/content/<lang>/<name>.md` | Yes, by translators |
| Names in the data | rachana, raga, tala, section names | the data pack, per script | Generated by transliteration, with an override file |
| Notation | swaras, bols, ऽ, –, ending numbers | unchanged, as printed in the book | No (decision D3) |

### Files

```
src/i18n/
  languages.json      one entry per language (below)
  en.json             reference language: every key lives here first
  mr.json  hi.json    … one file per language, same keys
  context.json        for each key: where it appears, max length, what each {blank} holds (English)
  format.ts           message formatter
  i18n.ts             the I18n class
src/content/<lang>/    guide.md, ghoshdand.md, …
rules/names/<script>.json   name overrides where transliteration is wrong
```

Keys are flat and named by screen: `player.play`, `list.count`, `backup.restore.title`. A key is never reused for a different meaning.

`languages.json` entry:

```
{ "code": "gu", "name": "ગુજરાતી", "script": "Gujr", "digits": "gujr",
  "fallback": ["hi", "en"], "fonts": "'Noto Sans Gujarati', 'Shruti', sans-serif",
  "status": "beta" }
```

`status`: `complete` (100 % of keys) is listed; `beta` (80 % or more) is listed with a "beta" mark; below 80 % it is built but hidden. Existing codes `mr`, `hi`, `en` and the stored key `ghosh.lang` stay unchanged, so v1.1.0 users keep their choice.

### Message format

A small subset of the standard ICU message format, written in house (about 2 KB, no library):

- Blanks: `"Backed up {d} days ago"`
- Plurals, from the browser's `Intl.PluralRules`: `"{n, plural, one {# रचना} other {# रचना}}"`
- Choices: `"{foot, select, L {डावा} R {उजवा} other {}}"`
- Numbers in the language's digits: every `#` and `{n, number}` goes through `I18n.num()`
- Line breaks as `\n`; bold as `<b>…</b>` only. The formatter builds DOM nodes, never `innerHTML`, so a translation cannot inject markup.

No functions or HTML inside a translation file; the build rejects them.

### The I18n class

| Member | Does |
| --- | --- |
| `t(key, params?)` | Formatted text in the current language, through the fallback chain |
| `num(n)`, `time(s)`, `list(items)` | Numbers in native or Latin digits (`Intl.NumberFormat` with `-u-nu-<digits>`, own digit map where a browser lacks it), mm:ss durations, joined lists |
| `name(item)` | A rachana, raga or tala name in the current script; English shows the roman name |
| `setLocale(code)` | Switches language, sets `<html lang>` and the font stack, saves `ghosh.lang`, fires `change` |
| `onChange(cb)` | The only way screens learn of a switch; `Screen` subscribes in its base class and calls `render()` |
| `apply(root)` | Fills every `data-i18n="key"` (text) and `data-i18n-attr="aria-label:key"` under `root` |

Missing key at run time: development builds show `⟦key⟧` and log once; release builds fall back silently along the chain, ending in English.

Screens never test `LANG === 'hi'`. Anything that differs by language (count-in words, घोषदंड call words, the correction screen's messages) becomes keys.

### Names in other scripts

The Indic scripts map onto each other almost letter for letter, so the build derives each rachana, raga and tala name from Devanagari for every script in `languages.json` (Gujarati, Bengali, Gurmukhi, Odia, Kannada, Telugu, Malayalam; Tamil needs its own rules, as it lacks some consonants). `rules/names/<script>.json` corrects any name that comes out wrong. Search matches the Devanagari, the roman and the current script's name, so a Gujarati user can type in either script.

### Checks in every build (`npm run i18n:check`, part of `verify`)

| Check | Result |
| --- | --- |
| A key used in code is missing from `en.json` | Fail |
| A translation's blanks, plural or select branches differ from English | Fail |
| A translation contains a function, HTML other than `<b>`, or invalid JSON | Fail |
| A `languages.json` entry lacks its file, font stack or fallback | Fail |
| A key in `en.json` is used nowhere | Warn |
| Untranslated keys per language | Report: coverage % per language, in the build log and the release notes |
| Text longer than `context.json` max length | Warn |

A browser test runs the whole app in a pseudo-language `qps`: every string wrapped in brackets and made 40 % longer. Any visible text without brackets is hard-coded; any clipped text is a layout bug. Screens are checked at 360 px wide.

### Translators work in a spreadsheet

`npm run i18n:export -- --lang gu` writes `ghoshnaad-gu.xlsx`: key, where it appears, max length, English, Marathi, Gujarati (empty or current). `npm run i18n:import ghoshnaad-gu.xlsx` reads it back, runs the checks, and reports what changed. Long content goes out as the `.md` files themselves. If volunteers grow, Weblate or Crowdin (both free for open-source projects) read the same JSON files.

### Fonts

Devanagari keeps the embedded Mukta subset. New scripts use system fonts through the `fonts` stack in `languages.json`; Android ships Noto for all major Indic scripts and iOS has its own. Embedding a second script would add about 80 KB per weight, so it is a per-language decision, not a default. Each new script is checked on the three sign-off phones before its status becomes `complete`.

### Migration steps

Each step leaves mr, hi and en output identical (the existing screen tests compare against v1.1.0), except step 5.

1. `format.ts` and `I18n` with unit tests (plurals in mr, hi, en, gu, ta; digits in each script; fallback chain).
2. Move the tables from `src/ui/i18n.loose.js` into the JSON files, turning each function string into a message.
3. Move each screen's text block into the JSON files, one screen per commit: player, list, composer, correction, library, export, sound check, घोषदंड.
4. Move guide and घोषदंड long texts into `src/content/<lang>/`.
5. Tala screen: move its Marathi text to keys and add Hindi and English (an approved text change).
6. Replace the `setLang()` chain with `onChange`; delete `Object.assign(I18N[l], …)` everywhere.
7. Add `i18n:check` and the `qps` test to `verify` and CI.
8. Add `i18n:export` and `i18n:import`.
9. Add name transliteration and cross-script search.
10. Add one pilot language end to end (D4), to prove that only data changed: the pull request should touch `languages.json`, its `.json`, its content files and its name overrides, and nothing in `src/` code.

## C. झल्लरी that sounds like hand-held cymbals

Today's झल्लरी is two bursts of filtered noise, which sounds like a drum-kit cymbal. It should sound like two brass plates clashed by hand: a double contact, a darker metallic body, a bloom and a long shimmering ring. Build it as a synthesized model now (no file size, no licence), behind an interface that can later take a recording of a real झल्लरी (D5).

### What it is now

`liveJhal` in `src/audio/drums.ts`: high-passed noise at 6.8 kHz for 0.6 s plus band-passed noise at 3.6 kHz for 0.22 s, pre-rendered as three 0.64 s clips. Callers cut it shorter: the player and the audio-diff test use `maxLen = max(0.2 s, 1.5 × stroke duration)`, and घोषदंड uses 0.5 s. The result has no metallic pitch content, no clash and no ring.

### What the instrument is

Ghosh Parichay (p. 15–16): a pair of round brass or bronze plates, 22 to 40 cm across or more, with a raised dome in the middle and a hand loop on the outside of the dome. It is played plate against plate; its sound is झंकार, written झ (p. 46). It plays on the same beats as the पणव's ध्वंकार, including in झपताल and रूपक (p. 51). Clash-cymbal players bring the edges together slightly apart in time, like a flam, so no air is trapped; holding the plates up lets them ring, and holding them close to the body shortens the ring ([Wikipedia](https://en.wikipedia.org/wiki/Clash_cymbals)).

### The sound to aim for

| Part of the sound | Time | What to hear | How to make it |
| --- | --- | --- | --- |
| Contact | 0–10 ms | Two edge hits 3–8 ms apart, then a short low "chuff" of air | Two 3 ms broadband clicks; noise low-passed at 300 Hz for 30 ms |
| Body | from 0 ms | Dense, inharmonic metal tone, strongest about 0.5–4 kHz; darker than a kit crash | 48 sine partials at irregular frequencies, spread on a log scale from 380 Hz (large plates) or 520 Hz (small) to 9 kHz, loudest around 1.5–3 kHz |
| Bloom | 0–150 ms | The tone brightens just after the hit | Each partial starts a little later the higher it is: 5 ms at the bottom to 120 ms at the top |
| Sizzle | 0–400 ms | Bright wash on top | Shared noise through three band-pass filters (1.2, 3.5 and 7 kHz) |
| Ring | to 1.5–3 s | Long shimmer with slow beating; high partials fade first | Per-partial decay, about 2.8 s at the bottom, shorter as frequency rises |
| Damped stroke | 150–300 ms | Plates pulled to the chest | Same stroke with a 60 ms fade after 200 ms |

A loud stroke (accent, and the loud झल्लरी + त्रिभुज at a चरण end) is louder and also brighter: about +4 dB above 3 kHz and a longer bloom.

### How to build it

- New file `src/audio/jhallari.ts` with `drawJhal(rig, out, { size, force, damped, seed })`. The tuning numbers above live in one exported table, so a change of sound is one edit.
- Use a seeded random generator, not `Math.random`, so every clip is the same on every device and in tests.
- Pre-render with the existing clip mechanism in `Drums.renderClips()`: 4 normal, 2 loud and 2 damped variants of 2.5 s each (about 3.8 MB of memory at 48 kHz). A stroke picks a variant at random, as now.
- Ring and choke: drop the hard `maxLen` cut for झल्लरी. A stroke rings until the next झल्लरी stroke starts, then fades over 60 ms (re-striking damps the plates). The last stroke of a piece rings out. Update the callers: player, घोषदंड (`tv()` uses 0.5 s today), sound check and the tala screen.
- Keep the overall level within ±1 dB of today's (RMS of an offline render of the same stroke pattern), so the balance with पणव and आनक does not move.
- Fallback when `OfflineAudioContext` is missing: a live recipe with 12 partials and the same contact and envelope.
- Start-up budget: rendering the 8 clips must not delay the first sound; render after `unlock()`, as now, and measure it on the OnePlus.

### Checks

- `audio-diff.spec.mjs`: every instrument except झल्लरी still equals v1.1.0 sample for sample; झल्लरी is compared with a newly approved recording of the new clips.
- Unit tests on each rendered clip: two onsets 3–8 ms apart; spectral centroid of the first 100 ms between 1.5 and 4 kHz; time to fall 60 dB between 1.2 and 3 s (damped: under 0.35 s); peak below −1 dBFS; identical output for the same seed.
- Listening check: a development-only switch in sound check plays old and new side by side. Three Ghosh members, at least one a झल्लरी player, rate it on the feedback sheet before release.
- Reference recording, if available: 5 normal, 5 loud and 5 damped strokes of a real झल्लरी, phone 1 m away in a quiet room, saved as WAV. Used to tune the table above by comparing spectra, and later as samples if D5 says so.

## Order of work and definition of done

1. **A1 and A2 first.** Nothing else merges while CI is red or the parity tests are missing.
2. **A3 to A13**, one commit each, each with its test.
3. **B, steps 1–9**, one step per commit, each with mr, hi and en output unchanged (step 5 excepted).
4. **C**, after B step 3, so the sound-check labels it touches are already keys.
5. **B step 10**, the pilot language, last: it proves the whole chain.

Done means, for each workstream:

- [ ] `npm run verify` green locally, CI green on Chromium, Firefox and WebKit
- [ ] `docs/MIGRATION.md` and `docs/ARCHITECTURE.md` updated for what moved
- [ ] Golden fixtures changed only where the change was approved (C: झल्लरी clips; B step 5: tala screen text)
- [ ] Device checks below ticked, with device, browser version and date

### Device checks (Samsung Galaxy, iPhone 13, OnePlus)

| Check | Phones | For |
| --- | --- | --- |
| Open the installed app on weak signal (one bar), and again offline | all three | A3, A4 |
| Open it within 10 minutes of a new release | all three | A4 |
| Silent switch on: play, take a call, resume; note whether lock-screen controls appear | iPhone 13 | A8 |
| Switch mr → hi → en → pilot language on every screen; nothing clipped or untranslated | all three | B |
| Pilot script renders correctly in the system font | all three | B |
| झल्लरी at लय 60, 120 and 140 on phone speaker and earphones; no crackle, ring does not smear into the next stroke | all three | C |

## Decisions

The agent works to the default in each row unless it is changed here before that step starts.

| # | Question | Default | Needed by |
| --- | --- | --- | --- |
| D1 | Which language translators work from | English as the reference, Marathi shown beside it | B step 1 |
| D2 | What shows when a translation is missing | The language's own fallback chain, ending in English | B step 1 |
| D3 | Notation in the user's script | No: swaras and bols stay in Devanagari as printed in the book; a script view can come later through the same transliteration | B step 9 |
| D4 | Pilot language | Gujarati (close to Devanagari, good system fonts); needs one volunteer translator | B step 10 |
| D5 | झल्लरी from synthesis or from a recording | Synthesis now; switch to recorded samples (about 120 KB) if a good recording of a real झल्लरी is supplied | C |
| D6 | Fonts for new scripts | System fonts; embed only if a sign-off phone shows boxes or broken conjuncts | B step 10 |
| D7 | When a partly translated language is shown | Listed as "beta" at 80 % or more; hidden below | B step 7 |

## Sources

- Ghosh Parichay (घोष परिचय): झल्लरी description pp. 15–16; ध्वन्याक्षर झ p. 46; झपताल and रूपक strokes p. 51
- [Wikipedia: Clash cymbals](https://en.wikipedia.org/wiki/Clash_cymbals): sizes, flam contact, how holding affects the ring
- [Sound On Sound: Synthesizing realistic cymbals](https://www.soundonsound.com/techniques/synthesizing-realistic-cymbals): cymbal spectra as dense inharmonic partials, separate envelopes for ping and tail
- Branch review of `epic/arch-redesign-oct26` at `3ab5831`, 27 Oct 2026 (section A)
