---
title: Notation guide
intro: Every sign in the ghosh books' notation — how it looks in the app, how to type it in the editor, and how the app plays it.
head: Sign | Type | Meaning | How the app plays it
---

## read: Reading the notation

Each part (शंख / वंशी / आनक) has its own line; in the app the lines of one charan sit one under another, with a small line for the tala instruments below.

<b>Matra</b> = one unit of the tala (one beat). <b>Gan</b> = a group of matras (केरवा: 2). <b>Gat</b> = a sub-group inside a gan (खेमटा: 3 + 3). <b>Laya</b> = matras per minute (केरवा 120 = half a second per matra).

The gan being played lights up; tap a line to play from there.

```example
॥ॐ॥ स [ऽरी] | ग_ ग_ | प [ऽध] | [पग_] [रीस] |
Shivranjani, vanshi — first line: 4 gans × 2 matras
```

## form: Structure of a rachana

| sign | type | name | meaning | plays |
| --- | --- | --- | --- | --- |
| T:॥ॐ॥ | ॥ॐ॥ | Start | Beginning of the rachana. | — |
| T:॥ … ॥ | ॥ | Charan | The part between two ॥ is one charan. | On a charan's last step the पणव rests; झल्लरी and त्रिभुज play loud. |
| T:\| | \| | Gan | Line between gans. | — |
| T:, | , | Gat | Division inside a gan (खेमटा, झपताल, रूपक). | — |
| T::॥ | :॥ | Repeat | Play the charan twice. | Twice in Performance; once in "Once". |
| T:↪ अनागत | ॥ॐ॥ , ––प. ॥ | Pickup (अनागत) | Matras played just before the सम, printed as a short separate line before the charan (e.g. स्वागत प्रणाम, चेतक). | Right before the charan; in a Performance, on the last silent step of the रणन. Shown right-aligned above the charan. |
| T:¹ … ² | {1 … } {2 … } | First / second ending | First time the ¹ part, second time the ². Both endings are shown in the same columns, with a bracket above. | Such charans play twice even in "Once". |
| T:यति ४ | @yati=4 | Long pause | All parts rest for this many gans. | Silence; the पणव keeps the steps. |
| T:ॐ | "ॐ":4 | Spoken cue | ॐ / मंत्र etc. — for the matras written. | Silence (you say it). |
| T:प्रारंभिक | — | Opening | One line before the first charan, played once. | Once. |
| T:सेतु / ध्रुवपद | #… | Name | Name of a charan (सेतु = a bridge). | — |
| T:रणन | — | Ranan | One line of आनक before the rachana, eight steps: त्रऽऽ ऽऽऽ त – (twice). Also in केरवा before खेमटा rachanas. | At the start of a Performance; no पणव on steps 4 and 8. |
| T:* ? | * ? | Note / doubt | * = footnote in the book; ? = uncertain reading. | — |

> <b>Performance</b>: रणन → opening → every charan (twice where :॥) → the first charan twice again. <b>Book order</b>: as printed. <b>Once</b>: each charan once (twice if it has ¹/²), no रणन.

## swar: Swaras — शंख, वंशी and other melody instruments

| sign | type | name | meaning | plays |
| --- | --- | --- | --- | --- |
| N:स री ग म प ध नि | स री ग म प ध नि | Seven swaras | Middle octave. | शंख part: Sa = B♭4; वंशी part: Sa = F♯5 (change in Settings). |
| N:प. | प. | Lower octave | Dot below. | One octave down. |
| N:स' | स' | Upper octave | Dot above. | One octave up. |
| N:ग_ नि_ | ग_ नि_ | Komal | Line below: komal री ग ध नि. | A semitone lower. |
| N:म_ | म_ | Tivra म | Line below म = tivra. | A semitone higher. |
| N:स ऽ | ऽ | Hold | The previous swara continues. | Held on. |
| N:स – | – or - | Rest | Silence. | Silence. |
| N:[सरी] | [सरी] | In one matra | Bracket below = these swaras share one matra equally. | 2 swaras = half a matra each, 4 = a quarter. |
| N:(स री ग) | ( … ) | Nirantar (line above) | Swaras under a line above — e.g. सरीग joined — are played continuously, without a break. | No gap: each swara flows into the next; only the last one stops by the santar rule. |
| N:`मग | `मग | Grace note | A small swara very briefly at the start of the main one. | म on the beat for ~60 ms, then ग (length in Settings). |
| N:ग^ | ग^ | Accent (आघात) | Play with stress. | Sharper start, a little louder. |
| N:स! | स! | Hold (लयभंग) | लयभंग: hold the swara longer than written (often the last one). | Held into the silence after it — up to its own length, at most 2 matras. |
| N:प< ग> | < > | Grow / fade | Swell or fade the swara. | Volume rises / falls. |

