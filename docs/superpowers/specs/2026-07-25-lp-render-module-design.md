# LP-Render Module — Design Spec

**Date:** 2026-07-25
**Status:** Approved (design), pending spec review
**Scope:** Sub-project **P1** of the "design-by-code lesson-plan render" initiative — the standalone renderer module only. R2 storage (P2), pipeline/flag wiring (P3), and the teacher feedback loop (P4) are **out of scope** and handled during integration.

---

## 1. Purpose

Produce lesson-plan visuals **entirely from code** — structured lesson JSON → HTML/CSS + hand-drawn SVG → **A4-paginated PDF buffer** — as a drop-in alternative to the paid Gamma render inside `rumi-platform`.

The deliverable is a **cleaned-up, standalone module** (not yet wired into rumi-platform). Once ready, a separate Notion ticket covers pipeline integration (P2–P4).

### Guardrails (hard requirements)

- **No Gamma** anywhere in this module.
- **No AI image model** (no DALL·E / Midjourney / nano-banana / diffusion) anywhere. Every visual is code: HTML/CSS + hand-authored inline SVG shapes, rendered by headless Chromium.
- **No hard-coded lesson content.** The module renders whatever lesson JSON it is given.
- **No Puppeteer.** Rendering uses Playwright, signature-identical to rumi's existing primitive.

> **Note on content vs. rendering:** This module only *renders* a lesson it is *given as JSON*. Producing that JSON (topic → content) is an upstream step owned by pipeline integration (P3). If that step uses an LLM, it is a **text** LLM, never an image model. Illustrations are always code.

---

## 2. Context (rumi-platform findings that shape this design)

- **Rendering primitive already exists:** `bot/shared/utils/html-to-pdf.js` exports `htmlToPdf(html, options) → Promise<Buffer>` using **Playwright** (`playwright-core`) + system Chromium, and awaits `document.fonts.ready` before `page.pdf()`. Our local renderer mirrors this signature so integration is a one-line import swap.
- **Worker contract:** `lesson-plan-generation.worker.js` expects a render step that yields a PDF, then `downloadPDF` → `WhatsAppService.sendDocument(to, filePath, filename, caption)`. Producing a **PDF buffer** keeps the worker unchanged.
- **No structured LP JSON schema exists today.** Production LP content is a freeform prompt (`lesson-plan-template.service.js`, a 9-section / 5E framework) fed to Gamma. **We define the schema** here, aligned to that 9-section/5E framework.
- **Conventions to match:** CommonJS (`require`/`module.exports`), class-of-statics or plain-function modules, lazy singletons, `kebab-case.<role>.js` filenames, tests under a mirrored path.

---

## 3. Public API

```js
// lp-render/index.js
renderLessonPlanPdf(lesson, { locale } = {}) → Promise<Buffer>  // validate → build HTML → htmlToPdf
buildLessonPlanHtml(lesson, { locale } = {}) → string           // pure, browser-free (the testable core)
validateLesson(lesson) → { ok: boolean, errors: string[] }
htmlToPdf(html, options = {}) → Promise<Buffer>                 // local Playwright renderer (mirrors rumi)
```

- `locale` defaults to `lesson.meta.locale`.
- `lesson` is **single-locale**: its text is already in the target language. The module lays out and sets direction/font; it **does not translate**. To produce en + ur, the caller invokes twice with two localized JSON objects.

---

## 4. Input schema (module input contract)

Flexible, **typed-sections** model aligned to the 9-section / 5E framework. The template renders whatever sections are present, in order.

```jsonc
{
  "meta": {
    "id": "113087",
    "subject": "English",
    "grade": "One",
    "locale": "en",              // en | ur | sd | ar
    "title": "Descriptive Sentences",
    "subtitle": "Writing with target words",   // optional
    "durationMin": 40,           // optional
    "classSize": 23,             // optional
    "type": "Comprehension (Word Meanings)"    // optional
  },
  "sections": [ /* ordered Section[] */ ]
}
```

**Section** is discriminated on `type`. Every section may carry `title?` (override) and `time?` (badge). Recognized types and their typed fields:

