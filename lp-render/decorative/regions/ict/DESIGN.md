# ICT (NIETE) design pack — grades 6–12 lesson plans

**Status: Phase 1, NOT partner-approved.** Tracked on Notion as FEAT-171. The look is
ICT's own production template (NIETE bot, `vendor/lp-v9`, template v9.3) re-expressed as
a skin over this renderer. It has not been reviewed by anyone at ICT/NIETE yet.

## Where the content comes from

Unlike Yemen and Kenya, ICT does not hand us prose. Its pipeline authors every lesson
as an **lp_doc** — typed JSON (schema 3.0, 16 block types, a support page) — and this
repo draws it through a fourth guide producer:

```
lp_doc ──► lp-render/guide/from-lpdoc.js ──► Guide {meta, sections, images:[]} ──► renderLessonImage
             │  toV3()          vendor/lp_doc_migrate.js    (ICT's migrate.js, verbatim)
             │  applyOverlay()  vendor/lp_doc_overlay.js    (ICT's Urdu toggle + LABELS, verbatim)
             │  questionIndex() vendor/lp_doc_questions.js  (ICT's ref resolver, verbatim)
             ▼
          report {notPrinted, unrendered, warnings}
```

No model is called and nothing is reworded. Every label is ICT's own string, English or
Urdu. `images` is always empty, so rendering an ICT lesson costs nothing.

```js
const { buildGuideFromLpDoc } = require('./lp-render/guide/from-lpdoc');
const { guide, report } = buildGuideFromLpDoc(lpDoc);            // English-medium
const { guide: ur } = buildGuideFromLpDoc(lpDoc, { lang: 'ur' }); // needs ur_overlay
const { pdf } = await renderLessonImage(guide, { log: console.log });
```

## Render an ICT lesson locally

No API key is needed and nothing is bought. An lp_doc has no generated art, and its diagrams are drawn in code.

```
npm install                                   # openchemlib + @fontsource/inter
npm run render:ict -- lp-render/fixtures/ict/niete_v9_gate_base.lp.json
#   -> out/ict/PK_G9_MATH_CH1_MATRIX_MULTIPLY.en.{pdf,png,guide.json,report.json}
#   --lang ur for a lesson with an Urdu overlay; --out <dir> to write elsewhere
```