> The <b>शंख</b> (bugle) can only play <b>प़ स़ स ग प</b> (and rarely नि_ स'); the editor warns on other swaras. <b>Santar</b> (default): each swara stops a little before its time; <b>Nirantar</b>: full length. For the वंशी part: flute, venu, clarinet, sax, melodica; for the शंख part: bugle, trumpet, melodica.

## anak: आनक (side drum) — bols

| sign | type | name | meaning | plays |
| --- | --- | --- | --- | --- |
| N:त | त | Tankar | One stroke of one stick. | One stroke. |
| N:त्र | त्र | Roll | Continuous strokes for one matra. | केरवा (and every other tala): 4 strokes per matra, each followed by a softer one. खेमटा: per matra 1 stroke + 2 softer, a light accent on the first matra of each gat. |
| N:`त्रत | त्र्त  (`त्रत) | त्र्त | Just before the main stroke, the other stick plays a stroke with its rebound (घोष परिचय p. 46). | त + rebound just before the beat, then त on the beat. |
| N:थ | थ | Both sticks | Both sticks together. | Strong double stroke. |
| N:थ्र | थ्र | Both sticks + rebound | Both sticks, then a bounce. | Strong stroke and a short roll. |
| N:+ | + | Stick click | Sticks struck together. | A click; the tala instruments rest on it. |
| N:[तत] [–त] | [तत] [–त] | Split matra | Two strokes in one matra / rest then stroke. | Half a matra each. |
| N:त ऽ – | ऽ – | Hold / rest | ऽ = the stroke rings on; – = silence. | — |
| N:`तत | `तत | Flam | A tiny stroke just before the main one. | A light stroke just before the beat. |
| N:त^ | त^ | Accent | With stress. | Louder stroke. |

## tal: Tala instruments — पणव, झल्लरी, त्रिभुज

These are not printed in the books; the app writes them from the tala. In the app each charan has a small "tala instruments" line below it.

| sign | type | name | meaning | plays |
| --- | --- | --- | --- | --- |
| N(tv):ध्व | — | पणव (bass drum) — ध्वंकार | On every step (also over आनक rests / यती). | Deep boom. |
| N(tv):ध्व^ | — | Sam | First matra of the tala. | A little louder. |
| N(tv):– | — | No पणव | Where the आनक has +; on a charan's last step; on रणन steps 4 and 8 (no झल्लरी or त्रिभुज there either). | पणव silent. |
| N(tv):झ^ | — | झल्लरी + त्रिभुज loud | On a charan's last step, where the पणव is silent. | Cymbals and triangle loud. |
| N(tv):ध्व ऽ ऽ | — | Matras between steps | खेमटा / दादरा: 3 matras per step. | — |

> झल्लरी (cymbals) and त्रिभुज play with every ध्वंकार. Shankh-only pieces (e.g. संघोष) have no ताल वाद्ये. Before playing comes the count "एक दो, एक दो" (दादरा: "एक दो तीन, एक दो तीन"); the रणन starts in that tempo. The two पणव strokes (ध्वंकार-द्वय) are for signals.

## steps: Steps — संचलन

The संचलन page lights the left / right foot and shows three lines: previous / now / next. Left foot first, on the सम.

<b>प्रचलन</b> (केरवा, खेमटा): march. <b>मंदचाल</b> (दादरा): slow march. झपताल and रूपक rachanas are played standing — no steps.

## talas: Talas

| Tala | Matras | Gans × matras | Gats | One step | Tala instruments |
| --- | --- | --- | --- | --- | --- |
| केरवा | 4 | 2 × 2 | — | 1 matra | every step |
| खेमटा | 12 | 2 × 6 | 3 + 3 | 3 matras | every gat (step) |
| दादरा | 6 | 2 × 3 | — | 3 matras (slow) | every gan |
| झपताल | 10 | 2 × 5 | 2 + 3 | standing | every gat |
| रूपक | 7 | 1 × 7 | 3 + 2 + 2 | standing | every gat |
| एकताल | 12 | 6 × 2 | — | 1 matra | every step |
| त्रिताल | 16 | 4 × 4 | — | 2 matras (slow) | every step |

> Laya = matras per minute. केरवा 120 and खेमटा 360 both give 120 steps a minute.

## play: Playing options

| sign | type | name | meaning | plays |
| --- | --- | --- | --- | --- |
| T:Performance | — | Real order | रणन → opening → charans → first charan twice. | — |
| T:Book order | — | As printed | No रणन, no closing repeat. | — |
| T:Once | — | Quick listen | Each charan once; twice if it has ¹/². | — |
| T:Loop ⟲ | — | Practise a charan | The current charan again and again. | — |
| T:Santar / Nirantar | — | Note length | Santar: a small gap between swaras; Nirantar: full. | — |
| T:B♭ … F♯ | — | Key | Sa for the शंख and वंशी parts set separately. | — |
