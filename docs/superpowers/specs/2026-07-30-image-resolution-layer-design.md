# Design — Dynamic Image Resolution Layer for `lp-render`

**Date:** 2026-07-30
**Status:** Approved design (pre-implementation)
**Depends on / governed by:** [docs/image-sourcing-guidelines.md](../../image-sourcing-guidelines.md) (v1)

## Goal

When rumi's pipeline hands the module lesson content (replacing Gamma), the module
resolves images from **both** the built-in SVG icon library (dataset) **and** Openverse
real photos, **dynamically according to the content's hints**, inserting only relevant
images (never decorative filler). Resolution is deterministic, cached, and offline-safe.

This builds the §2 (hybrid sourcing) and §4 (fallback + logging) parts of the image
sourcing guidelines that were previously spec-only.

## Non-goals

- No AI image generation (no DALL·E/Midjourney/FLUX/nano-banana). Hard guardrail.
- No content generation — the module consumes content produced upstream.
- No R2 wiring, no feature-flag/pipeline wiring inside rumi — those stay in rumi. The
  module exposes a clean seam (`resolveImages`) and a pluggable cache interface.
- No keyword auto-inference from free text — image intent comes from explicit content hints
  (decided during brainstorming).

## Key decisions (from brainstorming)

1. **Image intent = content hints.** The upstream content-generator emits, per image slot,
   an English `query` + a `kind` (`icon` | `photo` | `auto`). The module resolves
   deterministically. Most reliable relevance.
2. **Pre-render enrichment step.** A separate async `resolveImages(lesson, opts)` runs
   before rendering; the existing renderer stays network-free and deterministic.
3. **New `picture_cards` section type** carries the image hints. Existing `icon` fields on
   other sections keep working unchanged.

## Data flow

```
content-generator (rumi)  →  lesson JSON (with image hints)
        │
        ▼   [ NEW async step — the only place that touches the network ]
   resolveImages(lesson, opts)  →  { lesson: enrichedLesson, report }
        │      • Openverse fetch  OR  icon pick  OR  blank
        │      • license gate → cache → base64 embed → attach attribution
        ▼   [ existing sync render, no network ]
   renderLessonPlanPdf(enrichedLesson)  →  PDF buffer  →  uploadLessonPlanBuffer
```

## Schema — `picture_cards` section

```jsonc
{ "type": "picture_cards", "title": "كلمات تبدأ بالباء", "time": "10 min",
  "cards": [
    { "query": "duck",  "kind": "photo", "label": "بطة", "note": "أول الكلمة" },
    { "query": "apple", "kind": "icon",  "label": "تفاحة" },
    { "query": "sun",   "kind": "auto",  "label": "شمس" }
  ] }
```

- `query` (required): English search term (used for Openverse and/or as an icon-name lookup).
- `kind` (optional, default `"auto"`): `"icon"` | `"photo"` | `"auto"`.
- `label` / `note` (optional): display text, any locale.
- `icon` (optional): explicit library icon name; if absent, `query` is used as the icon name.

`schema.js`: add `picture_cards` to `SECTION_TYPES`; light validation that `cards` is a
non-empty array of objects each having a `query`.

## Enrichment layer — `images/resolve.js`

`async resolveImages(lesson, opts) → { lesson, report }`

- Deep-clones the lesson (never mutates input), walks sections, and for each
  `picture_cards` card runs the resolution chain, attaching a `_resolved` object:
  `{ mode: 'photo'|'icon'|'none', dataUri?, iconName?, attribution? }`.
- Non-`picture_cards` sections pass through untouched.
- Returns a `report`: array of `{ query, kind, tried: [...], used: 'photo'|'icon'|'none', reason }`
  for QA/audit (guideline §4). Optional `opts.logger(entry)` is called per card.
- **Never throws** on network/resolution failure — degrades to icon → blank.

### Resolution rules

| `kind`  | rule |
|---------|------|
| `icon`  | `hasIcon(card.icon ?? query)` → inline SVG icon; else **blank** (no irrelevant image) |
| `photo` | Openverse fetch → base64 + attribution; on fail → icon if `hasIcon(...)` → else blank |
| `auto`  | icon if `hasIcon(card.icon ?? query)` → else photo → else blank |

Rationale: with explicit hints, `auto` prefers the deterministic library icon when one
exists (cheaper, offline, already relevant), and only reaches for a real photo when the
library has nothing. `photo` forces the real-image path but still degrades gracefully.

## Openverse client — `images/openverse.js`

`async searchImage(query, opts) → record | null`

- **Config** (`opts`): `source='wikimedia'`, `license='cc0,pdm,by,by-sa'`, `size='medium'`,
  `minSide=600`, `pageSize=12`, `timeout=12000`, `retries=1`, `fetchImpl`, `userAgent`.
- `source` default **`wikimedia`** for production. In this dev sandbox Wikimedia is
  DNS-blocked, so dev/tests pass `source='flickr'` (reachable). Same code path.
- `fetchImpl` is injectable (default: `node:https` GET with redirect handling). Tests pass a
  stub so **no live network** is required.
- Iterates results; downloads the first candidate that passes the **license gate** and the
  size/byte checks; returns
  `{ dataUri, title, creator, license, source, sourceUrl }` or `null`.

### License gate — `images/license.js`

- Accept only: Public Domain / CC0 / CC-BY / CC-BY-SA (`pdm, cc0, by, by-sa`).
- Reject: `by-nc*`, `by-nd*`, anything else/unknown.
- Even though the Openverse query filters by license, the response license is re-checked
  before a record is accepted (defense in depth). Attribution metadata is always stored.

