# ICT (NIETE) design pack — grades 6–12 lesson plans

**Status: matched to ICT's production design, NOT yet reviewed by ICT/NIETE.** Tracked on Notion
as FEAT-171. Local validation only: nothing here is connected to NIETE-Rumi staging or production.

The reference is what ICT delivers to teachers today: NIETE-Rumi `bot/vendor/lp-v9`, template
**v9.3 "phone page"**, printed as the **v6 two-page PDF** the ICT operator approved on 2026-09-24
("keep it 2 pages, 1 page teaching, next page teacher support, dont mix it up" —
`lib/continuous.js`). The folder of approved PDFs on Drive could not be opened from this machine,
so the reference was made by running ICT's own renderer (the public NIETE-Rumi code) on the same
lessons, locally. The numbers below were then read back from ICT's rendered page with
`getComputedStyle`, not chosen.

## The page

| | ICT production (v9.3 + v6) | This pack |
|---|---|---|
| Page width | 520 px (`PAGE_FORMATS.phone`), 21 px margins | 520 px, 21 px margins |
| PDF | 2 pages: the lesson, then the teacher support, each as tall as its part | the same (`PAGE_LAYOUT.onePagePerPart`) |
| Printing | Chrome prints the HTML (vector, selectable text) | the same (`lp-render/render/part-pages-pdf.js`) |
| Footer | the locator on one line, "page N of M" under it, a hairline above | the same |
| Running head / "continued" | none (a part never breaks) | none |

The HTML page (`.html`) is the same 520 px column, so it reads the same in any browser.

## Type and surfaces (measured from ICT's page at 520 px)

| Element | Size / weight | Colour |
|---|---|---|
| Body text | 21 px / 400, line-height 1.55 (Urdu 2.05) | `#1a2233` |
| Card label | 16.33 px / 800, capitals, tracking .09em | the role's ink |
| Group label | the same, with a 3 px amber rule | `#13315C` |
| Hero | kicker 16.33/800 amber, title 33.25/800, locator 16.92 `#C9D4E6`, exam chip pill | navy `#0B2545` |
| Section bar | 36 px high, badge 20 px circle, name 20.42/800, minutes 18.08/800 | Introduction `#0F6A73`, Development `#0B2545`, Activity `#1F7A4D`, Conclusion `#584A93`, Home work `#5b6472` |
| Support bar | navy square badge 21 px, name 19.83/800 capitals, hairline after | navy |
| Resource rows | 19.25 px, one tinted row each: video amber, materials green, pacing blue, key words grey | ICT's five surface roles |
| Outcome | 21.58/600 on amber-soft with a 6 px amber edge; the promise under it 19.83/600 | `#3A2C0A` / `#6B5312` |
| Hook, checkpoint, SRQ, coaching | navy cards, amber label, white text | |
| Mistakes | one card each: terracotta "what pupils write" over green "you ask" | |
| MCQ | one card each: bold question, options as chips, the key green, the teacher note on amber | |
| Answers | bold green words, green maths (`\color{#1F7A4D}`) | `#1F7A4D` |
| Figures | ICT's badge (its own label table), 1.5 px frame, drawn at ICT's slot (below) | |

Figures use ICT's own sizing rule (`template.js figureSlot`). A figure is drawn as small as its
smallest label allows, and never wider than the 455 px drawing column; the floor there is 8.43 px.
The adapter bakes that size into each SVG with the diagram engine's own `requiredBox()`. So a
hundred-square board plan prints compact, and a mind map with small labels prints full width.

## Where the content comes from

ICT does not hand us prose. Its pipeline authors every lesson as an **lp_doc** — typed JSON
(schema 3.0, 16 block types, a support page) — and this repo draws it through its own producer:

```
lp_doc ──► lp-render/guide/from-lpdoc.js ──► Guide {meta, sections, images} ──► renderLessonImage
             │  toV3()          vendor/lp_doc_migrate.js     (ICT's migrate.js, verbatim)
             │  applyOverlay()  vendor/lp_doc_overlay.js     (ICT's Urdu toggle + LABELS, verbatim)
             │  questionIndex() vendor/lp_doc_questions.js   (ICT's ref resolver, verbatim)
             │  renderDiagram() vendor/lp_diagrams/          (ICT's diagram engine, verbatim)
             │  diagramLabel()  vendor/lp_diagram_labels.js  (ICT's figure badges, verbatim)
             ▼
          report {notPrinted, unrendered, warnings}
```

No model is called and nothing is reworded. Every label is ICT's own string, English or Urdu.
Diagrams are drawn in code, so rendering an ICT lesson costs nothing and needs no API key.

## Render an ICT lesson locally

```
npm install                                   # openchemlib + @fontsource/inter
npm run render:ict -- lp-render/fixtures/ict/niete_v9_gate_base.lp.json
#   -> out/ict/PK_G9_MATH_CH1_MATRIX_MULTIPLY.en.{pdf,html,png,guide.json,report.json}
#   --lang ur for a lesson with an Urdu overlay; --out <dir> to write elsewhere
```