In LP Studio (`npm run studio`, http://localhost:5178), paste an ICT lp_doc file as it is and
press Render. Studio detects it (`isLpDoc`), converts it with the ICT adapter, applies the ict
pack, and skips the 2-page passes that could call a paid model. No manual conversion is needed.

Real inputs, and where each came from: `lp-render/fixtures/ict/README.md`.

## ICT's paint rules this follows (and where they come from)

| Rule | ICT source |
|---|---|
| One outcome box; the verbatim SLO and objective list are not painted | bd-a8veu.3 |
| Warm-up is a row inside the Introduction, never its own section | spec §2 |
| Common mistakes print after Development; differentiation after the section carrying the practice | bd-a8veu.10 (flowHosts) |
| Model answers are never painted; homework answers are | bd-ir1aq |
| The FBISE exam bank prints for grade 9+ only | bd-a8veu.18 |
| Next period / not going today are not painted | bd-a8veu.20 |
| Support sections are lettered in emission order; an absent one consumes no letter | render-law 15 |
| Distractor codes sit in a teacher note, never inside an option | defect class D |
| An English-medium lesson is never printed under Urdu headings; a bad overlay refuses the whole lesson | OVERLAY_INVALID |

Every omission is written to `report.notPrinted`, so it is a recorded decision.

## Anatomy → classes

Each card carries `ict`, its stage (`ict-st ict-st-<introduction|development|activity|conclusion|homework>`,
or `ict-st-p2 ict-p2-<letter>` on the support pages) and its block role (`ict-r-<role>`):

| lp_doc block | Guide body | Role | Surface |
|---|---|---|---|
| ask (hook) | note | `hook` | navy — the loudest thing on page 1 (M3) |
| ask | note | `ask` | teach blue, navy start rule |
| watch_out | note | `watch` | terracotta |
| board | note | `board` | quiet grey |
| paragraph | text | `para` | no card |
| keywords | bullets | `keywords` | chips, not a list |
| key_points | bullets | `keypoints` | white |
| table | table | `table` | white (cells are plain text here) |
| worked_example / faded_example | note | `worked` / `faded` | amber / green, pill label |
| practice | bullets (numbered) | `practice` | pill label, answers green |
| support_extension | duo | `supext` | blue / green columns |
| split | **split** | `split` | ONE card, two columns |
| textbook_figure | note | `figure` | book reference (no crop yet) |
| diagram | images (ICT's engine → SVG) | `diagram` | the figure itself; placeholder only if the engine refuses the spec |
| latex / chem | math | `latex` / `chem` | green; chemistry via MathJax mhchem |

Palette (ICT v9.3 tokens): navy `#0B2545`, amber `#F2A20C`, leaf `#1F7A4D`; section bands
Introduction `#0F6A73`, Development `#0B2545`, Activity `#1F7A4D`, Conclusion `#584A93`,
Home work `#5b6472`; five surface roles teach / do / watch / note / quiet. Body text 18px at
794px (D4). Urdu: RTL, Nastaliq, unitless line-height 2.1 (R6).

## Shared renderer changes this pack needed

`regions/README.md` asks that anything CSS cannot express be agreed before it is built. These are
the additions, all generic and all inert unless a guide or pack asks for them. The A/B run
(main vs this branch, 82 inputs: 78 Yemen lessons, Kenya, Tanzania, 2 default) proves this: it
was identical 82/82 after Phase 1, and again after Phase 2.

| Where | Addition | Triggered only by |
|---|---|---|
| render.js | `section.cls`: extra class names beside `sec-<id>` | a guide that sets `cls` |
| render.js | `type: 'split'`: two columns of ordinary bodies inside ONE card; images inside it count as shown | a `split` section |
| png-to-pdf.js | `.d-split` counts as a figure (no cut inside it) | a `.d-split` element |
| png-to-pdf.js | `lp-grid-rows`: a card grid breaks between rows only | a section with that class |
| png-to-pdf.js | `lp-break-before`: a forced page break; pagination runs per span (one span = the old code exactly) | a section with that class |
| png-to-pdf.js | `PAGE_NUMBER_STYLE: 'foot-band'`: footer band, "page N of M", running head; always composed by Chromium | the ict pack |
| pipeline.js | an image that arrives with its own `dataUri` is used as given (no cache, no generation) | a guide image with `dataUri` |
| pipeline.js | band labels passed to the composer (`pageLabel`, `runTitle`, `continuedLabel`, `dir`) | read only by `foot-band` |

The split has to be one card because the composer only cuts pages at card edges. Two
side-by-side sections of different heights would hand it a cut through the taller one.

## Phase 2 (built 2026-09-29)

- **Diagrams.** ICT's production diagram engine (29 types) is vendored verbatim under
  `lp-render/guide/vendor/lp_diagrams/` (see its VENDORED.md). The adapter draws each spec to SVG
  and hands it to the pipeline as a finished image (`images[].dataUri`), so there's no cache,
  no generation and no cost. The engine draws the caption inside the figure. `molecule` needs
  `openchemlib` (npm, the `^9.7.0` range ICT pins). A spec the engine refuses becomes a
  labelled placeholder and goes into `report.unrendered`.
- **Page chrome.** `PAGE_NUMBER_STYLE: 'foot-band'` puts the locator plus "page N of M" in a
  footer band. Every later page gets a running head: the lesson title, plus "<section> ·
  continued" when the page opens partway through a section. Labels are ICT's own
  (`meta.pageLabel`, `meta.continuedLabel`), English or Urdu.
- **Support pages start on a fresh page.** A section marked `lp-break-before` is a forced break.
- **Card grids break between rows only.** A section marked `lp-grid-rows` covers mistakes,
  differentiation, the homework key and key words.
- **Inter** is embedded in this pack only; the shared font loader is untouched.
- **ﷺ** (U+FDFA) draws about 3.2em of ink in Nastaliq and hits the lines around it. A face
  covering only that one code point (bundled Naskh, size-adjust 85%) plays the role of ICT's 0.61em span.
- **Maths.** A long display formula becomes breakable `\displaystyle` inline maths. An inline
  matrix is promoted to display size (ICT's rule). TeX that doesn't parse is listed in
  `report.warnings` rather than rewritten. TeX inside a label is converted to Unicode
  (`$A^{-1}$` → A⁻¹, `\ce{H2O}` → H₂O) with ICT's own converter.
- **The page can't widen.** `html,body{overflow-x:hidden}`, and a formula row can't grow past
  its card. See the composer note below for why this matters.

Tested on ICT's 10 real authored lessons (the lp_author samples: G6 Islamiat ur, G7 Science,
G8 English, G9 Biology/Chemistry/Physics/Islamiat ur, G10 Maths/Urdu ur, G11 Chemistry) plus
the two samples. All render, all 28 diagrams draw, there are 0 overflow findings, and 0 images
are generated.

### Composer notes (shared code, found while building)

- `compose_pdf.py` is the composer's PRIMARY path whenever python3 has pillow + img2pdf. It
  knows none of: whole-card preference, page balancing, page styles (Yemen's `ar-bottom`
  band), forced breaks. ICT's page style is routed to the Chromium composer on every machine.
  **Yemen still takes the Python path wherever pillow is installed.** Iqra's decision.
- The composer draws the full-page screenshot at 794px wide. A page that overflows
  horizontally is therefore shrunk AS A WHOLE, and every cut point drifts. That is what cut
  a graph in half and printed the support header mid-page before the overflow was fixed.

## Still open

- **Page format.** ICT's delivery is a **phone page, 520×2000 px, one column** (v9.3). This
  renderer is A4-only. Iqra's decision.
- **Textbook crops.** `textbook_figure.src` points to a crop on ICT's side. It is printed as a book
  reference (as ICT prints a missing crop) until the crops are reachable.
- **Coaching offer line.** The WhatsApp number is redacted in the code mirror, so the CTA is withheld.
- **Circuit diagrams** use the engine's built-in drawing. ICT's high-fidelity path needs a Python
  `schemdraw` venv.
