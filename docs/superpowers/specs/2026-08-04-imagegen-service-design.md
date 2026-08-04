# Design — Content-Aware Image-Generation Service (`imagegen`)

**Date:** 2026-08-04
**Status:** Approved design (pre-implementation)
**For:** RUMI lesson-plan rendering (Gamma → HTML+Puppeteer migration). Built here as a standalone,
drop-in module; wiring into rumi's `content.service.js` is documented, not performed.

## 0. The core insight (from the V7 NanoBanana-Pro vs HTML-render reference)

The side-by-side reference (`v7-vs-html.pdf`, same enriched-content JSON, 55 slides across Maths/English)
shows one decisive thing:

- **The HTML render already wins for ~90% of every lesson** — place-value charts, vowel tables, worked
  examples, poems, journey lists, exit tickets, all text — accurate, complete, editable, cheap. This
  content must **stay HTML** (it is more accurate than any generated image and carries no per-image cost).
- **NanoBanana Pro is clearly better in exactly one place: the HOOK STORY scene** — a warm,
  culturally-grounded illustration of the lesson's two named characters (Bilal + Abbu on a train; Ali +
  Sara on the ABC-Express; Hamid + Ammi on a rooftop). In the HTML render these hook scenes exist but are
  weaker, and the dialogue characters are flat clip-art rather than consistent illustrated characters.

**Therefore the image-gen service is NOT a general lesson-image generator.** Its real job is narrow and
high-value: **generate the HOOK STORY scene well, cheaply, with consistent culturally-grounded characters —
and correctly decide that almost everything else needs no generated image at all** (structured → HTML,
icons → SVG).

## 1. Scope

**In scope (this module):** content-type classifier, kie.ai multi-model client, prompt-template system,
character/region layer, VLM quality-gate, cache, budget guard, public entrypoint, CLI test harness, unit
tests, module README.

**Out of scope:** rumi's webhook/queue/WhatsApp/Supabase/intent layers; the Gamma code (left in place);
actual per-region content/headings (provided later); wiring into `content.service.js` (documented as an
integration contract only — that repo is not present here).

## 2. Realities / verified facts

- **Repo:** rumi-platform is not this repo. Build `imagegen/` as a standalone module in this repo (the
  lp-render staging ground); it depends only on `.env` + kie.ai, not on rumi internals.
- **kie.ai:** `KIE_API_KEY` present in `.env` and verified working (~8600 credits). Base
  `https://api.kie.ai/api/v1`, Bearer auth. **Image-gen is async** (`jobs/createTask` → poll
  `jobs/recordInfo`, states `waiting/queuing/generating/success/fail`; result URLs in
  `data.resultJson.resultUrls[]`, expire ~24h). **GPT-5.x chat/vision is sync**
  (`/gpt-5-2/v1/chat/completions`) — used for the quality gate.
- **Model data:** `docs/image-model-benchmark.md` — real measured credits over 18 models. Cost is read
  live per call from `recordInfo.creditsConsumed`; no price table is hardcoded.
- **Deterministic fallback path already exists:** `lp-render` (SVG icons, `place_value`, `resolveImages`
  → Openverse) is the HTML/CSS/SVG/stock fallback the brief refers to.

## 3. Input contract — the segment schema