| `type` | 5E role | Fields |
|--------|---------|--------|
| `objectives` | Objectives | `items: [{ text, tag? }]` (e.g. tag `"Apply"`) |
| `materials` | Materials | `resources: [text]`, `targetWords?: [text]`, `note?: { title, body }` |
| `introduction` | Engage | `greeting?`, `stories: [{ label?, text, icon? }]` |
| `explore` | Explore | `body?`, `items?: [text]` |
| `explanation` | Explain | `wordWall?: [{ word, meaning, icon? }]`, `formula?: { parts: [{ label, value }] }`, `steps?: [{ label, body }]`, `cfu?: [{ q, a }]` |
| `guided_practice` | Elaborate | `task?`, `note?`, `samples?: [{ text, icon? }]`, `differentiation?: { struggling?, advanced? }` |
| `assessment` | Evaluate | `afl?: { instruction, items: [{ text, verdict: "up"\|"down" }] }`, `exitTicket?`, `homework?` |
| `differentiation` | Differentiation | `struggling?`, `advanced?` |
| `generic` | fallback | `body?`, `items?: [text]` |

- **Unknown `type` → `generic` renderer** (logs a warning, never crashes).
- All fields except `type` are optional; a renderer emits only what is present.
- `icon` fields reference a **name from the fixed icon library** (§7). Unknown icon name → no icon (fail-soft).

This one schema covers both the 113087 lesson (6 sections) and rumi's 9-section/5E framework.

---

## 5. Module layout (the lean deliverable)

```
lp-render/
  index.js                       # public API
  schema.js                      # schema constants + validateLesson()
  render/
    html-to-pdf.js               # Playwright htmlToPdf(html, opts) -> Buffer (mirrors rumi)
  template/
    build.js                     # buildLessonPlanHtml(lesson, { locale })
    shell.js                     # <head> CSS tokens, A4 @page + page-break rules, dir, base64 @font-face
    tokens.js                    # palette, type scale, section -> accent-colour map
    icons.js                     # SVG symbol library (section-type icons + named item icons)
    direction.js                 # locale -> { dir, fontFamily }
    sections/
      index.js                   # registry: type -> renderer
      objectives.js
      materials.js
      introduction.js
      explanation.js
      guided-practice.js
      assessment.js
      differentiation.js
      generic.js                 # fallback
  fonts/
    load.js                      # read @fontsource woff2 -> base64 @font-face CSS
  fixtures/
    lesson-113087.en.json        # 113087 re-expressed in the schema (parity proof + test input)
    lesson-113087.ur.json
  test/
    schema.test.js
    build.test.js
    render.smoke.test.js
  README.md
```

Each unit has one purpose and a clear interface: a section renderer is a pure `(section, ctx) → htmlString`; `build.js` composes; `html-to-pdf.js` is the only browser-touching file.

---

## 6. Data flow

`renderLessonPlanPdf(lesson, { locale })`:

1. `validateLesson(lesson)` → throw a clear `Error` listing missing/invalid fields if not `ok`.
2. `html = buildLessonPlanHtml(lesson, { locale })`
   - `direction.js` resolves `{ dir, fontFamily }` from locale.
   - `shell.js` wraps: base64 `@font-face`, tokens CSS, A4 `@page` + `break-inside: avoid`, `dir`.
   - header built from `meta` (title, subtitle, meta chips).
   - body = `sections.map(s => (registry[s.type] || generic)(s, ctx)).join('')`.
3. `pdf = await htmlToPdf(html, { pdfOptions: { format: 'A4', printBackground: true, margin } })`.
4. return `Buffer`.

`buildLessonPlanHtml` is pure (no browser) — the primary unit-test surface.

---

## 7. Rendering & fonts

- `render/html-to-pdf.js`: a Playwright clone of rumi's primitive — lazy browser singleton with launch-lock, `headless`, `--no-sandbox --disable-dev-shm-usage --disable-gpu`, `setContent(html)`, `await page.evaluate(() => document.fonts.ready)`, `page.pdf(mergedA4Options)`, plus `closeBrowser()`. Same exported signature as rumi's, so **at integration this file is deleted and rumi's `htmlToPdf` imported — zero caller change.**
- **Fonts embedded as base64 `@font-face`** in `shell.js` (Noto Nastaliq Urdu, Noto Naskh Arabic, Noto Sans, from `@fontsource`), so the HTML string is fully self-contained (no `file://` deps) and `document.fonts.ready` resolves — required for correct Nastaliq/Naskh rendering.
- **Dependency swap:** remove `puppeteer`; add `playwright-core` (matches rumi). `playwright-core` does not bundle a browser — see §9 testing caveat.

---

## 8. Visual system (topic-agnostic, colourful) — and what "dynamic" means

**Dynamic per lesson:** text, headings, section set/order, examples, language + RTL, colours, section badges — all data-driven from the JSON. Every teacher's lesson yields its own rendered PDF.