### Size / quality filters

- Reject results whose reported shortest side `< minSide` (default 600px; guideline §3,
  print-safe).
- Reject downloads `< 4KB` (broken/placeholder) or `> 2.2MB` (too heavy to embed).

## Cache — `images/cache.js`

- Interface: `{ async get(key), async set(key, record) }`. Key = `${source}:${license}:${normalizedQuery}`.
- Default export: a filesystem cache (`FsImageCache(dir)`) storing JSON records (including
  base64) so repeat concepts (`apple`, `cow`) don't re-hit the API.
- rumi injects an R2-backed cache implementing the same interface via `opts.cache`.
- Cache stores the full resolved photo record; a cache hit skips the network entirely.

## Renderer — `template/sections/picture-cards.js` + attribution

- New renderer reads each card's `_resolved`:
  - `photo` → `<img src=dataUri>` card with `label`/`note`.
  - `icon` → inline SVG card.
  - `none` → card omitted (no broken placeholder).
  - `_resolved` absent (enrichment was skipped) → card treated as `none` and omitted, so the
    renderer never breaks if `resolveImages` was not run first.
- Photo cards and SVG-icon cards render in visually distinct panels so a photo+line-art mix
  never looks like a rendering error (guideline §3).
- `build.js`: after rendering all sections, if any resolved photo carries attribution,
  append a small **credits footer** listing `title — creator — license (source)`. Footer
  label ("Photo credits") is localized (en/ar/ur/sd) via `labels.js`.
- Registered in `sections/index.js` `RENDERERS`; `SECTION_ACCENT['picture_cards']` added to
  `tokens.js`; default title added.

## Fallback / offline behavior (guideline §4)

- Any network failure, timeout, rate-limit, or blocked host → photo falls back to icon →
  then blank. `resolveImages` always returns a valid (possibly photo-less) lesson.
- All unit tests run offline against a stubbed `fetchImpl`. One optional **live smoke test**
  hits Openverse (`source=flickr`) and is gated behind an env flag (`LP_LIVE_IMAGE_TEST=1`),
  off in CI.

## Bonus fix (required by this work) — `pageMode:'fit'` PDF bug

Real-photo LPs are tall, and the current `fit` mode drops content on pages taller than A4:
[shell.js](../../../lp-render/template/shell.js) emits `@page{size:A4;margin:0}`, so Chromium
paginates at A4 boundaries and `pageRanges:'1'` outputs only the first A4's worth onto the
tall paper, dropping the rest.

Fix in [html-to-pdf.js](../../../lp-render/render/html-to-pdf.js) `fit` branch: after
measuring `scrollHeight`, inject `@page{size:<FIT_WIDTH>px <height>px;margin:0}` (overriding
A4) and render with `preferCSSPageSize: true` so the output is a single content-sized page
with no clipping and no empty space. Add a test: a lesson taller than A4 renders as **one**
page with the last section present.

## rumi integration seam

```js
const { resolveImages, renderLessonPlanPdf } = require('lp-render');

// content generator (replacing Gamma) produced `contentJson` with picture_cards hints
const { lesson } = await resolveImages(contentJson, { source: 'wikimedia', cache: r2Cache });
const pdf = await renderLessonPlanPdf(lesson);        // Buffer — network-free
await uploadLessonPlanBuffer(pdf);
```

## New / changed files

**New**
- `lp-render/images/openverse.js` — Openverse client (+ injectable fetch).
- `lp-render/images/license.js` — license whitelist gate.
- `lp-render/images/cache.js` — cache interface + default filesystem cache.
- `lp-render/images/resolve.js` — `resolveImages` enrichment + report.
- `lp-render/template/sections/picture-cards.js` — renderer.
- Tests: `test/openverse.test.js`, `test/license.test.js`, `test/cache.test.js`,
  `test/resolve.test.js`, `test/picture-cards.test.js`, `test/fit-tall.test.js`.
- Fixture: `fixtures/lesson-picture-cards.en.json` (small demo lesson).

**Changed**
- `lp-render/index.js` — export `resolveImages`.
- `lp-render/schema.js` — add `picture_cards` to `SECTION_TYPES` + light card validation.
- `lp-render/template/sections/index.js` — register renderer + default title.
- `lp-render/template/tokens.js` — `SECTION_ACCENT['picture_cards']`.
- `lp-render/template/labels.js` — "Photo credits" label per locale.
- `lp-render/template/build.js` — append attribution footer when photos present.
- `lp-render/render/html-to-pdf.js` — fit-mode `@page` fix.
- `lp-render/README.md` — document `resolveImages`, `picture_cards`, config, integration.

## Guardrails preserved

No AI image generation · relevance-or-blank (never decorative) · Palestine → content decides
locale (English default) · no empty space · icons library-only for the SVG path.

## Testing strategy

- **Unit (offline, mocked fetch):** openverse (success / license-reject / size-reject /
  network-error→null), license gate, cache (get/set + hit skips fetch), resolve (icon /
  photo / auto / photo→icon fallback / offline→blank / report shape / input not mutated),
  picture-cards renderer (photo / icon / none / attribution collection).
- **Render:** fit-tall single-page test (skips if no Chromium).
- **Live smoke (opt-in):** `LP_LIVE_IMAGE_TEST=1` hits Openverse `source=flickr`.
- Existing 45+ tests must stay green.