Derived from the reference paths (`subject/grade_N/chapter_NN/seg_N_type`) and the six fixed slide types.
This is a provisional schema (alignable to rumi's real enriched-content later); the classifier keys off
block labels, so exact field names can shift without changing routing.

```jsonc
{
  "path": "english/grade_1/chapter_01/seg_1_pre_reading",
  "subject": "English", "grade": "1", "chapter": "01",
  "topic": "Getting Started & Letter Sounds",
  "segmentType": "HOOK_AND_BOARD_WORK",   // TODAY_AT_A_GLANCE | HOOK_AND_BOARD_WORK | HOW_IT_WORKS
                                          // | PRACTICE_TOGETHER | ON_YOUR_OWN | BEFORE_YOU_GO
  "region": "pk", "language": "en",
  "blocks": [
    { "type": "HOOK_STORY", "text": "Ali and Sara are on the ABC-Express…",
      "characters": [ { "name": "Ali", "role": "student, boy" }, { "name": "Sara", "role": "student, girl" } ] },
    { "type": "BOARD_WORK", "text": "Draw 4 picture boxes: cat /k/, hen /h/…" }
  ]
}
```

The service operates at the **block** level. Public entrypoint:

```
async resolveSegmentImages(segment, opts) → {
  images: [ { blockType, category, needsImage, model|null, asset|null, reason, creditsConsumed? } ],
  report
}
```
`asset` is `{ url, dataUri?, width, height, provider, model }` or `null`. The HTML template layer reads
`images[]` and drops each `asset` into an `<img>`; blocks with `needsImage:false` are rendered by the
existing HTML/SVG path.

## 4. Module structure (Deliverable #1)

```
imagegen/
  index.js              → resolveSegmentImages(segment, opts) + generateImage()  (public API)
  classify.js           → block → { category, needsImage, reason }               (pure, rule-based)
  route.js              → category → { strategy, model, ladder[] }               (reads config)
  config/
    models.config.js    → category → primary + escalation ladder + notes (from benchmark)
    budget.config.js    → per-run / per-day credit ceiling
  prompts/
    scaffold.js         → shared structural scaffold (style, quality, negative prompts)
    templates/
      decorative_scene.<subject>.js   → per (category, subject) template DATA
      labeled_diagram.<subject>.js
    regions/
      pk.js, default.js → region visual context (dress, setting, names, palette)
    build.js            → resolvePrompt(category, subject, block, region) → string
  characters.js         → per-lesson character spec + stable seed (consistency)
  kie/
    client.js           → single kie.ai HTTP client: createTask → poll recordInfo,
                          retry+backoff, error-normalize, cost-log; injectable fetch
    generate.js         → generateImage({ model, prompt, params }) → { url, dataUri, credits }
  quality_gate.js       → VLM (GPT-5.2 vision) compliance check → { pass, reason }
  cache.js              → hash(category, prompt, model) → asset (pluggable; fs default)
  budget.js             → spend counter guard (throws before exceeding ceiling)
  cli.js                → prints category/model/prompt per fixture; --live gens + saves + scores
  README.md
  test/                 → classify + prompt-build unit tests (pure, no API); opt-in live test
  fixtures/             → decorative_scene, labeled_diagram (or structured), no-image
```

Each unit is separately testable; no god-file; no inline model/prompt magic strings (all in `config/` and
`prompts/`).

## 5. Content-type classifier (§3.1)

Rule-based, pure. Input = a block (+ segment context). Output = `{ category, needsImage, reason }`.

| Signal (block type / content) | Category | needsImage |
|---|---|---|
| `HOOK_STORY` (character scene, story, dialogue) | `decorative_scene` | **true** — the primary use |
| Realistic labeled diagram (water cycle, digestive, human body) — Science, imagery-heavy | `labeled_diagram` | true (rare; VLM-gated) |
| `BOARD_WORK` charts/tables, worked examples, place-value, poems, exit tickets, journey lists | `structured` | **false** → HTML (lp-render) |
| single object/motif (cat, textbook, chalk-and-board) | `icon_or_motif` | **false** → SVG/emoji |
| unrecognised block | `unknown` | false + **flag** (never silently bucket) |

Rationale for `structured` = no-image: the reference proves HTML renders these more accurately than a
generated image, at zero per-image cost. The classifier is explicitly allowed (and expected) to say "no AI
image here" for most blocks.

## 6. Model routing + escalation ladder (§3.2)

Cost-first, from real measured credits. **Start at the cheapest capable model; the VLM gate decides whether
to accept; escalate one tier only on fail.** `nano-banana-2` (8cr) is a last resort, never a default.

| Category | Primary (cheapest) | Escalation ladder (on VLM fail) |
|---|---|---|
| `decorative_scene` (text-in-image NOT critical) | `bytedance/seedream-v4-text-to-image` (5cr) | → `nano-banana-2-lite` (4cr, alt) → `nano-banana-2` (8cr) |
| `labeled_diagram` (legible labels critical) | `bytedance/seedream-v4-text-to-image` (5cr) | → `gpt-image-2-text-to-image` (6cr) → `nano-banana-2` (8cr) |
| `structured`, `icon_or_motif`, `unknown` | *(no generation)* | — |

- All slugs/ladders live in `models.config.js`; adding/swapping a model or reordering the ladder is a config
  edit, never a code change.
- Every generation logs `{ blockType, category, model, creditsConsumed, latencyMs }`.

## 7. Prompt template system (§3.3)

- Templates are **data files** keyed by `(category, subject)` under `prompts/templates/`; a shared
  `scaffold.js` supplies structure (composition, style register, quality directives, negative prompts).
- `resolvePrompt(category, subject, block, region)` injects: the block's topic/story text, grade level
  (visual complexity/tone), subject-appropriate style (Science diagram = clean labeled infographic; hook
  story = warm culturally-grounded illustration), and region context.
- No one-off inline prompt strings; non-engineers can edit templates without touching routing logic.

## 8. Character consistency + region layer (§3.4)

Surfaced by the reference (recurring named characters, Pakistani dress/setting):

- **`characters.js`** builds a per-lesson character spec from the block's `characters[]` (name, role,
  appearance) + region defaults, and derives a **stable seed** from `(lesson id + character set)` so a
  lesson's hook scene(s) look consistent on regenerate.
