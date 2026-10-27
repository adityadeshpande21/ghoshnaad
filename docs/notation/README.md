# Ghosh notation

Notation, playback and band scores for the Shankh, Vanshi and Anak rachanas in *घोषतरंग* (6th edition, 2014).

## ghosh/3: one standalone file per rachana (what the app loads)

You write a short authoring file in book-like lines (`examples/*.ghosh.json`, format `ghosh-notation/1`). The compiler turns it into **one complete file** (`out/v3/<id>.json`) that needs nothing else: the talas it uses, the ताल वाद्य and कदम parts (written out note by note), the book's line layout and the sources are all inside.

```
node src/build3.js examples/*.ghosh.json     # -> out/v3/*.json
node src/validate3.js out/v3/*.json          # schema + cross checks
node player/assemble.js                      # -> player/ghosh-band.html (band score)
node player/export-pdf.js <id> <fontsDir>    # -> out/pdf/<id>-band-score.pdf
```

### Layers

```
<id>.json
 ├─ meta        title, section, raga (आरोह/अवरोह), verse and usage rule as printed, performance (march | mandchal | standing), transcriber notes
 ├─ rhythm      shared by every part
 │   ├─ talas       full definitions of the talas used (copied from data/talas.json)
 │   ├─ charans     c1, c2 … with repeat, tala, laya, segments (b = body, e1/e2 = क्रमभेद), role
 │   ├─ form        play order (charan ids)
 │   └─ countIn     "एक दो" on the पणव (ध्वंकार-द्वय)
 ├─ parts       printed: shankh | vanshi | anak      derived: panav | jhallari | tribhuj | steps
 │   └─ gans[]      { addr: "c1.b.0", charan, seg, line, short?, yati?, gats[] → matras[] → slots[] }
 │      pickups[]   { charan, matras[ { at: -1, … } ] }   (अनाघात: matras before सम)
 ├─ layout      lead part; book lines per part; band lines (lead lines + pickup lines); header
 ├─ provenance  book, page, edition, status per part (kept for checking, never printed)
 └─ media       reference recordings
```

**Parts line up by address, not by time.** A गण's address (`<charan>.<segment>.<index>`) is the same in every part, and so is a matra's (`<addr>.<i>`, or `<charan>.p.<at>` for a pickup). Every derived part has a गण at every address of the lead.

**Derived parts are written out.** `panav`, `jhallari`, `tribhuj` and `steps` come from each tala's rules (`rhythm.talas.<tala>.talVadya` and `.steps`) and carry `rule` with the confidence (`book`, `derived`, `assumed`). A ताल वाद्य hit is a `stroke` slot (`dhvam` ध्व, `jham` झ, `tam` ट); a step is a `step` slot with `foot`, and the matra carries `step: { foot, matras }`. Standing pieces (`"standing": true` in the authoring file, or a tala without steps) have no `steps` part. The Kerva पणव choice is an authoring option: `"options": { "talVadya": { "kerva": "gan" } }`.

**Book layout.** `layout.parts.<part>.lines` lists each printed line's गण addresses: a charan may start mid-line, a short closing tag joins the line before it, and a pickup has its own line (drawn above the end of the next line, before ॥). `layout.band.lines` is the lead's lines plus a pickup line wherever any part has a pickup.

**Playback.** `src/timeline3.js`: `buildTimeline3(piece, part, { tempo })` returns `beats` (one per matra, with `key`, beat number, सम/गण/गट flags, charan, pass, step) and `sounds` (one per sounding slot). All parts share one origin: the first सम comes after the longest first-charan pickup, so parts need no shifting. A pickup of a later charan overlaps the end of the charan before it.

### Tala library (`data/talas.json`)

Per tala: cycle, गण and गट sizes, counting (`१ २ ३ , ४ ५ , ६ ७`), roll strokes per matra, steps (matras per step, gait), ताल वाद्य beats per variant, and an explanation in Marathi, Hindi and English. Each rule has a confidence; see `docs/marching-steps.md` for the sources.

### Files

```
data/talas.json                     tala library (source for every compiled file)
schema/ghosh-3.schema.json          the standalone file
src/compile3.js                     authoring file -> ghosh/3
src/timeline3.js                    ghosh/3 part -> timed beats + sounds (no dependencies)
src/build3.js, src/validate3.js     CLI
out/v3/*.json                       13 compiled rachanas
player/band.html → ghosh-band.html  band score (reads ghosh/3)
player/export-pdf.js                A4 landscape PDF of a band score
```

---

## Earlier format: ghosh-notation/2


