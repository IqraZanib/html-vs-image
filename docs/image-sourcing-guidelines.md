# Image Sourcing & Generation Guidelines — Lesson Plan (LP) Image Pipeline

> **Status:** v1 (canonical spec). Parts of this are already enforced by the
> `lp-render` module; the real-photo sourcing/fallback layer (§2, §4) is **not
> built yet** — it is proven only in the `assets/generated/lesson-farm-hybrid-en.png`
> prototype. See the status table at the bottom for exactly what is live vs. planned.

## Context

This pipeline generates the visual/image component of AI-generated lesson plans
(currently piloting for Palestine, where teacher shortage means the LP output must be
usable directly by a real teacher on WhatsApp with no manual design cleanup). The goal
is: a teacher should be able to look at the image and immediately understand what the
lesson is about — no confusion, no gaps, no mismatched or decorative-only visuals.

Apply the following rules whenever generating or assembling images for an LP.

## 1. Core Principle: Content Relevance Over Decoration

- Every image must directly represent the actual concept being taught in that lesson —
  not a generic or loosely-related visual.
- Before finalizing an image, check: "Would a teacher immediately recognize what this is
  teaching, without reading the caption?" If not, revise or resource.
- Never insert an image purely to "fill space." If no relevant image can be sourced or
  generated, leave the space blank rather than use an irrelevant one.

## 2. Hybrid Sourcing Strategy (in this priority order)

**Step 1 — Determine image type needed:**

- Schematic / conceptual / diagram (e.g. water cycle, photosynthesis, shapes, numbers,
  process flows, labeled diagrams) → generate as SVG.
- Real-world object recognition (e.g. specific animal, fruit, vegetable, tool, cultural
  item, community helper in real context) → prefer a real reference image over SVG, since
  realism aids recognition for young learners.

**Step 2 — For real-world images, query in this order:**

1. Openverse API (openverse.org/api) — search by keyword, filter to
   `license_type=commercial` or CC0/public domain only.
2. Wikimedia Commons API (commons.wikimedia.org/w/api.php) — search by keyword, prefer
   files tagged Public Domain or CC0/CC-BY.
3. If neither returns a clear, appropriately-licensed, topic-accurate match within [N]
   results → fall back to generating a custom SVG illustration instead.

**Step 3 — Licensing check (mandatory, automated):**

- Accept only: Public Domain, CC0, or CC-BY (with attribution auto-logged).
- Reject: CC-BY-NC, CC-BY-ND, or any license requiring paid use or unclear terms.
- Store license + source URL + attribution text as metadata alongside every non-SVG image
  used, even if attribution isn't displayed on the LP itself (needed for audit trail).

**Step 4 — Caching:**

- Cache every downloaded/generated image locally (keyed by search term + license) so
  repeat lessons using the same concept (e.g. "apple," "cow") don't re-hit the API every
  time.

## 3. Formatting & Layout Rules (no visual gaps/glitches)

- Fixed canvas size and consistent margins for every LP image slot — no element should
  touch or bleed past the edge unless intentional (full-bleed background).
- No overlapping text/image elements. Validate bounding boxes before final render.
- Consistent aspect ratio handling: if a sourced photo doesn't match the target aspect
  ratio, crop intelligently (center-weighted) rather than stretch/distort.
- Minimum resolution threshold for sourced photos (e.g. ≥ 600px on the shortest side) —
  reject anything smaller, since teachers may print the LP.
- SVGs must use bold strokes/outlines (2–4px) on all shapes so they remain legible when
  printed in black & white or photocopied — do not rely on fill color alone for
  recognizability.
- Consistent visual style within a single LP: don't mix a highly detailed real photo with
  a flat cartoon SVG in the same layout unless there's a clear visual separation (e.g.
  distinct panel/border) so it doesn't look like a rendering error.

## 4. Fallback & Error Handling

- If an API call fails, times out, or is rate-limited: retry once, then fall back to the
  next source in the priority order (Step 2), and finally to SVG generation if all else
  fails.
- If SVG generation also cannot produce a confident match for the concept: flag the slide
  for manual review rather than inserting a placeholder or guessed image.
- Log every fallback event (what was requested, what was tried, what was ultimately used)
  for later QA review.

## 5. Cultural & Context Sensitivity (Palestine pilot specific)

- Prefer images that are culturally neutral or regionally appropriate where the lesson
  content allows for a choice (e.g. clothing, food, community-helper depictions).
- Avoid any imagery that could be distressing, inappropriate, or contextually insensitive
  given the current environment — err toward simple, calm, unambiguous illustrations over
  complex or realistic scenes.

## 6. Pre-Delivery QA Checklist (run before an LP is marked "ready")

- [ ] Every image slot is filled or intentionally left blank (no broken links/placeholders).
- [ ] Each image matches its lesson's topic keyword(s).
- [ ] No licensing violations (every non-SVG image has a valid, logged license).
- [ ] No layout overlap, cropping distortion, or off-canvas bleed.
- [ ] Image is legible at both screen size and expected print/photocopy size.
- [ ] Alt-text/description stored for each image (accessibility + future audit).

## Notes for Iteration

This is v1 of the guideline and is expected to evolve. When testing against real
WhatsApp-delivered LPs, track: (a) which lessons had no good API match and fell back to
SVG, (b) which SVGs were later judged low-quality by review, (c) any teacher feedback on
image clarity — feed all three back into refining Step 2's search-term construction and
Step 6's QA thresholds.

---

## Implementation status (`lp-render` module)

| Guideline | Status | Where |
|---|---|---|
| §1 Relevance over decoration (leave blank if no match) | ✅ **Live** | `template/icons.js` — `icon()` returns `''`, renderers guard with `hasIcon()` |
| §2 Hybrid sourcing (SVG schematic / real-photo recognition; Openverse→Wikimedia→SVG) | ⚠️ **Prototype only** | `assets/generated/lesson-farm-hybrid-en.png` (built off-module); no in-module client yet |
| §3 Layout — consistent canvas/margins/panels, no overlap | 🟡 **Partial** | `template/shell.js` LAYOUT_CSS; photo center-crop / ≥600px / stroke checks not codified |
| §3 SVG bold strokes for B&W legibility | 🟡 Partial | icon set uses outlines; not enforced/validated |
| §4 Fallback + logging (retry→next source→SVG→flag) | ❌ **Not built** | requires the §2 sourcing layer |
| §5 Cultural sensitivity (Palestine) | 🟡 Partial | README policy "generate in English"; image-sensitivity curation not automated |
| §6 Pre-delivery QA checklist | ❌ **Not codified** | manual for now |

**Sandbox caveat (§2):** Wikimedia Commons (API + CDN) is DNS-blocked in this dev sandbox,
so the prototype fetched real CC photos via **Openverse with `source=flickr`**. The code
path is identical — in rumi-platform's environment, set `source=wikimedia` to pull
Wikimedia Commons results.
