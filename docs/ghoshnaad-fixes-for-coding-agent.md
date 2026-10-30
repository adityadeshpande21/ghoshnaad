# घोषनाद — Fixes and Feedback for the Coding Agent

Branch: `epic/arch-redesign-oct26` · Date: 29 Oct 2026
Source of findings: line-by-line check of the नैमित्तिक (19), शंख (34 + 5) and वंशी (42 + 20) rachanas against the book page images and the v1.1.0 data.

**Conventions**
- **Line** = line number within the part (शंख or वंशी), as the book prints it, counted from 1.
- **गण** = bar-separated group between `|` marks.
- **गत** = the half inside a गण, split by the comma.
- Source files: `books/<id>.ghosh.json`.
- **Open** = ready to implement. **Decision needed** = do not change until the owner answers.

---

## A. Ready to implement (Open)

### D2 — Allow `स.` in the शंख range
- File: `src/core/composer.ts`
- Change: add `'स.'` to `SHANKH_OK`.
- Found while checking दीपनिर्वाण सूचना, which uses `स.` in its last lines.

### D3 — Add the rachana checker to the repo
- New file: `tools/check-rachana.mts` (my working copy is `rcheck.mts`; run as `node check-rachana.mts <id>`).
- Requirements:
  - A crash must count as a failure, never a pass. Use `(g.gats ?? [])` guards.
  - Strip `#label` and `@directive` tokens before the printed-symbol round trip.
  - Strip quoted cue text before the round trip: `.replace(/"[^"]*"(:\d+)?/g, " ")`.
  - Text cues such as `"ॐ":4` hold several मात्रा. Sum `m.span ?? 1` per matra in the matra-count check and its error message, not the number of matras.
- Checks per rachana: source equals bundle source and v1.1.0 source; compiled output equals v1.1.0 and the bundle compiled file; printed-symbol round trip; matra counts; parts end together.

### D4 — त्रिहुट, शंख line 14
- Source: `trihut`
- Change: `(प [स)प.]` → ``(प `सप.)``
- Reason: the slur and the grace stroke are misplaced compared with the page.

### D6 — गणेश, प्रचलन वंशी, slurs ending one note early
- Source: `ganesh`, part `vanshi`
- Four slurs close before the bar line, while the book carries them across it.
- Lines 15 and 23 (identical text; apply the same change to both):
  - Before: `नि_ऽप) | मऽ– , (पऽम) | रीऽ(प , मऽरी) | सऽ–`
  - After: `नि_ऽप | म)ऽ– , (पऽम | री)ऽ(प , मऽरी | स)ऽ–`
- Line 26:
  - Before: `(मऽप) | नि_ऽ(म`
  - After: `(मऽप | नि_)ऽ(म`
- Test-compiled: no warnings, length unchanged at 160 s.
- Note: the `before` text above is the segment of each line that changes. Apply it to the full line without touching the rest.

### D8 — पारिजातम्, प्रचलन वंशी, line 1
- Source: `parijatam`
- Change: `[स'^–] [स'^–]` → `[स^–] [स^–]`
- Reason: the book prints madhya स with no तार dot.
- Test-compiled at 164 s.

### D9 — वन्देमातरम्, प्रचलन वंशी, line 11
- Source: `vandemataram`
- Change: `[(नि_ऽपम] [ग_)री]` → `[(नि_ऽपम] [ग_री)]`
- Reason: the slur ends one note early.
- Test-compiled at 72 s.

### D11 — आरुणी, मंद वंशी, last line
- Source: `aruni`
- Change: `| ऽ – – – ॥` → `| ऽ! – – – ॥`
- Reason: the book prints a second लयभंग arrow on the hold. It compiles as a fermata with no warnings and the length is unchanged at 428 s.

---

## B. Decision needed (do not change yet)

### D1 — दीपनिर्वाण सूचना, नैमित्तिक शंख
- Position: line 8, गण 2 (last, ending ॥), गत 2, final note.
- Current: `स>!`. Proposed: `स^!`.
- Question: the book appears to print an accent, not a fade. Owner to confirm which mark is meant.

### D5 — मरुधर, प्रचलन शंख
- Position: line 7, गण 3 (`प.सग , पऽप.`), गत 2, first note `प`.
- Current: madhya `प`, copied from the print. The same passage on line 6 is `प.ऽप.`.
- Question: is it a misprint for mandra `प.`? Confirm by ear. If yes: `पऽप.` → `प.ऽप.`.

### D7 — गणेश, प्रचलन वंशी
- Position: line 15, गण 1 (`प)ऽ(स' , नि_ऽप)`), गत 2, note `नि_`.
- The book prints shuddha `नि` here. The identical passage on line 23 prints komal `नि_`, and the source has komal in both.
- Recommendation: keep komal and add an entry to the rachana's `notes` about the print slip. Owner to confirm.

### D10 — तोड़ी, मंद वंशी
- Position: line 7, गण 1 (`म ध_ ध_`) and गण 2 (`म नि नि`), first note `म` in both.
- The book prints shuddha `म`, and the source copies it. तोड़ी uses only तीव्र म (`म_`).
- Question: is it a misprint? Confirm by ear. If yes: `म` → `म_` in both गण.

---

## C. App feedback (UI)

### E1 — Notation symbols are hard to see and often overlap on mobile
- Reported by the owner: on phones the notation symbols are not clearly visible and often overlap.
- Symbols to check first: octave dots (mandra `.` and तार `'`), komal underline (`_`), accent `^`, लयभंग arrow `!`, hairpins `<` / `>`, slur arcs `( )`, grace strokes, endings `{1 …}` / `{2 …}`, and long text cues such as `"ॐ":4`.
- Please:
  1. Reproduce at common phone widths (about 360–430 px, portrait), with the system font size at default and at large.
  2. Find which symbol pairs collide. Likely cases: dot over a note that also has an accent or arrow, slur arcs across a bar line, hairpin under a grace stroke, and dense खेमटा lines at 360.
  3. Fix with layout rules, not by shrinking. For example: a minimum glyph size, reserved vertical space for the marks above and below each note, spacing between गण, and wrapping a line at a गण boundary when the width is short.
  4. Add a visual regression check at phone width using a few dense rachanas, such as गणेश (वंशी lines 15–26) and आरुणी.
- No screenshots yet. The owner will supply them. Treat this as a feedback item to investigate, not a confirmed spec.

---

## D. Order of work
1. D2, D3 (tooling and the core allowlist).
2. D4, D6, D8, D9, D11 (source fixes, all test-compiled).
3. Add or update the golden fixtures for the changed rachanas.
4. D1, D5, D7, D10 after the owner's answers.
5. E1 (mobile rendering).
