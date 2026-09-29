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
| diagram | note | `diagram` | placeholder (engine not vendored yet) |
| latex / chem | math | `latex` / `chem` | green; chemistry via MathJax mhchem |

Palette (ICT v9.3 tokens): navy `#0B2545`, amber `#F2A20C`, leaf `#1F7A4D`; section bands
Introduction `#0F6A73`, Development `#0B2545`, Activity `#1F7A4D`, Conclusion `#584A93`,
Home work `#5b6472`; five surface roles teach / do / watch / note / quiet. Body text 18px at
794px (D4). Urdu: RTL, Nastaliq, unitless line-height 2.1 (R6).

## The two renderer additions this pack needed

`regions/README.md` asks that anything CSS cannot express be negotiated before it is
built. Two additions were needed. Both are generic, and both are inert unless a guide
asks for them. The A/B run proves this: every Yemen, Kenya, Tanzania and default render
is byte-identical before and after.

1. **`section.cls`** (render.js): extra class names on a section, beside the existing
   `sec-<id>`. The ICT adapter needs two roles per card (stage and block).
2. **`type: 'split'`** (render.js), plus `.d-split` in the composer's figure query
   (png-to-pdf.js): two columns of ordinary bodies inside ONE card. It has to be one
   card because the composer only cuts pages at card edges. Two side-by-side sections of
   different heights would hand it a cut through the taller one. Inside the split, a
   list item's bottom in one column falls mid-card in the other, so the composer treats
   the split like an inline figure and never cuts inside it.

## Known gaps (Phase 2 on FEAT-171)

- **Page format.** ICT's delivery is now a **phone page, 520×2000 px, one column**
  (`PAGE_FORMATS.phone`, v9.3). A4 is kept but unused by ICT's delivery path. This
  renderer is A4-only. A pack-driven page size in the composer is a product decision.
- **Diagrams.** ICT's diagram engine (`vendor/lp-v9/diagrams`, needs openchemlib) is not
  vendored. Diagram blocks print a labelled placeholder and are listed in `report.unrendered`.
- **Textbook crops.** `textbook_figure.src` points to a crop on ICT's side. It is printed
  as a book reference (as ICT prints a missing crop) until the crops are reachable.
- **Running heads / forced breaks.** ICT repeats "<Section> · continued" at the top of a
  continuation page and starts the support pages on a fresh page. The composer has neither.
- **Page chrome.** ICT prints "page N of M" in a footer band. We use the composer's default
  top-corner "N / M" (`PAGE_NUMBER_STYLE: ''`).
- **Coaching offer line.** The WhatsApp number is redacted in the code mirror, so the CTA is
  withheld (listed in `report.unrendered`).
- **Fonts.** Inter is not bundled. English falls back to Noto Sans.
