# Code-rendered lesson plans vs. nano-banana (image AI) — cost, latency, quality

_A practical comparison for deciding how Taleemabad / Orenda should generate lesson-plan images._

**Bottom line:** For our use case (multilingual lesson plans with lots of correct Urdu/Sindhi text), **code-rendered images win clearly on text correctness, consistency, editability, and — in the cheapest configurations — cost.** Image AI (nano-banana) can produce richer freehand artwork, but it mis-renders non-Latin text and bills per image.

---

## The two approaches

| | **nano-banana** (Gemini image AI) | **Code-rendered** (this project) |
|---|---|---|
| How the image is made | AI paints pixels directly | Code writes HTML/CSS/SVG → headless Chrome renders it |
| Who writes the layout/content | The image model | A template (no AI) **or** Claude (text model) |
| Text in the image | Painted as pixels | Real font glyphs |

The code-rendered side has three modes, which matter a lot for cost:

1. **Template** — code fills a fixed design. No AI. Content is generic (topic inserted).
2. **Hybrid** — Claude writes only the lesson *content* (small), a template renders it. Correct + cheap.
3. **Full-LLM** — Claude writes the entire HTML/SVG per topic. Most flexible, largest output.

---

## 1. Cost

Public reference price for nano-banana (Gemini 2.5 Flash Image): **~$0.039 per image**.

Our Claude cost depends on **tokens**, and the **output size dominates**. Measured on this repo: the few-shot reference is ~7,900 input tokens and a full rich lesson is ~8–10k output tokens (token counts estimated at ~4 chars/token; exact figures need the API's `count_tokens`).

Per-lesson cost estimates (Anthropic pricing: Haiku $1/$5, Sonnet 5 $3/$15, Opus 4.8 $5/$25 per 1M in/out):

| Mode | Model | Est. cost / lesson | vs nano-banana (~$0.039) |
|------|-------|--------------------|--------------------------|
| **Template** | none (no AI) | **$0.000** | Free |
| **Hybrid** (content-only, ~1.5k output, cached input) | Haiku | **~$0.005–0.015** | ~3–8× cheaper |
| **Hybrid** | Sonnet 5 | ~$0.02–0.03 | ~similar–cheaper |
| **Full-LLM** (full HTML, ~8k output) | Haiku | ~$0.05 | ~comparable |
| **Full-LLM** | Sonnet 5 | ~$0.14 | ~3–4× more |
| **Full-LLM** | Opus 4.8 | ~$0.24 | ~6× more |

**Honest takeaway on cost:**
- **Template = $0** — the strongest cost story, but content is generic.
- **Hybrid (Claude writes only the content) is the cost sweet spot** — a few tenths of a cent to ~1.5¢, cheaper than nano-banana, *and* correct text.
- **Full-LLM is NOT automatically cheaper** than nano-banana — because a rich lesson's HTML is a large output, full-HTML on Sonnet/Opus costs *more* per image. Its advantage is flexibility and quality, not cost.
- Prompt caching makes the (stable) reference input ~10× cheaper on repeat calls, so **output tokens are the real cost driver** — keeping output small (hybrid) is the main cost lever.

---

## 2. Latency

| Approach | Latency | Source |
|----------|---------|--------|
| **Template render** | **~1.6 s** | Measured on this repo (3 runs) |
| **Hybrid** (Claude content + render) | ~3–8 s | render measured + estimated Haiku generation |
| **Full-LLM** (Haiku → render) | ~5–12 s | estimated generation + measured render |
| **Full-LLM** (Sonnet/Opus → render) | ~12–40 s | estimated (larger models, ~8k output) |
| **nano-banana** | ~5–15 s (typical) | external/published figures, not measured here |

Template mode is the fastest by far. Claude modes add the model's generation time on top of the ~1.6 s render.

---

## 3. Quality

| Dimension | nano-banana | Code-rendered |
|-----------|-------------|---------------|
| **Urdu / Sindhi text correctness** | ❌ Frequently wrong (misspellings, broken letters — it paints text) | ✅ **100% correct** (real fonts) |
| **Design consistency** | Varies image to image | ✅ Consistent (fixed CSS/branding) |
| **Editable after generation** | ❌ Flat image | ✅ Yes (it's code — fix a word, change a colour) |
| **Deterministic / reproducible** | ❌ No | ✅ Same input → same output |
| **Freehand illustration richness** | ✅ Can be very rich/varied | ⚠️ SVG + bundled art — clean and professional, but not photoreal or as varied |
| **Print-ready A4 layout** | ⚠️ Not guaranteed | ✅ Built for A4, overflow-checked |

**Honest takeaway on quality:** For text-heavy, multilingual lesson plans, code-rendered wins decisively — correct text alone is decisive for Urdu/Sindhi. nano-banana's edge is richer *freehand illustration*; for that, our approach uses SVG + a bundled professional illustration library (clean and consistent, though not photoreal).

---

## Recommendation

| Priority | Best choice |
|----------|-------------|
| Lowest cost, fixed designs OK | **Template** ($0) |
| Best balance (correct text + low cost + real content) | **Hybrid** — Claude writes content, template renders (**recommended**) |
| Maximum per-topic flexibility, budget allows | **Full-LLM** with Haiku (cost-competitive) or Sonnet (higher quality) |
| Rich freehand artwork is the top priority | nano-banana — but accept wrong non-Latin text and per-image cost |

**For Taleemabad/Orenda's multilingual lesson plans, the hybrid approach is the recommended target:** correct Urdu/Sindhi text, consistent professional design, editable output, and cost below nano-banana. It requires an Anthropic API key (for the content-writing step); the template mode already runs today at $0 without a key.

---

## Methodology & honesty notes

- **Measured on this repo:** template render latency (~1.6 s), few-shot size (~7.9k tokens), rich-lesson HTML size (~10k tokens). Token counts are estimated at ~4 chars/token; exact counts need the API's `count_tokens`.
- **Estimated:** Claude per-lesson cost (from token estimates × published Anthropic pricing) and Claude/nano-banana latency. These are directional, not benchmarked end-to-end (Claude modes need an API key to measure live; nano-banana figures are external/published).
- **To make this exact:** run `npm run benchmark` with an API key set — it records real cost/latency per Claude model over the golden test set, and the results can replace the estimates above.
- No AI image model is used anywhere in the code-rendered approach; images are produced only by rendering code.
