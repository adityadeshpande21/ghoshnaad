# Verification notes

All 120 rachanas in the three books (आनक, शंख, वंशी — 6th edition) were transcribed part by part from the page images and checked against them.

## How each rachana was checked

1. The printed lines of every part were cut out of the PDF pages as bands and read one by one.
2. Each part was written in the authoring format (`sources/*.ghosh.json`, format `ghosh-notation/1`), one printed line per line.
3. The compiler built the standalone file (`json/*.json`, format `ghosh/3`). Every warning had to be resolved: गण/गट matra counts, unknown symbols, unbalanced endings or slurs.
4. A verification sheet put each book line next to the transcribed line. Every sheet was compared by eye.
5. Every part was timed with the playback timeline. All parts of a rachana must last exactly the same time. `src/validate3.js` also checks that each charan pass lasts the same time in every part.
6. Each checked part carries `"status": "checked"` and a `checkedBy` line.

Result: 120 / 120 rachanas checked; all 121 compiled files pass `validate3.js`. The extra file is the anak प्राथमिक पाठ exercise, still marked draft.

## Reading conventions used throughout

- `सं` is written `स'`, a mandra dot as `प.`, and an underline (komal, or tivra for म) as `_`.
- Underlined groups are `[ ]` (one matra), `ऽ` is a hold, `–` is a rest.
- Slurs are `( )`, `^` is an accent, `!` is लयभंग (the arrow over a swara), and `<` / `>` are swell / decrescendo wedges.
- Endings are `{1 … :॥ }` / `{2 … ॥ }`; a right-aligned second-ending line in the book is the `{2 … }` block.
- Graces: the hooked त्र is `` `त्रत ``, the glyph त्त is `` `तत ``, and a small swara before another (म्ग) is `` `मग ``.
- Where one part writes a passage out in full and the other repeats it with `:॥`, the repeated part is written out in full. A note in that file says so.
- Where a charan mixes केरवा and खेमटा, it is written in केरवा with each खेमटा गत as one केरवा मात्रा (same timing), and a note says so.
- **प्रारंभिक:** in प्रचलन and मंद गति rachanas, the opening block printed once (no :॥, no endings) is the प्रारंभिक, whatever its length, and not a charan. Example: चेतक's two खेमटा lines, which the reference recording also plays once. In नैमित्तिक pieces, only a single opening line counts. The compiler marks it `type: "prarambhik"`, and charans are counted from the next one in a `no` field (प्रारंभिक, सेतु and closing tags have no number). 68 rachanas open with a प्रारंभिक.
- **पूर्ण रचना वादन (performance order):** रणन → प्रारंभिक (if any) → every charan as printed (:॥ = twice, a charan printed once is played once) → the first charan again, twice. This order is stored in `rhythm.performance`, and `buildTimeline3(piece, part, { order: 'performance' })` plays it. The printed order (`rhythm.form`) is unchanged.
- **रणन:** one line, eight steps: त्रऽऽ, ऽऽऽ, त – (twice). It is written in केरवा as `त्र ऽ | त – | त्र ऽ | त –` and in खेमटा as `त्रऽऽ , ऽऽऽ | त–– , –––` ×2. It is stored in `rhythm.prelude` (आनक and steps; every other part rests). This reading was confirmed by a ghosh player. It is added to the 75 rachanas that start in केरवा or खेमटा, and its pattern matches the opening drums of the चेतक and तिलककामोद recordings. The रणन for दादरा / मंदचाल (and for वीरश्री in एकताल and आरुणी in त्रिताल) is not available for now, so those 26 start straight with the प्रारंभिक or the first charan.
- **Reference recordings** (vijayavipanchi.org, चेतक शंख and तिलककामोद वंशी): laya about 123; every charan, repeat and ending sits where the files place them; the full performance order above matches both recordings. Measured Sa: शंख ≈ B4 (+40 cents), वंशी ≈ B4.
- The printed आरोहण/अवरोहण line is kept in `raga.aroha` / `raga.avaroha`.
- **ताल वाद्य (पणव, झल्लरी, त्रिभुज) are silent where the आनक has – or +.** These parts are written out from the tala (one stroke per step). On every beat where the आनक matra starts with – (rest) or + they rest instead (in pieces with no आनक, where the lead starts the matra with –). The rule is stored in each part's `rule.silentOn`. Confirmed by a ghosh player.

## Per-rachana notes (misprints, readings, structural choices)

- marudhar (shankh, line 7): "पऽप़" printed without the mandra dot on the first प (line 6 has प़ऽप़); kept as printed.
- dashmesh, deep, mangala, pratidhvani, jagannath, bajrang, ranjit, yadav, tarang (anak): second endings (²) are printed right-aligned on their own line; transcribed as {2 … ॥ }.
- ranjit, vinayak, yadav, bajrang (anak): the hooked त्र glyph (as in अजेय) is read as a त्र drag-grace into त: `त्रत.
- saket, bajrang: mixed tala, switched per charan with @tala.
- sagar (shankh): slur from the pickup –प़ into the next charan's स, and again at the end of its first line.
- bharat (anak, line 1): "त्त––" read as a त grace into त (`तत––). Line 9 last gan printed "त–– त––" without the comma.
- bharat (shankh): 8-gan दीर्घ यति charan (@yati=8) with the printed footnote; the anak plays 8 gans there.
- neelkanth (anak, line 1): first gan printed without a comma; the last gat is printed as a bracketed केरवा matra "–त्र" leading into the केरवा charan — written in खेमटा as "– [–त्र] ऽ" (same timing).
- ninad (anak, line 2): ends with ॥ in print, but the next line starts with | and ends :॥ — read as one charan (| used).
- trihut (anak, line 2): last two gans printed in खेमटा style inside a केरवा charan; each खेमटा gat written as one केरवा matra in [ ] (same timing). 2-gan yati charan in केरवा; last charan for अनुवादक only (footnote), its second ending runs over two lines.
- panchajanya (anak, last line): no | printed between the first and second gans; added.
- Vanshi pages: the printed आरोहण/अवरोहण line is stored in raga.aroha / raga.avaroha (सं = स').
- pahadi, valachi: the vanshi and anak print their क्रमभेद endings over different numbers of gans (e.g. vanshi 1 gan, anak 2 gans) — each part keeps its own split; the total length per pass is the same.
- valachi (anak): the second ending of charan 1 is printed with ¹ instead of ²; read as the second ending.
- bharatam, bhoop: earlier drafts checked against the page; no changes needed.
- hararanjani (anak): the 8-line second charan is printed as two 4-line blocks (॥ … ॥ ॥ … ॥); kept as one charan matching the vanshi.
- sharavati (vanshi): ^ over ध is an accent (ध^).
- kalyani (vanshi, second ending): printed "–नि़" with a single dash in a खेमटा gat; read as "––नि़" (3 matras), like the following "––स", "––री".
- prasad (anak): one "तत" printed without its underline; read as one matra [तत] (needed for the matra count).
- shankara, rajashri: second endings longer than first (4 gans vs 2) in both parts; slurs across bars kept as printed.
- badari: charan 4 starts with two गण in खेमटा writing and ends with two in केरवा (both parts); written in केरवा with each खेमटा gat as one matra (same timing). Vanshi charan 3: last ध of "धनि_ध" printed with a mandra dot; kept as printed.
- bangashri, kekavali: long slurs across bars kept as printed.
- gaud-malhar (anak): a small overline above one "–त" is not a notation mark; treated as a print artefact. Second endings are longer than first (vanshi 5 gans, anak 6 gans; totals match per pass).
- ramaranjani, vijaya: ^ accents kept per note (e.g. री^री^, ध^––).
- harikambhoji: vanshi endings are 4 gans each, anak endings 2 gans each; per-pass totals match.
- gunavant, govardhan: verified, no changes.
- ganesh: anak चरण ७ is printed as 8 lines :॥ while vanshi writes the same चरण out as 16 lines; the anak चरण is unrolled (written twice) so both parts line up. Vanshi c5 has no endings while anak c5 has ¹/²; both total the same.
- parijatam (vanshi): accents inside slurs (स'^ at slur end) kept; c4 accented स ग प ध are madhya saptak (no dot printed).
- parijatam (anak): थ्र strokes in c4.
- vishnupadi: vanshi opens with a one-gat pickup (रीऽम). चरण ५ mixes केरवा lines with one खेमटा line; the खेमटा line is written in केरवा with each गत as one मात्रा. The hooked त्र glyph with accent is read as `त्रत^.
- kalagati (anak): c1 last gat printed as a lone त, read as त––. Anak and vanshi split c3's endings differently (2 gans vs 1); the charan boundaries c3/c4 and c4/c5 fall mid-line in the anak print and are written as separate lines.
- vandemataram (vanshi): the small म before ग_ (म्ग_री) is a grace note: `मग_.
- madhavanitya, bhimpalas: verified, no changes.
- kaveri, varada, malayaprabha: verified, no changes. niranjan (anak): the त्त glyph is a `तत grace. dattatreya (shankh): two pickups (– – स, – – प.) printed right-aligned before charans 1 and 2.
- karnataki, velavali, shivaraj, kalingada, prashanti: verified, no changes.
- sharada, tunga, marva: verified, no changes.
- devadatta: the melody part is headed "वंशी-शंख". Vanshi writes charans 2–5 out in full while the anak repeats two charans with :॥, so each anak charan is written twice.
- indraprastha (vanshi): c2 ending ² printed as "स  नि.स" (2 matras); read as "स – नि.स", matching c3 ending ¹.
- todi (anak): a decrescendo hairpin over the last two gans of c1 is written त्र>.
- bageshri, kalyan, ketaki: verified, no changes.
- keshavashri: charan boundaries fall mid-line in the print; each charan starts on a new line here. Charan lengths 26/12/22/22/20/26 gans match in both parts.
- kalavati, asavari, samarpan: verified, no changes.
- keshav: anak c3 (2 lines :॥) is written out twice to match the vanshi's 4 written-out lines. Arrows over swaras (लयभंग) are written as `!`; the closing decrescendo as त्र>.
- aruni (त्रिताल): the anak's "त्र ऽ त – | ॐ | मंत्र | त्र ऽ त –" line sits between charans, while the vanshi has 4-gan endings ¹/² at the same spot on every pass. The anak line is placed as both endings so the parts stay aligned. The book's notes "चरण ३ और ५ … / ४ और ६ …" are expanded into charans 2–7. The excerpt draft has been replaced.
- naimittik: dhvajaropanam, swagat-pranam, pratyutprachalanam, prabodhan and deepnirvan-suchana (earlier drafts) were re-checked against the pages and marked checked. dhvajapranam, adya-sarsanghchalak-pranam (झपताल-२४०, 2+3), sarsanghchalak-pranam, sanghosh, sharirik/bauddhik-suchana, karyakram-prarambh/samapti, parivartan, bhojan-suchana (केरवा-१६०), jagaran, deepnirvan, sankat-suchana and dhvajavataranam (केरवा-१००) are new.
- Arrow over a swara (लयभंग) hides any tara dot. Each one is read as madhya स unless the page shows otherwise, which also matches the endings elsewhere in the same pieces; the earlier prabodhan/deepnirvan-suchana drafts used स' and were changed. A small > printed beside a swara is read as an accent (^); a long wedge over several matras is a decrescendo (>).
