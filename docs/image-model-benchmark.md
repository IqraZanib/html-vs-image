# Image-Model Benchmark — Content-Aware LP Image Pipeline

**Date:** 2026-08-03
**Purpose:** Empirical basis for the content-type → renderer routing defaults (Gamma replacement).
**Provider:** kie.ai (`https://api.kie.ai/api/v1`, unified `jobs/createTask` + `jobs/recordInfo`, Bearer auth).
**Method:** Real generations against kie.ai. Each image was auto-scored by a VLM (kie.ai GPT-5.2 vision,
`POST /gpt-5-2/v1/chat/completions`) for subject/label compliance. Cost is the **actual** `creditsConsumed`
returned by `recordInfo` (verified against the `/chat/credit` balance delta). This run cost **41 credits total (~$0.20)**.

> This is a first, deliberately small empirical pass (10 generations) to justify the defaults below — not an
> exhaustive sweep. The router config reads these defaults; re-run `scratchpad/kie-bench.js`-style prompts to revisit.

## Top-10 cheapest image models — measured (18-model sweep)

kie.ai publishes **no per-model prices** anywhere (docs pages only show the `402` error; the pricing
page is JS-rendered/403). So cost here is **measured empirically**: each text-to-image model generated the
**same** grade-5 labeled plant-cell prompt once, and cost is the real `creditsConsumed` from `recordInfo`
(1 credit ≈ $0.005). Each output was VLM-scored (GPT-5.2 vision) for how many of the 6 target labels are
correct/readable. **18 models attempted, 12 succeeded, 73.6 credits (~$0.37) total.**

**Cheapest 10 that actually generated (ascending by real cost):**

| # | Model slug | Credits | ~USD | Latency | VLM labels | Quality note |
|---|---|---|---|---|---|---|
| 1 | `gpt-image/1.5-text-to-image` | 4 | $0.020 | ~90s ⚠️slow | 6/6 ✅ | accurate but very slow |
| 2 | `grok-imagine/text-to-image` | 4 | $0.020 | ~17s | 5/6 ❌ | one label unclear |
| 3 | `google/nano-banana` | 4 | $0.020 | ~54s | 4/6 ❌ | misspelled (VACOULE, CHOROPLAST) |
| 4 | `nano-banana-2-lite` | 4 | $0.020 | ~14s | 6/6 text, **mis-mapped** ⚠️ | clean art, but labels point to wrong parts + duplicated |
| 5 | **`bytedance/seedream-v4-text-to-image`** | 5 | $0.025 | ~14s | 6/6 ✅ | **best value** — cheap, fast, accurate |
| 6 | `seedream/5-lite-text-to-image` | 5.5 | $0.028 | ~51s | 6/6 ✅ | accurate, slow |
| 7 | `qwen2/text-to-image` | 5.6 | $0.028 | **~7s** fastest | 5/6 ❌ | fastest, one label off |
| 8 | `gpt-image-2-text-to-image` | 6 | $0.030 | ~70s ⚠️slow | 6/6 ✅ | accurate, slow |
| 9 | `seedream/4.5-text-to-image` | 6.5 | $0.033 | ~27s | 6/6 ✅ | accurate |
| 10 | `seedream/5-pro-text-to-image` | 7 | $0.035 | ~80s ⚠️slow | 6/6 ✅ | accurate, slow |

(Next: `nano-banana-2` = 8cr/~21s/6-6 accurate; `flux-2/flex` = 14cr.)

**Errored this run** (`internal error` — treat as transient/flaky, not confirmed-unavailable; `flux-2/pro`
succeeded at 5cr in the earlier run): `flux-2/pro-text-to-image`, `ideogram/v3-text-to-image`,
`qwen/text-to-image`, `google/imagen4`, `google/imagen4-fast`, `google/imagen4-ultra`. Retry before ruling out.

**Key caveat — "cheap but wrong":** the cheapest passers render label *text* correctly yet can **mis-map**
labels to the wrong structure (nano-banana-2-lite pointed VACUOLE at a chloroplast; nano-banana misspelled).
Presence ≠ correctness → the VLM quality gate must judge *correctness*, and it should ask "is each label on the
right part", not just "are the words readable". Accuracy roughly tracks cost here.

**Practical read:** best cheap + fast + *accurate* = **Seedream v4 (5cr, ~14s)**; best top-accuracy =
**nano-banana-2 (8cr)**. Sub-5cr models are usable only behind a strict correctness gate + retry.

---