A JSON format for the Shankh, Vanshi and Anak rachanas in *घोषतरंग* (6th edition, 2014), built so an audio engine can play them by tala and beat.

## The tree

Every printed line is broken down to individual notes and strokes:

```
piece
└─ parts.{shankh | vanshi | anak}       one per instrument, same id → band mode
   ├─ tala   { name, key, laya, cycle, ganSize, gats, stepMatras }
   └─ charans[]                          चरण: repeat, label, laya/tala override, pickup, endings
      └─ lines[]                         one per printed line (keeps the shorthand in `src`)
         └─ gans[]                       गण  (or a दीर्घ यति block)
            └─ gats[]                    गट  (one gat when the book has no commas)
               └─ matras[]               मात्रा: beat number in the tala cycle (1 = सम)
                  └─ slots[]             one note / stroke / hold / rest
```

A real fragment, अजेय (Anak), charan 2, first गण. The book shows `त्रत  तत |`:

```json
{
  "gats": [{
    "matras": [
      { "beat": 1, "group": true, "slots": [
          { "type": "stroke", "dev": "त्र", "stroke": "roll" },
          { "type": "stroke", "dev": "त",   "stroke": "ta" } ] },
      { "beat": 2, "group": true, "slots": [
          { "type": "stroke", "dev": "त", "stroke": "ta" },
          { "type": "stroke", "dev": "त", "stroke": "ta" } ] }
    ]
  }]
}
```

And a Vanshi matra with a mandra note, a lyric and a slur:

```json
{ "beat": 3, "group": true, "lyric": "ध्व", "slots": [
    { "type": "note", "dev": "म", "swara": "M", "octave": 0, "slur": "start" },
    { "type": "note", "dev": "ग", "swara": "G", "octave": 0, "slur": "end" } ] }
```

## Timing rules (what the audio engine does)

