# Architecture

## Which script does what

There are **two** renderers. Only the first is used by the current pipeline.

| Script | Status | What it does |
|---|---|---|
| **`scripts/render-lp-image.js`** | **Active** — everything runs through this | Content JSON → decorative lesson image (PDF + PNG). Thin CLI over `lp-render/pipeline.js`. The web interface (`lp-studio.js`) uses the same pipeline. Handles: skills, image generation + store, character cast, math (KaTeX/MathJax), raw-text structuring. |
| `scripts/render-lesson.js` | **Legacy** — not part of the current work | The original renderer using `lp-render/index.js` (`renderLessonPlanPdf`) with the old section template + `--images`/`--auto-images`/`--gen-images`. Untouched by recent features. Kept for reference. |

So: **the decorative pipeline, characters, store, math, structuring and LP Studio are all `render-lp-image.js` (via `lp-render/pipeline.js`).** `render-lesson.js` is a separate, older template.

## The pipeline (render-lp-image.js → lp-render/pipeline.js)

```
content JSON (or raw text → structured)
   │  reads lp-render/decorative/RULES.md FIRST (the skills)
   ▼
restore images from the shared store  ─┐ miss → generate via kie.ai (parallel),
   │                                    │        vision-gate, save to store
   ▼                                    ┘
ensure the character cast (generated once, cached, reused)
   ▼
renderDecorativeLesson → HTML + CSS + SVG (icons/motifs, KaTeX/MathJax)
   ▼
Playwright → PDF (final) + PNG (preview)
```

## Folder layout

```
lp-render/
  pipeline.js            orchestrator: skills → images → cast → render (PDF+PNG)
  structure.js           raw text / API-blob → strict content JSON (kie.ai GPT-5.2), chunked for any size
  decorative/            the current renderer
    RULES.md             the SKILLS — read first by the pipeline; drives the gate policy
    render.js            content JSON → decorative HTML (sections, characters, hierarchy)
    theme.js             design tokens + all CSS
    motifs.js            decorative SVG (stars, leaves, …) + header background
    characters.js        reusable character cast (generate once, gate, cache, reuse)
  math/math.js           formulas by code — KaTeX + MathJax; inline $…$; markdown cleanup
  store/assets.js        shared, prompt-keyed image store (reuse across lessons, no repeat credits)
  template/, fonts/, render/   shell, icons, base64 fonts, html→pdf (shared)
  images/, sections/     used by the LEGACY renderer only

imagegen/                content-aware image generation (kie.ai)
  index.js               resolveSegmentImages — classify → ladder → generate (parallel) → gate → cache
  classify.js route.js prompts/ kie/ quality_gate.js cache.js budget.js config/

scripts/
  render-lp-image.js     ACTIVE CLI
  lp-studio.js + .html   local web interface (paste content → PDF); saves every LP to the repo
  render-lesson.js       LEGACY CLI

assets/
  content/               input content JSONs
  generated/
    lessons/             every rendered LP (pdf + png + the content json used)  ← all LPs kept here
    cast/cast.json       the reusable character cast
    lp-images-cache/     per-lesson image cache (legacy of the store; store is the primary now)
  asset-store/           the shared image store (index.json + image files), committed so it travels with the repo

docs/
  ARCHITECTURE.md        this file
  image-model-benchmark.md   measured model cost/quality/speed + open-weight re-test
```

## Rumi integration — the Gamma replacement (`lp-render/adapter.js`)

In rumi's `lesson-plan-generation.worker.js`, Gamma today authors + renders and returns a
PDF *URL*. Under the sovereignty plan **rumi authors the lesson with its own LLM** and this
repo renders it — for Kenya (Kiswahili → Kenyan children), Yemen (Arabic → Yemeni children,
right-to-left in-image labels) and any other language. The whole swap is one call:

```js
// was: const pdfUrl = await gamma.createAndPoll({ inputText, exportAs: 'pdf', ... });
//      const pdf = await download(pdfUrl);
const { renderLessonPdf } = require('lp-render/adapter');
const { pdf } = await renderLessonPdf(authoredLessonText, { locale: 'sw', apiKey: KIE_API_KEY });
await whatsapp.sendDocument(pdf, ...);   // pdf is a Buffer — no URL, no download hop
```

- `input` may be raw authored text (structured via `structure.js`, needs a kie.ai key) or an
  already-structured content JSON (rendered directly, no key needed if its images are cached).
- `locale` lets rumi pin the language it already detected, so region + script + labels are right.
- Returns `{ pdf, png, contentId, locale, stats }` — `pdf`/`png` are Buffers.
- Everything else in rumi's flow (webhook, queue, intent, Supabase, WhatsApp delivery) is
  untouched; only the Gamma box is replaced.

**Deployment note:** the shared image store (`assets/asset-store/`) is a local folder. In a
multi-worker/container deploy, point it at shared object storage (R2/S3) so the cache — and its
credit savings — is shared across workers instead of re-generated per worker.

## Visual regression

`scripts/visual-regression.js` renders every fixture in `tests/visual/fixtures/`
(deterministically — images from the store, cached cast, no model calls) and
compares each PNG against a committed golden in `tests/visual/golden/`, pixel-for-pixel,
producing a match score.

- `npm run test:visual` — compare against goldens. Passes only if **every fixture
  matches ≥ 95%**.
- `npm run test:visual:update` — (re)write the goldens after an intended change.
- `npm run diff -- <old.png> <new.png>` — compare two images of the same content
  ("this version was like this — now it's like this"): prints a match score and writes
  a `[ OLD | NEW | CHANGES ]` composite that paints every changed pixel red.

**Workflow rule:** obvious layout defects (page padding/margins, a section clipping or
leaking across a page break, empty pages) are fixed first, then the visual score must be
**≥ 95%** before a render is shown to a human for feedback. A score below 95% means a
regression slipped in — fix it before asking.

## Skills, and how they are wired

`lp-render/decorative/RULES.md` is the single skills file (R1–R21 + a `GATE_POLICY`
block). The pipeline **reads it first on every run** (`readSkills` in `pipeline.js`):
it lists the rules it is applying and feeds `GATE_POLICY` to the vision quality gate.
Edit the rules there and the renderer's behaviour follows.