## Routing decision (the three-way split, confirmed empirically)

| Content type | Examples | Renderer | Empirical justification |
|---|---|---|---|
| **Exact notation** | math equations, formulas, number lines, coordinate graphs, Punnett squares | **Deterministic code** (KaTeX for notation; SVG/plot for graphs) → existing Playwright HTML→PDF | Image models drift structurally — see the notation test below: the formula came back malformed (literal "sqrt", misplaced fraction bar, stray `)`). Not a prompting problem. |
| **Illustrative labeled diagrams** | plant/animal cell, body systems, lab apparatus | **Image-gen via kie.ai** | Genuinely works — nano-banana-2 & seedream-v4 produced correct, fully-labeled diagrams (see table). |
| **Process / cycle diagrams** | water cycle, photosynthesis, life cycles | **Reusable code-rendered flow template** (HTML/SVG, swappable icon slots) | Same skeleton every time; regenerating per-topic wastes cost and risks drift. (Already prototyped in the `lp-render` module.) |

## Illustrative labeled diagrams — head-to-head

Two prompts: a **grade-5 plant cell** (label: cell wall, cell membrane, nucleus, cytoplasm, chloroplast, vacuole)
and a **grade-6 human digestive system** (label: mouth, esophagus, stomach, small/large intestine). VLM pass = all
requested labels present and legible.

| Model | `model` slug | Cell | Digestive | Cost (credits) | Latency | Notes |
|---|---|---|---|---|---|---|
| **nano-banana-2** | `nano-banana-2` | ✅ 6/6 labels | ✅ pass | **8** | ~27–31s | **Best label fidelity.** Crisp text, correct spelling, leader lines. |
| **Seedream v4** | `bytedance/seedream-v4-text-to-image` | ✅ pass | ✅ pass | **5** | ~14–24s | **Best value** — cheaper, fastest, passes both. |
| **FLUX.2 pro** | `flux-2/pro-text-to-image` | ⚠️ fail | ✅ pass | 5 | ~20–24s | Mixed; one prompt failed VLM. |
| Ideogram v3 | `ideogram/v3-text-to-image` | ❌ API error | ❌ API error | 0 | — | Returned `internal error` both times (transient or param mismatch — needs a params re-check before use). |

Sample outputs (in `docs/benchmark-samples/`):
- `nano-banana-2_plant-cell.png` — reference-quality labeled diagram.
- `seedream-v4_digestive.png` — passes at lower cost/latency.

## Notation — the drift test (why notation must be code)

Prompt asked for the quadratic formula `x = (-b ± √(b²-4ac)) / (2a)` rendered exactly.

- **Seedream v4** → **VLM FAIL.** Transcribed by the VLM as `x = (-b ± sqrt (b²-4ac)) / (2a)` but visually malformed:
  `sqrt` printed as literal text (no radical), the fraction bar sits under only part of the numerator, a spurious
  extra `)`, and a stray bar over `b`. See `docs/benchmark-samples/seedream-v4_notation-DRIFT.png`.
- **FLUX.2 pro** → API error on this prompt.

**Conclusion:** exact notation is not an image-gen job. Render it with **KaTeX → HTML → the existing Playwright
PDF path** (deterministic, always correct). The benchmark's VLM correctly rejected the drifted output, which also
validates the quality gate.

## Quality gate (VLM) — validated

kie.ai **GPT-5.2 vision** (`POST https://api.kie.ai/gpt-5-2/v1/chat/completions`, OpenAI-compatible, **synchronous**)
was given each generated image + a compliance question and returned structured JSON (`{pass, labels_visible, reason}`).
It passed the correct diagrams and **failed the malformed notation** — so it works as the gate that decides whether an
image-gen output is allowed into the final PDF, with retry/fallback on fail.

> Note: the ticket named Qwen2.5-VL / InternVL3, but **kie.ai does not host those**. GPT-5.2 vision is the available,
> working substitute on the same provider (no extra vendor). If a specific open-weight VLM is required, it must be
> hosted elsewhere — flagged as a deviation.

## Router defaults — DIRECT type→model assignment (not a cost climb)

Earlier the router walked a cost-ascending ladder (cheapest first, escalate on gate fail).
For image types where the cheap model reliably fails (Arabic labels, precise diagrams) that
just burned credits generating-then-rejecting. The router now sends each type **straight to
the model that makes it best on the first attempt**, with a single gate-only safety fallback.
Config: `imagegen/config/models.config.js` (`LADDERS` + `ladderFor`).