| Rule | Detail |
|---|---|
| Matra length | `60 / laya` seconds. The laya comes from the charan's own `laya` if set, otherwise its `tala.laya`, otherwise the part's. |
| Slot length | The matra is shared among its slots by weight `w` (default 1, so equal shares). `[त–तत]` gives four ⅛-second slots at 120. |
| Cue cells | `span` matras of silence with text (ॐ, मंत्र). |
| `hold` (ऽ) | Lengthens the previous sounding slot. A held `roll` keeps rolling. |
| `rest` (–) | Silence; ends any held sound. |
| `yati` gan | `span` matras of silence (दीर्घ यति). |
| Repeats | A charan plays `repeat` times. On pass *n* it plays `lines`, then `endings[n]` (क्रमभेद). |
| Pickup | `pickup` matras play once, before the charan's first pass. |
| Order | Written order, or `part.form` (e.g. ध्रुवपद after every charan). |
| Clicks | Each matra's `beat` gives सम (1), the start of each गण and गट, and the marching step: `stepMatras` 1 for Kerva, 3 for Khemta. |
| Band | Parts are aligned on the first downbeat: `buildTimeline` returns `lead` (the pickup before the first सम), and the player delays each part by `max lead − own lead`. Lengths are compared from the first downbeat; `build.js` warns if they differ. |
| Short closing गण | A line marked `"partial": true` (e.g. स्वागतप्रणाम's `॥ स ऽ – ॥`) skips the गण-size check; the tree marks that gan `short: true`. |

**Sound rules:**

- **Pitch:** Sa × ratio(swara, `vikrit`) × 2^`octave`. Komal applies to R G D N; tivra to M.
- **`roll` (त्र) depends on the tala.** Kerva, Dadra, Ektal and Tritaal get 4 alternating bounced strokes per matra. Khemta, Jhaptal and Rupak get 1 stroke and 2 rebounds per matra.
- **Strokes:** `tha` is both sticks; `thra` is both sticks with a buzz; `click` is stick on stick.
- **Ornaments:** `accent` is louder; `swell` shapes the volume across the note; `slur` `mid`/`end` means no new attack; `grace` sounds just before the beat.

`src/timeline.js` implements all of this. It returns `beats` (one per matra: time, beat number, सम/गण/गट flags, L/R step, path) and `sounds` (one per sounding slot: time, duration, pitch or stroke, ornaments, path). `path` (`charan.b|e1|e2|p.line.gan.gat.matra.slot`) links each sound back to its cell, so the UI can highlight it.

## Authoring: type lines, compile to the tree

Nobody types the tree by hand. Transcribers write each line in a shorthand that looks like the book, and `src/compile.js` builds the tree, numbers the beats and checks the counts.

```json
"lines": [
  "॥ॐ॥ [त––त] [तत्र] | [त––त] [तत्र] | त त्र | त – ॥",
  { "t": "| ग ऽ [(मग)] | री ऽ स :॥", "lyrics": ["ते","","ध्व","जा","","य"] },
  { "t": "[–प.] ॥", "pickup": true }
]
```

**Core rule:** outside brackets, every symbol is one matra. A `[ … ]` group shares one matra (the book's underline bracket).

| Book | Type | Book | Type |
|---|---|---|---|
| स री ग म प ध नि | same | ऽ / – | `ऽ` / `–` |
| dot below / above | `स.` / `स'` | komal / tivra underline | `री_` / `म_` |
| त थ थ्र त्र + | same | ^ accent | `^` |
| → लयभंग | `!` | swell marks | `<` `>` `<>` |
| कण-स्वर / त्त | `` `प `` before the note | ⌒ slur | `( … )` |
| ॥ \| , | same | :॥ | `:॥` (`:॥x3`) |
| ¹ … :॥ / ² … ॥ | `{1 … :॥ }` / `{2 … ॥ }` | ॥ध्रुवपद॥, ॥१॥ | `#ध्रुवपद`, `#1` |
| superscript १०० | `@laya=100` | tala change | `@tala=केरवा-१२०` |
| \|—8—\| | `@yati=8` | ॐ in a गण | `"ॐ":4` |

Per-line extras: `pickup`, `lyrics` (one per matra), `hands` (`R L r l .` per slot), `label`, `type` (`prastav`/`dhruv`/`setu`), `players`, `note`.

## Scenarios covered

Each one is checked by an example in `examples/`:

- **Talas:** Kerva subdivisions; Khemta one-letter matras with गट; Jhaptal 2+3; Rupak 3+2+2; Dadra; Tritaal.
- **Charan structure:** multi-line repeats; ॥ and :॥ in the middle of a line; first and second endings starting mid-line; pickups; refrain plus numbered charans with a play order.
- **Time changes:** per-charan laya (१००); tala changes mid-piece; दीर्घ यति with a footnote; spoken cues.
- **Marks:** accents on held rolls; लयभंग and swells; slurs inside a matra and across matras and bars; grace strokes.
- **Pitch:** octaves, komal and tivra.
- **Text and teaching:** lyrics; a verse printed above the notation; usage rules; a raga with आरोह and अवरोह; lesson exercises with hand sticking.
- **Band pairs:** अजेय (Shankh + Anak, 104 matras each) and भूप (Vanshi + Anak, 96 matras each).

## Files

```
schema/ghosh-notation-2.schema.json   the tree (canonical, what the app loads)
schema/ghosh-notation-1.schema.json   the authoring shorthand file
src/compile.js                        shorthand → tree, beat numbers, गण/गट checks
src/timeline.js                       tree → timed beats + sounds for audio (no dependencies)
src/build.js                          CLI: node src/build.js examples/*.ghosh.json → out/v2/*.json
src/parser.js                         tokenizer shared by compile.js
player/ghosh-player.html              Web Audio player that plays the tree (band, click, loop, tap-to-start)
player/ghosh-band.html                band score: melody, आनक, ताल वाद्य and कदम on one matra grid (node player/assemble.js)
docs/marching-steps.md                where the feet fall in each tala and laya (base for ताल वाद्य)
examples/*.ghosh.json                 transcriptions (drafts)
out/v2/*.json                         compiled trees
```

## For the React Native app

- Load `out/v2/*.json`, run `buildTimeline(part, { tempo })`, and schedule `sounds` and `beats` with any precise audio scheduler (for example `react-native-audio-api`, which follows the Web Audio API, so the player's scheduling code ports almost directly).
- Swap the synthesised voices for recorded samples per swara and stroke. Nothing in the JSON changes.
- Any melodic part can be voiced by any melodic instrument. The player offers Shankh, Bugle, Trumpet, Saxophone (an octave lower), Venu, Madhurika (melodica) and Vamshi as playback choices, without changing the notation. Voices are a playback setting, not part of the JSON.
- For mic scoring, compare detected onsets or pitches against `sounds[].t` and `sounds[].swara/octave`.

## Open questions to confirm with a शिक्षक

1. Superscript १०० is read as laya 100 for that charan.
2. The ञ-shaped Anak glyph is read as a drag grace into त.
3. Dadra timing: the guide says ⅓ second per matra at 120, while the matras-per-minute rule gives ½.
4. Where the ध्रुवपद falls in प्रबोधन.
5. The roll realisation per tala and the swara tuning (just intonation, adjustable Sa).

All examples are `status: "draft"` until checked against the page images.
