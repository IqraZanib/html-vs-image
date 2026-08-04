# imagegen — content-aware image-generation service

Standalone, model-agnostic image layer for RUMI lesson plans. Given a lesson **segment**, it classifies
each block and — only where a real image adds value (mainly the **HOOK STORY** scene) — generates a cheap,
culturally-grounded, **VLM-gated** image via kie.ai. Everything else it marks *"no AI image needed"* (the
HTML/SVG path renders it). Never fails the LP job: if the model ladder can't pass the gate, it falls back to
the deterministic path.

Design: `docs/superpowers/specs/2026-08-04-imagegen-service-design.md`. Model choices:
`docs/image-model-benchmark.md`.

## Pipeline

```
segment.blocks[] → classify → (needsImage?) → route (cost-ascending ladder)
                                    │no                 │
                                    ▼                    ▼  for each model in ladder:
                          asset:null (HTML path)   resolvePrompt → generateImage → VLM gate
                                                        pass? → cache + return asset
                                                        fail? → next model → … → fallback (asset:null)
```

## Use

```js
const { resolveSegmentImages } = require('./imagegen');
const { images } = await resolveSegmentImages(segment, { apiKey: process.env.KIE_API_KEY, region: 'pk' });
// images[i] = { blockType, category, needsImage, model|null, asset|null, reason, creditsConsumed }
// Embed asset.url (or a base64 data URI) into an <img> before Puppeteer renders the page to PDF.
// needsImage:false blocks are rendered by the existing HTML/SVG path.
```

CLI (manual test harness):

```bash
node imagegen/cli.js imagegen/fixtures/hook.json            # dry run: category + model + prompt
node imagegen/cli.js imagegen/fixtures/board.json           # → "(no AI image)"
KIE_API_KEY=... node imagegen/cli.js imagegen/fixtures/hook.json --live   # actually generate + gate + save
```

Tests: `node --test imagegen/test/` (no network). Live smoke: `IMAGEGEN_LIVE=1 KIE_API_KEY=... node --test imagegen/test/live.test.js`.

## Extending (all config/data — no routing/logic change)

- **Add a content category:** add a rule in `classify.js`, a ladder in `config/models.config.js` `LADDERS`,
  and a template in `prompts/templates/index.js`.
- **Add a region:** add `prompts/regions/<id>.js` (`{ id, dress, setting, names, palette, note }`) and register
  it in `prompts/regions/index.js`. Set `segment.region` to use it. No Pakistan assumptions are baked into logic.
- **Add / swap a kie.ai model:** add its slug + default `input` params to `config/models.config.js` `MODELS`,
  then place the slug in the relevant `LADDERS` entry. Cost is measured live via `creditsConsumed` — no price
  table to maintain.
- **Swap provider:** only `kie/` + `config/models.config.js` touch the API; the classifier and templates don't.

## Guarantees

- Network only in `kie/` + `quality_gate.js`, all via an injectable `fetchImpl`; the default test suite makes
  no network call. The API key is read from `process.env.KIE_API_KEY`, never hardcoded.
- Cost-ascending ladder + VLM gate: images start at the cheapest model (`nano-banana-2-lite`, 4cr) and only
  escalate on a gate failure. A `BudgetGuard` ceiling stops runaway spend. A cache skips regenerating
  identical prompts.
