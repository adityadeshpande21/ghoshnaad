# Translating Ghoshnaad

Ghoshnaad shows its screens in Marathi, Hindi and English. A new language is added by data only: no code changes. This page is for the people who translate and for whoever merges their work.

## What is translated, and where it lives

| What | Where | How you work on it |
| --- | --- | --- |
| Screen text: buttons, labels, messages | `src/i18n/<code>.json` (about 600 texts) | A spreadsheet (below) |
| Long content: the notation guide, the घोषदंड signal words | `src/content/<code>/guide.md`, `ghoshdand.md` | Edit the Markdown files; copy `src/content/en/` as a start |
| Names of rachanas, ragas and talas | Made at run time from the Devanagari names (`src/i18n/names.ts`: each letter moves to its place in the other script; Tamil has its own rules); corrections go in `rules/names/<script>.json`, written as `{ "केरवा": "the name in that script" }` | Only where a name comes out wrong |
| Notation (swaras, bols, ऽ, –) | Not translated: it is printed as in the book | — |

## The spreadsheet

1. Someone with the repository runs `npm run i18n:export -- --lang gu`. This writes `ghoshnaad-gu.xlsx` (the language must already be in `src/i18n/languages.json`).
2. The translator opens it in Excel, LibreOffice or Google Sheets and fills the last column. The other columns are there to help: **where it appears** (the screen), **blanks** (what each `{name}` stands for), **max length**, and the English and Marathi texts.
3. The maintainer runs `npm run i18n:import -- ghoshnaad-gu.xlsx`. Valid rows are written to `src/i18n/gu.json`. Rows that cannot be used are listed with their row number and left out; nothing else is lost. `--dry-run` shows what would change without writing.

Rules for a text:

- Keep every `{blank}` exactly as written, and in plurals keep the argument: `{n, plural, one {# rachana} other {# rachanas}}`. Your language may need other plural words (`one`, `few`, `many`, …), but `other` is always required and `#` stands for the number.
- `{f, select, L {Left} R {Right} other {}}` keeps its words before the braces (`L`, `R`, `other`); translate only what is inside the braces.
- Only `<b>…</b>` and `<code>…</code>` are allowed as markup. A line break is a line break in the cell.
- A few texts begin with a space on purpose (for example ` (again)`); keep it.
- Do not translate `ॐ`, ॥, swaras or bols.
- Prefer the length of the English text; the spreadsheet gives the most for the few places that are tight.

## Checks

`npm run i18n:check` (also part of `npm run verify` and of the release) fails when a text has other blanks than English, contains anything but a plain message, or a language lacks its file, fonts or fallback; it warns about unused texts and prints the coverage of each language. A browser test runs the whole app in a pseudo-language (every text in brackets and 40 % longer) at 360 px wide, to find text that is written into the code or does not fit.

## Adding a language

1. Add an entry to `src/i18n/languages.json`: `code`, `name` (in its own script), `script`, `digits`, `names` (`native` or `roman`), `fallback` (languages tried when a text is missing, ending in `en`), `fonts`, and `status` (`beta` until the three sign-off phones show it correctly, then `complete`).
2. Create the language file (`npm run i18n:export` then `import`, or copy `en.json`) and, if you translate the long content, `src/content/<code>/`.
3. Run `npm run verify`.

Nothing in the code lists the languages: the build reads `languages.json` and picks up `src/i18n/<code>.json`, `src/content/<code>/*.md` and `rules/names/<script>.json` by itself (`build/lib/languages.mjs`). Search finds a rachana by its Devanagari name, its roman name and its name in the language's own script.

A language with missing texts still works: each missing text is shown in the first language of its fallback list that has it.