**Not per-topic bespoke art:** illustrations come from a **fixed, reusable SVG icon library** (`icons.js`), selected by **section type** (objectives→target, materials→toolbox, introduction→rocket/sun, explanation→lightbulb, guided_practice→pencil, assessment→checklist/thumbs, differentiation→ladder) or by an explicit **named `icon`** in the JSON (person, cake, family, heart, school, apple, star, book…). The module does **not** auto-draw new art to match arbitrary topics (that is unreliable — cf. the earlier apple→nuts mismatch).

- `tokens.js`: the sunny, kid-friendly palette as CSS custom properties; a section→accent-colour map; a type scale.
- Section renderers produce colour-coded headers (icon + title + optional time badge), cards, notes, a formula strip, word-wall grid, sample cards, AFL up/down rows — all generalised from the 113087 design but data-driven.
- A4 pagination via `break-inside: avoid` on section blocks so sections don't split awkwardly.

---

## 9. Testing (`node:test`)

- **`schema.test.js`** — valid lessons pass; malformed lessons (missing `meta`, bad section shape) return explicit errors.
- **`build.test.js`** — for each section type, `buildLessonPlanHtml` output contains the expected text/markers; `locale:'ur'` sets `dir="rtl"` and the Nastaliq font; **asserts the output has no `<img>` and no external/`data:image` URLs** (proves 100%-code, no Gamma/AI-image). Pure and fast.
- **`render.smoke.test.js`** — render a fixture and assert the buffer begins with `%PDF-` and is non-trivial in size. **Skips gracefully if no Chromium is resolvable.**
- **Fixtures** — `lesson-113087.{en,ur}.json` express the already-built 113087 lesson in the new schema, proving parity with what we shipped.

**Testing caveat (honest):** `playwright-core` ships no browser, so the `%PDF-` smoke test needs a resolvable system/available Chromium; where none exists the test skips (the pure `build.test.js` still fully covers HTML output). Locally we resolve the already-installed Chromium so a real PDF is produced and verified.

---

## 10. Error handling

- `validateLesson` returns `{ ok, errors[] }`; `renderLessonPlanPdf` throws an `Error` whose message names the offending fields — no vague failures.
- Unknown section `type` → `generic` renderer (warn, continue).
- Missing optional fields → render only what is present.
- `htmlToPdf` errors propagate to the caller (the rumi worker already owns retry/fallback).

---

## 11. Cleanup

Build `lp-render/`, then `git rm` the files not needed for the production module (all recoverable via git history):

- `src/benchmark.js`, `src/llmClient.js`, `src/models.js`, `src/generate.js`, `src/promptBuilder.js`, `src/gallery.js`, `src/testset.js`, `src/template.js`, `scripts/run-benchmark.js`
- `content-svg-agent/` (the generic auto-tool), `docs/comparison*.html`, `docs/COMPARISON.md`, `docs/RECOMMENDATION.md`, `references/`
- `index.html`, `lesson-*.html`, `lesson-descriptive-sentences.html`, `lesson-talking-words-original.html`, `scratch-*.js`, old `render.js`
- Fold `src/renderer.js` + `src/fonts.js` logic into `lp-render/render` + `lp-render/fonts`.

**Keep:** `lp-render/`, `@fontsource/*` deps, a trimmed `package.json` (`puppeteer`→`playwright-core`; scripts updated), README, this spec, and `docs/superpowers/`.

> The gallery PNGs already committed under `assets/generated/` and the published artifact are separate deliverables and are **not** removed by this cleanup.

---

## 12. Non-goals (explicit, for the integration ticket)

- R2 bucket/key setup (P2) — module returns a **buffer**; the caller uploads via rumi's `uploadLessonPlanBuffer(...)`.
- Feature-flag wiring in `content.service.js` (P3).
- Teacher feedback loop / Supabase rating table (P4) — net-new.
- Content generation (topic → JSON). The module consumes JSON; it does not generate content.
- Per-topic bespoke illustration generation.

---

## 13. Integration handoff (how P3 will consume this)

At integration, inside `content.service.js` (flag-gated branch): build/obtain the lesson JSON → `buildLessonPlanHtml` → rumi's `htmlToPdf` (delete our local copy) → `uploadLessonPlanBuffer` → return `{ gammaUrl, pdfUrl }`-shaped result so the worker (download → `sendDocument` → `storeLessonPlan` → `markCompleted`) is unchanged. The existing Gamma path stays fully intact and default.
