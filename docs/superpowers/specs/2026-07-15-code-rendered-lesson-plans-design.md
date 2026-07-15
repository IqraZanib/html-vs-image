# Design: Code-Rendered Lesson-Plan Image Generator (POC)

**Date:** 2026-07-15
**Status:** Approved design — ready for implementation planning
**Author:** Zunaira Shahid + Claude

---

## 1. Problem & Goal

The organization currently generates lesson-plan (LP) images using commercial AI **image-generation** tools (e.g. "nano banana" = Google's Gemini image model). Two problems:

1. **Cost** — per-image generation is paid, and future price increases are a business risk.
2. **Text quality** — image models *paint* text as pixels, so non-Latin scripts (Urdu, Sindhi) come out with wrong spellings and broken letterforms.

**Goal:** Prove we can generate lesson-plan images from **code** (HTML/CSS/SVG rendered to PNG) that match the quality of nano-banana, at near-zero image cost, with correct multilingual text.

### Hard requirement (from stakeholder)

- **Code may be written by Claude** (a text/code LLM — any Claude model is acceptable).
- **The image itself must NOT come from any AI image model.** Images are produced purely by rendering the generated code in a headless browser (Puppeteer). No nano-banana, no image-generation API — anywhere in the pipeline.

The value story to the company: *"The image is rendered from our own code — no image-model cost. Claude only writes cheap text/layout code, and non-English text is always spelled correctly."*

---

## 2. Deliverables (2-day POC)

1. A **working tool**: prompt → lesson-plan PNG, using Claude to generate HTML/CSS/SVG, rendered locally.
2. A **simple web form** for teachers/testers: subject/grade/language/topic → Generate → preview + download.
3. A **benchmark report** comparing Claude model tiers (cost / latency / quality / reliability) and comparing the code-rendered approach vs nano-banana.
4. A **recommendation** doc for the company.

Out of scope for the POC: authentication, multi-user accounts, production deployment, persistent database, template library beyond the few-shot anchor.

---

## 3. Architecture

Pipeline (prompt → image):

```
Form input {subject, grade, language, topic, model?}
        │
        ▼
  promptBuilder ──► constrained system + user prompt (with few-shot anchor from index.html)
        │
        ▼
  llmClient.generate(model) ──► { html, tokensIn, tokensOut, latencyMs, costUsd }
        │
        ▼
  validateHtml(html) ──► { ok, issues[] }   ── if !ok, retry with feedback (max N)
        │
        ▼
  renderer(html) ──► PNG + { overflowed, dims }   ── if overflowed, retry (max N)
        │
        ▼
  output: PNG file + metadata (model, cost, latency, prompt)
        │
        ▼
  web: preview + download
```

A separate **benchmark harness** runs the golden test set across all configured Claude models, records metrics, renders all images into a gallery, and emits `results.json`.

### Components (each a small, independently testable unit)

| Component | Responsibility | Input → Output |
|-----------|----------------|----------------|
| `promptBuilder` | Build a tightly-constrained LLM prompt from structured input | `{subject, grade, lang, topic}` → prompt string(s) |
| `llmClient` | Call Claude, return generated HTML + usage metrics | `{model, prompt}` → `{html, tokensIn, tokensOut, latencyMs, costUsd}` |
| `validateHtml` | Reject broken output before rendering | `html` → `{ok, issues[]}` |
| `renderer` | Render HTML → PNG (extends existing `render.js`); wait for fonts; detect overflow | `html` → `{pngPath, overflowed, dims}` |
| `generate` | Orchestrate the full pipeline with retry loop | `input` → `{pngPath, metadata}` |
| `benchmark` | Run test set × models → results.json + image gallery | test set → report data |
| `web` | Minimal server: form → generate → preview/download | HTTP |

---

## 4. Quality control (the core risk)

Because Claude writes raw layout code each time, output quality varies. Five mechanisms control it:

1. **Strong system prompt** — hard constraints: A4 page dimensions, self-contained HTML only, no external `<img>`/network images, use inline SVG for illustrations, bundled fonts only, explicit RTL rules for Urdu/Sindhi, defined color/layout scheme.
2. **Few-shot anchor** — the existing `index.html` (the "پنکی کا دن" lesson plan) is passed into the prompt as the quality reference so Claude matches its bar. This is the single biggest quality lever.
3. **Validate + auto-retry** — `validateHtml` checks for: missing `<!DOCTYPE>`, external image/network references, empty/missing content, missing required structure. On failure, retry with the error fed back (max N retries, default 2).
4. **Post-render overflow detection** — after screenshotting, measure whether content overflowed the page bounds; if so, flag and retry (max N).
5. **Low reasoning effort / deterministic-ish settings** — use adaptive thinking with a low/medium effort for consistency and cost; keep prompts stable for prompt-cache reuse of the few-shot anchor.

---

## 5. Fonts & multilingual support ("all languages")

- Bundle fonts **locally** in the repo and reference them via `@font-face` (no Google Fonts / network dependency):
  - **Noto Nastaliq Urdu** — Urdu
  - **Noto Naskh Arabic** — Sindhi / Arabic (covers extra Sindhi characters)
  - **Noto Sans** — Latin + fallback
- The renderer waits for `document.fonts.ready` before screenshotting → no "tofu" boxes (□□□).
- Adding a new language later = drop in a font + one prompt line. This is the scalability story for "all languages".
- **Note:** the current `index.html` loads Nastaliq from Google Fonts. The POC will switch to a bundled local copy so rendering is offline-safe and deterministic.

---

## 6. Test cases

### 6.1 Functional tests (does the pipeline work?)

- `promptBuilder` produces the expected prompt for given input.
- `validateHtml` catches: missing DOCTYPE, external `<img>`/network URL, empty content, overflow markers.
- `renderer` produces a non-blank PNG of correct A4 dimensions and reports overflow correctly.
- `llmClient` returns the common shape and handles timeouts/errors gracefully.
- End-to-end: a sample prompt produces a valid, non-blank PNG.

### 6.2 Golden test set (quality benchmark)

Scope chosen by stakeholder: **languages Urdu + Sindhi; subjects including Math + Science** (plus language-arts lessons). Both languages stress RTL + Arabic-script fonts; Math/Science stress SVG diagrams.

| # | Subject | Language | Example prompt | Stresses |
|---|---------|----------|----------------|----------|
| 1 | Math | Urdu | Grade 2, addition up to 20 with pictures | RTL + counting visuals |
| 2 | Math | Sindhi | Grade 1, counting 1–10 | Sindhi script + numerals |
| 3 | Science | Urdu | Grade 3, parts of a plant (labelled diagram) | SVG diagram + labels |
| 4 | Science | Sindhi | Grade 2, living vs non-living things | Sindhi + categorization |
| 5 | Urdu (lang) | Urdu | Grade 1, alphabet alif–bay | Dense Nastaliq |
| 6 | Sindhi (lang) | Sindhi | Grade 1, Sindhi alphabet | Sindhi glyph coverage |
| 7 | Math | Urdu | **Edge:** Grade 5, long word problems | Overflow handling |
| 8 | Science | Sindhi | **Edge:** water cycle | Diagram-heavy |

(~8–12 prompts total; expandable.)

---

## 7. Benchmark & metrics

Models compared (Claude-only, per requirement). Current pricing (per 1M tokens):

| Model | Model ID | Input $/1M | Output $/1M |
|-------|----------|-----------|-------------|
| Claude Haiku 4.5 | `claude-haiku-4-5` | $1.00 | $5.00 |
| Claude Sonnet 5 | `claude-sonnet-5` | $3.00 ($2 intro to 2026-08-31) | $15.00 ($10 intro) |
| Claude Opus 4.8 | `claude-opus-4-8` | $5.00 | $25.00 |

Goal: **find the cheapest Claude model that clears the quality bar.** If Haiku passes, that's the strongest cost story.

For each (prompt × model), record:

- **Cost** — `(tokensIn × inPrice + tokensOut × outPrice)` → **$ per lesson**, next to nano-banana's per-image price.
- **Latency** — generation time + render time (ms).
- **Quality** — human-scored rubric, /10:
  - Content correct & complete (0–2)
  - Layout not broken / no overflow (0–2)
  - Language & script correct, RTL right (0–2)
  - Fonts render, no tofu boxes (0–2)
  - Visual appeal (0–2)
- **Reliability** — % passing validation on first try vs needing retry vs failing.

**Report output:** a summary table (Model | $/lesson | latency | quality /10 | reliability %) → recommendation, plus an HTML gallery showing every prompt's rendered output per model (pelican-bicycle-style grid), and a headline side-by-side vs nano-banana.

---

## 8. UI/UX

**Teacher web form** (minimal, clean, local):

- Fields: Subject ▾ · Grade ▾ · Language ▾ · Topic (text) · Model ▾ (for testing)
- **Generate** → spinner showing elapsed time → image preview → **Download PNG** / **Regenerate**
- Show `model · cost · time` under the result — quietly reinforces the value story on every generation.

**Benchmark report** = a static HTML gallery page (same idea as the pelican-bicycle repo): every prompt's output across all models in a grid, with the metrics table on top.

---

## 9. Tech stack

- **Node.js** (existing), **Puppeteer** (existing) for rendering.
- **@anthropic-ai/sdk** for Claude calls. Model default per call; use adaptive thinking with low/medium effort for cost.
- **Express** (or Node's built-in http) for the minimal web form.
- No database; outputs written to `out/` and `assets/` for the gallery.

### Model/API notes (from claude-api reference)

- Use exact model IDs: `claude-haiku-4-5`, `claude-sonnet-5`, `claude-opus-4-8`.
- Default `max_tokens` ~16000 non-streaming (a full lesson-plan HTML fits comfortably); stream if larger.
- Capture `response.usage` (`input_tokens`, `output_tokens`, cache fields) for accurate cost.
- Reuse a stable system prompt + few-shot anchor to benefit from prompt caching (cheaper repeated runs).

---

## 10. 2-Day roadmap

**Day 1 — Pipeline + quality**
- Block 1 (2h): Skeleton; turn `render.js` into a `renderer` module (font-ready wait, A4 sizing, overflow check); bundle local fonts.
- Block 2 (2h): `promptBuilder` + system prompt + few-shot from `index.html`; get one model (Sonnet 5) producing a good Urdu math lesson end-to-end.
- Block 3 (2h): `validateHtml` + retry loop; iterate the prompt until 2–3 prompts are reliably good.
- Block 4 (2h): `llmClient` adapter covering Haiku/Sonnet/Opus behind one interface; capture cost/latency.

**Day 2 — Benchmark + web + report**
- Block 5 (2h): Build golden test set; `benchmark` harness → `results.json` + image gallery.
- Block 6 (2h): Web form (generate → preview → download).
- Block 7 (2h): Human-score outputs via rubric; generate report (table + side-by-side vs nano-banana).
- Block 8 (2h): Buffer/polish + recommendation writeup.

**Scope-protection rule:** if time runs short, cut the web form to a bare-bones version and protect the benchmark — the benchmark is what convinces the company.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| LLM output quality varies | Few-shot anchor + validation + retry |
| Broken / overflowing layout | Post-render overflow detection + retry |
| Tofu boxes / wrong script | Bundle fonts locally, wait for font load, validate |
| **LLM weak at Sindhi content** | Test early; may need human content review — flag honestly, don't overclaim |
| 2-day scope creep | Web form stays minimal; benchmark is the priority deliverable |
| API keys | Requires an Anthropic API key (`ANTHROPIC_API_KEY` or `ant auth login`). No image-model keys needed. |

---

## 12. Success criteria

- At least one Claude model produces lesson-plan images across Urdu/Sindhi × Math/Science that score ≥ 8/10 on the rubric.
- Measured $/lesson is dramatically below nano-banana's per-image cost.
- Non-Latin text is spelled correctly in 100% of rendered outputs (the core advantage).
- A clear go/no-go recommendation with data.