| Type | Locale | Primary (1st attempt) | Safety fallback | Rationale |
|---|---|---|---|---|
| **notation** | any | **KaTeX** (code) | — | image-gen drift proven; code always correct |
| **decorative_scene** (children/activity/family, no text) | any | **nano-banana-2-lite** (4cr, ~14s) | **qwen2** (open-weight, ~10s) | cheap, fast, warm art + expressive faces; qwen fast open-weight backup |
| **labeled_diagram** — Latin script | en, sw, fr… | **Seedream v4** (5cr, ~14s) | **nano-banana-2** (8cr) | best value + accurate Latin labels first-try; escalate for max fidelity |
| **labeled_diagram** — complex/RTL script | ar, ur, sd, fa, ps | **nano-banana-2** (8cr) | **gpt-image-2** | only the strongest model renders Arabic/Urdu script reliably — top model first is *cheaper in expectation* than letting Seedream fail and climb |
| **character cast** (single figure, panel-blend) | any | **nano-banana-2-lite** (4cr, pure-white bg) | **flux-2/pro** (open-weight, pure-white) | white bg needed to blend into panels; flux open-weight backup (`decorative/characters.js`) |
| **process / cycle** | any | **code flow-template** (HTML/SVG) | nano-banana-2 (bespoke only) | consistent, cheap, no drift |
| **quality gate** | any | **GPT-5.2 vision** (kie.ai) | — | catches drift/label-language errors, sync, structured |

Open-weight models are now live in the routing: **qwen2** (scene fallback) and **flux-2/pro**
(character fallback). The gate still guards every output; the fallback fires only when the
primary is rejected, so the common case is a single generation.

## Cost / async facts (for the router + logging)

- **Cost per image:** measured live via `recordInfo.creditsConsumed` — nano-banana-2 = 8 cr (~$0.04), Seedream v4 / FLUX.2 pro = 5 cr (~$0.025). Do **not** hardcode a price table (kie.ai's pricing page is JS-rendered/403 to fetch); log `creditsConsumed` per generation instead.
- **Async:** all image-gen is `createTask` → poll `recordInfo` (state ∈ waiting/queuing/generating/success/fail) or `callBackUrl` webhook. Image URLs are in `recordInfo.data.resultJson.resultUrls[]` and **expire ~24h — download promptly**. VLM chat is synchronous.
- **Account balance:** ~8600 credits available at time of writing.

## Caveats / UNVERIFIED

- **FLUX.2 "schnell"** is **not** on kie.ai — only `flux-2/pro-text-to-image` exists. The ticket's schnell default is unavailable; `flux-2/pro` benchmarked instead.
- **Qwen-Image** surfaces only as `qwen2/image-edit` (edit endpoint); no pure text-to-image Qwen slug confirmed — not benchmarked as a clean t2i.
- **Ideogram v3** errored both runs — retry with corrected params before adopting; not a verified option yet.
- Imagen4 (`google/imagen4`, `google/imagen4-ultra`) and GPT Image-2 exist but were not benchmarked this pass.
- Pricing numbers are derived from live `creditsConsumed`, not kie.ai's published price list.

## Correction — open-weight models re-tested (character task)

An earlier pass wrongly concluded the open-weight models were unreliable. A proper
re-run (same schoolboy character prompt) shows **both work**:

| Model | Licensing | Credits | Latency | Background | Verdict |
|---|---|---|---|---|---|
| `nano-banana-2-lite` | proprietary | **4** | ~17s | pure white | shipped — cheapest + blends into panels |
| `flux-2/pro-text-to-image` | **open-weight** | 5 | 24–83s (variable) | pure white | works 3/3; good art; slow |
| `qwen2/text-to-image` | **open-weight** | 5.6 | **~10s** (fastest) | tinted (blue) | works; good art; bg needs keying |

Key fixes to the earlier mistakes:
- **Qwen2 works** — its `image_size` takes **ratio strings** (`'1:1'`, `'3:4'`), **not** the
  fal-style names (`portrait_4_3`, `square_hd`) that were tried first and rejected.
- **FLUX-2/pro is not flaky** — 3/3 runs succeeded; the earlier single timeout was transient.
  It is just slow and high-variance in latency.

So the reason we ship `nano-banana-2-lite` for characters is **cost (4cr) + a pure-white
background** (which the panel-blend needs), not any failure of the open-weight models.
Both `flux-2/pro` and `qwen2` are registered in `models.config.js` as usable alternatives.
