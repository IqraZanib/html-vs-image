# ICT (NIETE) Grades 1–5 fixtures

The three lesson plans NIETE approved as the Grades 1–5 design reference (lp_html v8.1, the phone
page), each written out as an `ict-primary-lesson` file so this repo can draw it.

NIETE's own Grades 1–5 lesson data is not reachable from here, so each file was **transcribed from
the approved PDF**, field by field, with nothing reworded. Each file's `source` says how, and lists
the reference's print defects that the file does not carry over (`presentation_fixes`).

| File | Lesson | How it was transcribed |
|---|---|---|
| `g1_ch9_Maths_seg1.lesson.json` | Grade 1 Maths, Ch.9 "Tick-Tock Time Travel" — Reading Time on Analogue & Digital Clocks (introduction), p.220, day 1 of 11 | from the PDF's own text layer |
| `g1_ch10_English_seg1.lesson.json` | Grade 1 English, Ch.10 "Pinky's Garden of Wonders!" — Predict + Word Blender + Using a Dictionary (Memory Lane), p.124, day 1 of 10 | from the PDF's own text layer |
| `g2_ch10_Urdu_seg2.lesson.json` | Grade 2 Urdu, Ch.10 «جھیل سیف الملوک کی سیر» — بلند خوانی، p.72, day 2 of 8 | by hand from the page images (the PDF's Urdu text layer is in visual order and cannot be copied cleanly) |

Three more lessons test the same page on other grades and other content. They are **not NIETE
lessons**: they were written for design testing from the public Punjab Textbook Board books (Single
National Curriculum 2020), with the textbook's own words kept word for word and the teaching steps
written around them in the approved structure.

| File | Lesson | From |
|---|---|---|
| `g3_u5_English_road_safety.lesson.json` | Grade 3 English, Unit 5 "Road Safety" — Road Safety Rules + road signs | PCTB English 3, pp. 47–50 |
| `g2_u1_Maths_ordinal_numbers.lesson.json` | Grade 2 Maths, Unit 1 "Whole Numbers" — Ordinal Numbers, first to twentieth | PCTB Mathematics 2, pp. 2–3 |
| `g4_l4_Urdu_achhe_shehri.lesson.json` | Grade 4 Urdu, سبق ۴ «ہم بنیں گے اچھے شہری» | PCTB Urdu 4, pp. 21–23 |

The approved PDFs are NIETE's, shared with the Design lane on 2026-10-01 (Google Drive file links,
not copied into this repo).

## What a file holds

The approved page's fields, in its order: `title`, `chapter`, `pages`, `period_minutes`, `day`,
`journey`, `coming_up`, `outcome`, `prepare`, `video`, `keywords`, `board`, then `stages`
(`opening`, `explanation`, `we_do`, `you_do`, `check`, `homework`, each with its `blocks`) and
`coaching`. A block or picture type the page cannot lay out is refused
(`lp-render/guide/from-primary.js`), so nothing is ever left off silently.

**Pictures** are named, never generated: `visual: {type, …}` on a board panel, a block or a
question, drawn in code by `lp-render/decorative/regions/ict/primary-art.js` from the lesson's own
words — `clock` / `clock_pair` (at the lesson's time), `tiles`, `blender`, `blender_list`,
`blend_steps` (the lesson's own steps, as a staircase), `predict`, `dictionary`, `poster` (a
textbook poster's lines, each with a small clock at its time), `scene` (`songbird`, `kite_tree`,
`lake`, `crying_boy`, `pair_reading`, `bunty_home` — at the lesson's `time` —, `bee_line`,
`park_family` — with its `sign` —, `zebra_crossing` — `signal: false` for none), `traffic_light`,
`road_signs` / `road_sign`, `look_steps`, `ordinal_row` (bees, or `object: 'child'`), `car_road`,
`podium`, `signboards`, `deeds` (a good-citizen chart), `story_map`, `tracker`. In a question a
clock, letter tiles or a road sign sits beside the question; any other picture goes under it. `hero_visual` is the small round picture on the title card. A board panel marked
`drawn: true` is printed as its picture (its `lines` are what the picture shows). `speakers` gives
each read-aloud speaker a kind of face (`girl_scarf`, `girl`, `boy`, `boy_cheeky`, `man_cap`,
`man_moustache`, `elder`, `woman`); a speaker not listed gets a plain face in its own colour.

In Urdu text, `⏸۱` is the textbook's reading-pause sign with its number; it prints as a pause chip.

## Render

```
npm run render:ict -- lp-render/fixtures/ict-primary/g1_ch9_Maths_seg1.lesson.json
#   -> out/ict/g1_ch9_Maths_seg1.en.{pdf,html,png,page-N.svg,guide.json,report.json}
```

No model is called and no image is generated: $0, no API key.