- **Region:** `segment.region` (default `pk`). `prompts/regions/<region>.js` provides visual context —
  clothing, setting, names, palette. New region = new config file; routing/model code untouched. No
  Pakistan-specific assumptions baked into logic.

## 9. kie.ai client (§3.2)

- One `kie/client.js`: base URL, Bearer auth, `createTask` → poll `recordInfo` until `success`/`fail`
  (bounded, with backoff), parse `resultJson.resultUrls[]`, normalize errors, read `creditsConsumed`.
- Retries with exponential backoff; injectable `fetchImpl` for tests (no live network in the suite).
- **Failure fallback:** on repeated API failure OR two VLM-gate failures across the ladder, return
  `needsImage:true, asset:null, reason:'fallback'` so the caller uses the existing HTML/SVG/Openverse
  path — never fail the whole LP job.

## 10. Quality gate (§ "teacher-approved") 

- `quality_gate.js` sends the generated image URL + a compliance question to kie.ai GPT-5.2 vision (sync)
  and returns `{ pass, reason }`. Checks: does it depict the story/subject; are required labels legible
  (for `labeled_diagram`); is it warm and **classroom-appropriate**; no garbled text.
- Fail → retry once with an adjusted prompt at the same tier → escalate one tier → after the ladder is
  exhausted, fall back to the deterministic path. This is what turns cheap models into teacher-approved
  output and stops off/inappropriate images (the earlier "party photo" / "book cover" failures) reaching
  the PDF.

## 11. Cost & reliability controls (§3.6)

- **Cache:** `hash(category, resolvedPrompt, model)` → asset; identical requests reuse the asset (pluggable
  store; filesystem default; rumi can inject R2). Avoids re-billing for reused hook scenes/boilerplate.
- **Budget guard:** `budget.js` counter with a configurable per-run/day credit ceiling; throws before
  exceeding it so a batch bug cannot silently burn spend.
- **Config-tunable:** per-category model choice via `models.config.js` / env — tune cost/quality without a
  redeploy.

## 12. Integration contract (§3.5)

```
// In the new HTML-render flow (replacing the Gamma call site conceptually):
const { resolveSegmentImages } = require('imagegen');
for (const segment of enrichedContent.segments) {
  const { images } = await resolveSegmentImages(segment, { region: segment.region, budget });
  // images[] carry { blockType, asset|null }. The HTML template embeds each asset (base64 data URI
  // preferred, so Puppeteer needs no network at print time; or a downloaded-then-referenced local file).
  // blocks with needsImage:false are rendered by the existing HTML/SVG path.
}
// then html-to-pdf.js (Puppeteer) renders the assembled HTML → PDF, as for coaching/quiz reports.
```

Provider-decoupled: swapping kie.ai for another provider touches only `kie/` + `models.config.js`, not the
classifier or templates.

## 13. Testing (§4)

- **Unit (pure, no API):** classifier (each category incl. `structured`→no-image and `unknown`→flag);
  `resolvePrompt` (injects topic/grade/style/region; region swap changes output; no leaked defaults);
  route/ladder selection; cache key + hit; budget guard throws at ceiling.
- **kie client:** injected `fetchImpl` — createTask→poll→success, license/size gates, error→fallback.
- **CLI:** 3 fixtures — one `decorative_scene`, one `labeled_diagram`, one that resolves to "no AI image
  needed" — prints category/model/resolved-prompt; `--live` actually generates, saves locally, and scores.
- One opt-in live smoke test behind an env flag; the default suite makes no network call.

## 14. Deliverables (§6)

1. This module structure (Deliverable #1 — approved).
2. Implemented `imagegen` service per §5–§12.
3. Module README: how routing works, how to add a category, a region, and a kie.ai model (all config).
4. CLI with ≥3 fixtures (decorative_scene / labeled_diagram / no-image).

## 15. Assumptions & open items

- Segment schema (§3) is my provisional definition from the reference; align to rumi's real
  enriched-content when available (classifier keys off block labels, so this is low-risk).
- Character-consistency uses prompt-pinning + a stable seed. If kie.ai models expose reference-image
  conditioning, that can be added later behind the same `characters.js` interface.
- `decorative_scene` model default (`seedream-v4`) is chosen from the diagram/label benchmark; a small
  hook-scene benchmark (character warmth/consistency) can refine it — proposed as an early implementation
  step, ~20–30 credits.