In LP Studio (`npm run studio`), paste an ICT lp_doc as it is and press Render. Studio detects it
(`isLpDoc`), converts it, applies this pack and skips the 2-page passes that could call a paid model.

Real inputs, and where each came from: `lp-render/fixtures/ict/README.md`.

## ICT's paint rules this follows

| Rule | ICT source |
|---|---|
| One outcome box; the verbatim SLO and objective list are not painted | bd-a8veu.3 |
| Warm-up is a row inside the Introduction, never its own section | spec §2 |
| Common mistakes print after Development; differentiation after the section carrying the practice | bd-a8veu.10 (flowHosts) |
| Model answers are never painted; homework answers are | bd-ir1aq |
| The FBISE exam bank prints for grade 9+ only | bd-a8veu.18 |
| Next period / not going today are not painted | bd-a8veu.20 |
| The hero's chip is `board_weight` (what the topic is worth in the exam); none for grades 6–8; `lp_type` never printed | v9.3 hero |
| Support sections are lettered in emission order; an absent one consumes no letter | render-law 15 |
| Distractor codes sit in a teacher note, never inside an option | defect class D |
| An English-medium lesson is never printed under Urdu headings; a bad overlay refuses the whole lesson | OVERLAY_INVALID |

Every omission is written to `report.notPrinted`, so it is a recorded decision.

## Anatomy → classes

Each card carries `ict`, its stage (`ict-st ict-st-<introduction|development|activity|conclusion|homework>`,
or `ict-st-p2 ict-p2-<letter>` on the support page) and its block role (`ict-r-<role>`):

| lp_doc block | Guide body | Role |
|---|---|---|
| ask (hook) / ask | note | `hook` (navy) / `ask` (blue, navy edge) |
| watch_out / board | note | `watch` (terracotta) / `board` (grey, slate edge) |
| paragraph / key_points | text / bullets | `para` / `keypoints` (no card) |
| keywords | bullets | `keywords` (grey card, one white row per word) |
| worked_example / faded_example | note | `worked` / `faded` (amber / green, pill label) |
| practice | bullets (numbered) | `practice` (pill label, answers green, tier at the end) |
| support_extension | duo | `supext` (blue card over green card) |
| split | split | `split` (the figure above its points on the phone page) |
| textbook_figure | note | `figure` (book reference until the crops are reachable) |
| diagram | images (ICT's engine → SVG) | `diagram` (badge + figure at ICT's slot) |
| latex / chem | math | `latex` / `chem` (green; chemistry via MathJax mhchem) |
| page2 mistakes / MCQ / SRQ / ERQ / homework key | qa / split / note+bullets / split / bullets | `mistakes` / `mcq` / `srq`+`srqms` / `erq` / `hwkey` |

## Shared renderer changes this pack needed

`regions/README.md` asks that anything CSS cannot express be agreed before it is built. All of these
are generic and inert unless a guide or pack asks for them. The A/B run (main vs this branch, 82
inputs: 78 Yemen lessons, Kenya, Tanzania, 2 default) is identical 82/82 after every round.

| Where | Addition | Triggered only by |
|---|---|---|
| render.js | `section.cls`: extra class names beside `sec-<id>` | a guide that sets `cls` |
| render.js | `type: 'split'`: several bodies inside ONE card; images inside it count as shown | a `split` section |
| pipeline.js | an image that arrives with its own `dataUri` is used as given (no cache, no generation) | a guide image with `dataUri` |
| pipeline.js | a pack's `PAGE_LAYOUT` sends the PDF to the part printer and sizes the preview to its width | the ict pack only |
| render/part-pages-pdf.js | NEW: one page per part, printed by Chrome, footer per part | `PAGE_LAYOUT.onePagePerPart` |
| png-to-pdf.js | `.d-split` as a figure, `lp-grid-rows`, `lp-break-before`, `foot-band` | those classes / that page style (A4 only; the ict pack no longer uses them) |

The A4 additions in `png-to-pdf.js` stay: they are what an A4 printable ICT variant would use
(ICT keeps its own `PAGE_FORMATS.a4` for the same reason), and they change nothing for other regions.

## Still open

- **The approved PDFs on Drive.** Not readable from this machine (shared with the domain, but the
  folder cannot be listed by the tools here). Once they can be opened, a side-by-side against them
  closes any gap between "what ICT's code prints today" and "what was approved".
- **Textbook crops.** `textbook_figure.src` points to a crop on ICT's side. Printed as a book
  reference (as ICT prints a missing crop) until the crops are reachable.
- **Coaching offer line.** The WhatsApp number is redacted in the public code, so the three-step
  "record, send, get tips" line is withheld rather than printed with a placeholder.
- **Circuit diagrams** use the engine's built-in drawing; ICT's high-fidelity path needs a Python
  `schemdraw` venv.
- **Small differences, listed with the renders:** the hero prints "40 min" in regular weight (ICT
  bolds it); the correct MCQ option carries no ✓ (as ICT); ﷺ is drawn by a compact Naskh face.
