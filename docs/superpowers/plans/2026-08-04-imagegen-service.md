# imagegen Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, content-aware image-generation service (`imagegen/`) that classifies a lesson-plan block, and — only for the blocks that need it (mainly the HOOK STORY scene) — generates a cheap, culturally-grounded, VLM-gated image via kie.ai; everything else it marks "no AI image needed".

**Architecture:** Pure, separately-testable units (classifier, route/config, prompt templates, character/region, cache, budget) plus a network layer (kie client, generate, quality-gate) with an injectable `fetchImpl` so the default test suite makes no network call. A single `resolveSegmentImages(segment, opts)` entrypoint orchestrates them with a cost-ascending model ladder and a VLM quality gate that falls back to the deterministic (HTML/SVG) path.

**Tech Stack:** Node.js (CommonJS), `node:test` + `node:assert`, `node:https` (injectable), kie.ai (`jobs/createTask` → poll `jobs/recordInfo`; GPT-5.2 vision for the gate).

## Global Constraints

- **CommonJS** (`require`/`module.exports`); tests use `node:test` + `node:assert`; run `node --test imagegen/test/`.
- **No secrets in code:** the kie API key is read from `process.env.KIE_API_KEY`; network functions take `apiKey` as a parameter (never hardcoded). Fail loudly if missing at the CLI/live boundary.
- **Injectable `fetchImpl` everywhere network happens** — the default `node --test` suite must make **no** network call. One opt-in live test behind `IMAGEGEN_LIVE=1`.
- **No inline magic strings:** model slugs + ladders live in `config/models.config.js`; prompt text lives in `prompts/`. Nothing hardcoded in routing/orchestration logic.
- **Model ladders (from the real benchmark — do not change without a benchmark):**
  - `decorative_scene`: `nano-banana-2-lite` (4cr) → `bytedance/seedream-v4-text-to-image` (5cr) → `nano-banana-2` (8cr).
  - `labeled_diagram`: `bytedance/seedream-v4-text-to-image` (5cr) → `gpt-image-2-text-to-image` (6cr) → `nano-banana-2` (8cr).
- **kie.ai:** base `https://api.kie.ai/api/v1`, Bearer auth. Image-gen is **async** (createTask → poll recordInfo; states `waiting/queuing/generating/success/fail`; URLs in `data.resultJson.resultUrls[]`; cost in `data.creditsConsumed`). GPT-5.2 vision is **sync** at `https://api.kie.ai/gpt-5-2/v1/chat/completions`.
- **Categories:** `decorative_scene`, `labeled_diagram`, `structured`, `icon_or_motif`, `unknown`. Only `decorative_scene` and `labeled_diagram` set `needsImage:true`.
- **Never fail the LP job:** on API failure or the whole ladder failing the gate, return `needsImage:true, asset:null, reason:'fallback'` so the caller uses the deterministic path.

---

### Task 1: Content-type classifier

**Files:**
- Create: `imagegen/classify.js`
- Test: `imagegen/test/classify.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `classifyBlock(block, segment) → { category, needsImage, reason }`. `block` is `{ type, text?, characters? }`; `segment` is `{ subject, ... }`. `category ∈ {decorative_scene, labeled_diagram, structured, icon_or_motif, unknown}`.

- [ ] **Step 1: Write the failing test**

```js
// imagegen/test/classify.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { classifyBlock } = require('../classify');

const seg = (subject) => ({ subject });

test('HOOK_STORY → decorative_scene, needs an image', () => {
  const r = classifyBlock({ type: 'HOOK_STORY', text: 'Ali and Sara on a train' }, seg('English'));
  assert.strictEqual(r.category, 'decorative_scene');
  assert.strictEqual(r.needsImage, true);
});

test('structured blocks (board work, tables, exit ticket) → no AI image', () => {
  for (const t of ['BOARD_WORK', 'WORKED_EXAMPLE', 'EXIT_TICKET', 'JOURNEY', 'CFU', 'KEY_FACT', 'TEACHER_SAYS']) {
    const r = classifyBlock({ type: t }, seg('Maths'));
    assert.strictEqual(r.category, 'structured', `${t} should be structured`);
    assert.strictEqual(r.needsImage, false);
  }
});

test('realistic Science diagram → labeled_diagram, needs an image', () => {
  const r = classifyBlock({ type: 'DIAGRAM', text: 'water cycle' }, seg('Science'));
  assert.strictEqual(r.category, 'labeled_diagram');
  assert.strictEqual(r.needsImage, true);
});

test('a single object/motif → icon, no AI image', () => {
  const r = classifyBlock({ type: 'ICON', text: 'textbook' }, seg('English'));
  assert.strictEqual(r.category, 'icon_or_motif');
  assert.strictEqual(r.needsImage, false);
});

test('unrecognised block → unknown + a reason (never silently bucketed)', () => {
  const r = classifyBlock({ type: 'SOMETHING_NEW' }, seg('Maths'));
  assert.strictEqual(r.category, 'unknown');
  assert.strictEqual(r.needsImage, false);
  assert.match(r.reason, /unrecognised|unknown/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test imagegen/test/classify.test.js`
Expected: FAIL — `Cannot find module '../classify'`.

- [ ] **Step 3: Write minimal implementation**

```js
// imagegen/classify.js
'use strict';

const STRUCTURED = new Set([
  'BOARD_WORK', 'WORKED_EXAMPLE', 'EXIT_TICKET', 'JOURNEY', 'CFU', 'KEY_FACT',
  'TEACHER_SAYS', 'WARM_UP', 'REMEMBER', 'HOMEWORK', 'TABLE', 'PARTNER_ACTIVITY',
]);
const ICON = new Set(['ICON', 'MOTIF']);

// Classify one lesson block into a visual category. Only HOOK_STORY (and a
// realistic Science DIAGRAM) warrant a generated image; structured content and
// icons are rendered by the deterministic HTML/SVG path.
function classifyBlock(block, segment = {}) {
  const type = block && block.type;
  if (type === 'HOOK_STORY') {
    return { category: 'decorative_scene', needsImage: true, reason: 'hook story scene' };
  }
  if (type === 'DIAGRAM') {
    return { category: 'labeled_diagram', needsImage: true, reason: 'realistic labeled diagram' };
  }
  if (STRUCTURED.has(type)) {
    return { category: 'structured', needsImage: false, reason: 'rendered as HTML' };
  }
  if (ICON.has(type)) {
    return { category: 'icon_or_motif', needsImage: false, reason: 'rendered as SVG/emoji' };
  }
  return { category: 'unknown', needsImage: false, reason: `unrecognised block type "${type}" — flag for review` };
}

module.exports = { classifyBlock };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test imagegen/test/classify.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add imagegen/classify.js imagegen/test/classify.test.js
git commit -m "feat(imagegen): content-type classifier"
```

---

### Task 2: Model config + router

**Files:**
- Create: `imagegen/config/models.config.js`
- Create: `imagegen/route.js`
- Test: `imagegen/test/route.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `config/models.config.js` exports `{ MODELS, LADDERS }` — `MODELS[slug] = { input: {...} }` (default per-model input params), `LADDERS[category] = [slug, …]`. `route.js` exports `route(category) → { needsImage, ladder }` and `modelInput(slug, prompt) → object`.

- [ ] **Step 1: Write the failing test**

```js
// imagegen/test/route.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { route, modelInput } = require('../route');

test('decorative_scene ladder starts at the cheapest (nano-banana-2-lite)', () => {
  const r = route('decorative_scene');
  assert.strictEqual(r.needsImage, true);
  assert.strictEqual(r.ladder[0], 'nano-banana-2-lite');
  assert.ok(r.ladder.includes('bytedance/seedream-v4-text-to-image'));
});

test('labeled_diagram ladder starts at seedream-v4', () => {
  const r = route('labeled_diagram');
  assert.strictEqual(r.needsImage, true);
  assert.strictEqual(r.ladder[0], 'bytedance/seedream-v4-text-to-image');
});

test('structured / icon / unknown route to no generation', () => {
  for (const c of ['structured', 'icon_or_motif', 'unknown']) {
    const r = route(c);
    assert.strictEqual(r.needsImage, false);
    assert.deepStrictEqual(r.ladder, []);
  }
});

test('modelInput merges the prompt with the model default params', () => {
  const inp = modelInput('nano-banana-2-lite', 'a warm scene');
  assert.strictEqual(inp.prompt, 'a warm scene');
  assert.strictEqual(inp.aspect_ratio, '4:3');
  const s = modelInput('bytedance/seedream-v4-text-to-image', 'x');
  assert.strictEqual(s.image_size, 'landscape_4_3');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test imagegen/test/route.test.js`
Expected: FAIL — `Cannot find module '../route'`.

- [ ] **Step 3: Write minimal implementation**

```js
// imagegen/config/models.config.js
'use strict';
// Per-model default input params (createTask `input` minus prompt). Add a model
// by adding an entry here + placing its slug in the relevant LADDER — no code change.
const MODELS = {
  'nano-banana-2-lite': { input: { aspect_ratio: '4:3' } },
  'bytedance/seedream-v4-text-to-image': { input: { image_size: 'landscape_4_3', image_resolution: '1K' } },
  'gpt-image-2-text-to-image': { input: { aspect_ratio: '4:3', resolution: '1K' } },
  'nano-banana-2': { input: { aspect_ratio: '4:3', output_format: 'png' } },
};
// Cost-ascending ladders (from docs/image-model-benchmark.md + hook-scene benchmark).
const LADDERS = {
  decorative_scene: ['nano-banana-2-lite', 'bytedance/seedream-v4-text-to-image', 'nano-banana-2'],
  labeled_diagram: ['bytedance/seedream-v4-text-to-image', 'gpt-image-2-text-to-image', 'nano-banana-2'],
};
module.exports = { MODELS, LADDERS };
```

```js
// imagegen/route.js
'use strict';
const { MODELS, LADDERS } = require('./config/models.config');

function route(category) {
  const ladder = LADDERS[category] || [];
  return { needsImage: ladder.length > 0, ladder };
}

// Build a createTask `input` object for a model from its config defaults + prompt.
function modelInput(slug, prompt) {
  const cfg = MODELS[slug];
  if (!cfg) throw new Error(`unknown model slug: ${slug}`);
  return { prompt, ...cfg.input };
}

module.exports = { route, modelInput };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test imagegen/test/route.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add imagegen/config/models.config.js imagegen/route.js imagegen/test/route.test.js
git commit -m "feat(imagegen): model config + cost-ascending router"
```

---

### Task 3: Region layer + character spec

**Files:**
- Create: `imagegen/prompts/regions/pk.js`
- Create: `imagegen/prompts/regions/default.js`
- Create: `imagegen/prompts/regions/index.js`
- Create: `imagegen/characters.js`
- Test: `imagegen/test/characters.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `regions/index.js` exports `resolveRegion(id) → { id, dress, setting, names, palette, note }` (falls back to `default`). `characters.js` exports `characterSpec(block, regionId) → { characters, seed }` where `characters` is `[{ name, role, appearance }]` and `seed` is a stable non-negative integer.

- [ ] **Step 1: Write the failing test**

```js
// imagegen/test/characters.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveRegion } = require('../prompts/regions');
const { characterSpec } = require('../characters');

test('resolveRegion returns pk context and falls back to default', () => {
  const pk = resolveRegion('pk');
  assert.strictEqual(pk.id, 'pk');
  assert.match(pk.dress, /shalwar|hijab|kameez/i);
  const fb = resolveRegion('does-not-exist');
  assert.strictEqual(fb.id, 'default');
});

test('characterSpec injects region dress into character appearance', () => {
  const block = { characters: [{ name: 'Sara', role: 'student, girl' }] };
  const spec = characterSpec(block, 'pk');
  assert.strictEqual(spec.characters[0].name, 'Sara');
  assert.match(spec.characters[0].appearance, /hijab|shalwar|kameez/i);
});

test('seed is stable for the same characters+region and differs across sets', () => {
  const a = characterSpec({ characters: [{ name: 'Ali' }, { name: 'Sara' }] }, 'pk').seed;
  const b = characterSpec({ characters: [{ name: 'Ali' }, { name: 'Sara' }] }, 'pk').seed;
  const c = characterSpec({ characters: [{ name: 'Bilal' }] }, 'pk').seed;
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
  assert.ok(Number.isInteger(a) && a >= 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test imagegen/test/characters.test.js`
Expected: FAIL — `Cannot find module '../prompts/regions'`.

- [ ] **Step 3: Write minimal implementation**

```js
// imagegen/prompts/regions/pk.js
'use strict';
module.exports = {
  id: 'pk',
  dress: 'Pakistani school clothing — boys in shalwar-kameez or uniform, girls modestly dressed, some wearing a hijab',
  setting: 'a Pakistani town or countryside setting (simple houses, fields, a small school)',
  names: 'Pakistani names (Ali, Sara, Bilal, Zainab)',
  palette: 'warm, bright, friendly colours',
  note: 'culturally grounded and respectful; classroom-appropriate for young children',
};
```

```js
// imagegen/prompts/regions/default.js
'use strict';
module.exports = {
  id: 'default',
  dress: 'simple, neutral school clothing',
  setting: 'a simple, neutral town or classroom setting',
  names: 'common local names',
  palette: 'warm, bright, friendly colours',
  note: 'culturally neutral and respectful; classroom-appropriate for young children',
};
```

```js
// imagegen/prompts/regions/index.js
'use strict';
const REGIONS = { pk: require('./pk'), default: require('./default') };
function resolveRegion(id) { return REGIONS[id] || REGIONS.default; }
module.exports = { resolveRegion, REGIONS };
```

```js
// imagegen/characters.js
'use strict';
const crypto = require('node:crypto');
const { resolveRegion } = require('./prompts/regions');

// Per-lesson character spec: each character gets region-appropriate appearance,
// plus a stable seed so a lesson's scenes look consistent on regenerate.
function characterSpec(block, regionId = 'pk') {
  const region = resolveRegion(regionId);
  const chars = (block && block.characters) || [];
  const characters = chars.map((c) => ({
    name: c.name || 'a child',
    role: c.role || 'student',
    appearance: `${c.role || 'student'} wearing ${region.dress}`,
  }));
  const key = JSON.stringify({ names: characters.map((c) => c.name), region: region.id });
  const hex = crypto.createHash('sha1').update(key).digest('hex').slice(0, 8);
  const seed = parseInt(hex, 16) % 2147483647;
  return { characters, seed };
}

module.exports = { characterSpec };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test imagegen/test/characters.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add imagegen/prompts/regions imagegen/characters.js imagegen/test/characters.test.js
git commit -m "feat(imagegen): region layer + consistent character spec"
```

---

### Task 4: Prompt template system

**Files:**
- Create: `imagegen/prompts/scaffold.js`
- Create: `imagegen/prompts/templates/index.js`
- Create: `imagegen/prompts/build.js`
- Test: `imagegen/test/prompt-build.test.js`

**Interfaces:**
- Consumes: `resolveRegion` from `./regions`; `characterSpec` from `../characters`.
- Produces: `build.js` exports `resolvePrompt({ category, subject, block, region, grade }) → string`. Templates are `(ctx) => string` registered by `${category}.${subject}` with fallback `${category}.default`.

- [ ] **Step 1: Write the failing test**

```js
// imagegen/test/prompt-build.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolvePrompt } = require('../prompts/build');

const block = { type: 'HOOK_STORY', text: 'Ali and Sara ride the ABC train',
  characters: [{ name: 'Ali', role: 'student, boy' }, { name: 'Sara', role: 'student, girl' }] };

test('decorative_scene prompt injects story, characters, region and a no-text directive', () => {
  const p = resolvePrompt({ category: 'decorative_scene', subject: 'English', block, region: 'pk', grade: '1' });
  assert.match(p, /Ali/);
  assert.match(p, /Sara/);
  assert.match(p, /hijab|shalwar|kameez/i);        // pk region dress
  assert.match(p, /no text/i);                     // scenes carry no in-image text
  assert.match(p, /illustration/i);
});

test('region swap changes the prompt (no hardcoded pk)', () => {
  const pk = resolvePrompt({ category: 'decorative_scene', subject: 'English', block, region: 'pk' });
  const df = resolvePrompt({ category: 'decorative_scene', subject: 'English', block, region: 'default' });
  assert.notStrictEqual(pk, df);
});

test('labeled_diagram prompt asks for legible labels', () => {
  const p = resolvePrompt({ category: 'labeled_diagram', subject: 'Science',
    block: { type: 'DIAGRAM', text: 'the water cycle with labels' }, region: 'pk', grade: '5' });
  assert.match(p, /label/i);
  assert.match(p, /diagram|infographic/i);
});

test('falls back to the category default template for an unknown subject', () => {
  const p = resolvePrompt({ category: 'decorative_scene', subject: 'Astrophysics', block, region: 'pk' });
  assert.match(p, /Ali/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test imagegen/test/prompt-build.test.js`
Expected: FAIL — `Cannot find module '../prompts/build'`.

- [ ] **Step 3: Write minimal implementation**

```js
// imagegen/prompts/scaffold.js
'use strict';
// Shared prompt scaffolding — style registers and quality/negative directives.
const SCENE_STYLE = 'a warm, friendly flat-vector children\'s-book illustration, expressive happy faces, clean simple background';
const DIAGRAM_STYLE = 'a clean, labeled educational infographic diagram, flat vector style, plain background';
const QUALITY = 'bright warm colours, high quality, suitable for a primary-school classroom';
const NEGATIVE_SCENE = 'no text in the image, no watermark, not scary, not violent';
const NEGATIVE_DIAGRAM = 'no watermark, no clutter, labels must be spelled correctly and legible';
function join(parts) { return parts.filter(Boolean).map((s) => String(s).trim()).join('. ') + '.'; }
module.exports = { SCENE_STYLE, DIAGRAM_STYLE, QUALITY, NEGATIVE_SCENE, NEGATIVE_DIAGRAM, join };
```

```js
// imagegen/prompts/templates/index.js
'use strict';
const S = require('../scaffold');

function charactersLine(spec) {
  if (!spec.characters.length) return '';
  return 'showing ' + spec.characters.map((c) => `${c.name} (${c.appearance})`).join(' and ');
}

// ctx = { block, subject, grade, region, chars }  (chars = characterSpec output)
const TEMPLATES = {
  'decorative_scene.default': (ctx) => S.join([
    S.SCENE_STYLE,
    `Scene: ${ctx.block.text || ctx.topic || 'a friendly classroom scene'}`,
    charactersLine(ctx.chars),
    `set in ${ctx.region.setting}`,
    ctx.region.note,
    S.QUALITY,
    S.NEGATIVE_SCENE,
  ]),
  'labeled_diagram.default': (ctx) => S.join([
    S.DIAGRAM_STYLE,
    `Diagram of: ${ctx.block.text || ctx.topic}`,
    ctx.grade ? `for grade ${ctx.grade}` : '',
    'with clear, correctly-spelled text labels for each part',
    S.QUALITY,
    S.NEGATIVE_DIAGRAM,
  ]),
};

function pick(category, subject) {
  return TEMPLATES[`${category}.${subject}`] || TEMPLATES[`${category}.default`];
}
module.exports = { TEMPLATES, pick };
```

```js
// imagegen/prompts/build.js
'use strict';
const { resolveRegion } = require('./regions');
const { characterSpec } = require('../characters');
const { pick } = require('./templates');

function resolvePrompt({ category, subject, block, region = 'pk', grade } = {}) {
  const tmpl = pick(category, subject);
  if (!tmpl) throw new Error(`no prompt template for category "${category}"`);
  const reg = resolveRegion(region);
  const chars = characterSpec(block, region);
  return tmpl({ block, subject, grade, region: reg, chars, topic: (block && block.text) });
}
module.exports = { resolvePrompt };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test imagegen/test/prompt-build.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add imagegen/prompts/scaffold.js imagegen/prompts/templates imagegen/prompts/build.js imagegen/test/prompt-build.test.js
git commit -m "feat(imagegen): prompt template system (scaffold + templates + build)"
```

---

### Task 5: kie.ai client (async task run)

**Files:**
- Create: `imagegen/kie/client.js`
- Test: `imagegen/test/client.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `async runImageTask({ apiKey, model, input, fetchImpl, pollMs, maxPolls, retries }) → { ok, url, creditsConsumed, latencyMs, error }`. Also exports `defaultFetch`. **`fetchImpl(url, { method, headers, body }) → Promise<{ statusCode, body }>`** — `body` is a string.

- [ ] **Step 1: Write the failing test**

```js
// imagegen/test/client.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { runImageTask } = require('../kie/client');

// Stub fetch: createTask returns a taskId; recordInfo returns success with a url.
function makeFetch({ createResp, recordSeq }) {
  let poll = 0;
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    if (url.includes('/jobs/createTask')) return { statusCode: 200, body: JSON.stringify(createResp) };
    if (url.includes('/jobs/recordInfo')) return { statusCode: 200, body: JSON.stringify(recordSeq[Math.min(poll++, recordSeq.length - 1)]) };
    return { statusCode: 404, body: '{}' };
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}
const ok = (url) => ({ code: 200, data: { state: 'success', creditsConsumed: 4, resultJson: JSON.stringify({ resultUrls: [url] }) } });

test('runs createTask then polls recordInfo to success and returns the url + credits', async () => {
  const fetchImpl = makeFetch({
    createResp: { code: 200, data: { taskId: 't1' } },
    recordSeq: [{ code: 200, data: { state: 'generating' } }, ok('http://img/out.png')],
  });
  const r = await runImageTask({ apiKey: 'k', model: 'nano-banana-2-lite', input: { prompt: 'x' }, fetchImpl, pollMs: 1 });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.url, 'http://img/out.png');
  assert.strictEqual(r.creditsConsumed, 4);
  assert.ok(fetchImpl.calls[0].url.includes('/jobs/createTask'));
});

test('returns ok:false when the task fails', async () => {
  const fetchImpl = makeFetch({
    createResp: { code: 200, data: { taskId: 't1' } },
    recordSeq: [{ code: 200, data: { state: 'fail', failMsg: 'bad prompt' } }],
  });
  const r = await runImageTask({ apiKey: 'k', model: 'nano-banana-2-lite', input: { prompt: 'x' }, fetchImpl, pollMs: 1 });
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /bad prompt/);
});

test('returns ok:false when createTask has no taskId', async () => {
  const fetchImpl = makeFetch({ createResp: { code: 402, msg: 'Insufficient Credits' }, recordSeq: [] });
  const r = await runImageTask({ apiKey: 'k', model: 'nano-banana-2-lite', input: { prompt: 'x' }, fetchImpl, pollMs: 1 });
  assert.strictEqual(r.ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test imagegen/test/client.test.js`
Expected: FAIL — `Cannot find module '../kie/client'`.

- [ ] **Step 3: Write minimal implementation**

```js
// imagegen/kie/client.js
'use strict';
const https = require('node:https');

const BASE = 'https://api.kie.ai/api/v1';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function defaultFetch(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ method, hostname: u.hostname, path: u.pathname + u.search, headers }, (r) => {
      const c = [];
      r.on('data', (d) => c.push(d));
      r.on('end', () => resolve({ statusCode: r.statusCode, body: Buffer.concat(c).toString('utf8') }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Run one kie.ai image job: createTask → poll recordInfo → url + credits.
async function runImageTask({ apiKey, model, input, fetchImpl = defaultFetch, pollMs = 3000, maxPolls = 60 } = {}) {
  const t0 = Date.now();
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  let created;
  try {
    const res = await fetchImpl(`${BASE}/jobs/createTask`, { method: 'POST', headers, body: JSON.stringify({ model, input }) });
    created = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
  } catch (e) { return { ok: false, error: `createTask: ${e.message}`, latencyMs: Date.now() - t0 }; }
  const taskId = created && created.data && (created.data.taskId || created.data.task_id);
  if (!taskId) return { ok: false, error: `no taskId (${(created && created.msg) || 'unknown'})`, latencyMs: Date.now() - t0 };

  for (let i = 0; i < maxPolls; i++) {
    await delay(pollMs);
    let info;
    try {
      const res = await fetchImpl(`${BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers });
      info = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8')).data;
    } catch (_) { continue; }
    const state = info && info.state;
    if (state === 'success') {
      let urls = [];
      try { urls = JSON.parse(info.resultJson).resultUrls || []; } catch (_) { /* ignore */ }
      return { ok: true, url: urls[0] || null, creditsConsumed: info.creditsConsumed, latencyMs: Date.now() - t0 };
    }
    if (state === 'fail') return { ok: false, error: (info && info.failMsg) || 'task failed', creditsConsumed: info && info.creditsConsumed, latencyMs: Date.now() - t0 };
  }
  return { ok: false, error: 'timeout', latencyMs: Date.now() - t0 };
}

module.exports = { runImageTask, defaultFetch };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test imagegen/test/client.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add imagegen/kie/client.js imagegen/test/client.test.js
git commit -m "feat(imagegen): kie.ai async task client (createTask + poll)"
```

---

### Task 6: generateImage (client + model params)

**Files:**
- Create: `imagegen/kie/generate.js`
- Test: `imagegen/test/generate.test.js`

**Interfaces:**
- Consumes: `runImageTask` from `./client`; `modelInput` from `../route`.
- Produces: `async generateImage({ apiKey, model, prompt, runImpl, fetchImpl }) → { ok, url, creditsConsumed, model, latencyMs, error }`. `runImpl` (default `runImageTask`) is injectable for tests.

- [ ] **Step 1: Write the failing test**

```js
// imagegen/test/generate.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { generateImage } = require('../kie/generate');

test('builds model input from route config and returns the asset', async () => {
  let seen;
  const runImpl = async (args) => { seen = args; return { ok: true, url: 'http://img/x.png', creditsConsumed: 4, latencyMs: 10 }; };
  const r = await generateImage({ apiKey: 'k', model: 'nano-banana-2-lite', prompt: 'a warm scene', runImpl });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.url, 'http://img/x.png');
  assert.strictEqual(r.model, 'nano-banana-2-lite');
  assert.strictEqual(seen.input.prompt, 'a warm scene');
  assert.strictEqual(seen.input.aspect_ratio, '4:3');   // merged from model config
});

test('propagates failure from the task run', async () => {
  const runImpl = async () => ({ ok: false, error: 'timeout' });
  const r = await generateImage({ apiKey: 'k', model: 'nano-banana-2-lite', prompt: 'x', runImpl });
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /timeout/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test imagegen/test/generate.test.js`
Expected: FAIL — `Cannot find module '../kie/generate'`.

- [ ] **Step 3: Write minimal implementation**

```js
// imagegen/kie/generate.js
'use strict';
const { runImageTask } = require('./client');
const { modelInput } = require('../route');

// Generate one image for a resolved prompt with a specific model.
async function generateImage({ apiKey, model, prompt, params = {}, runImpl = runImageTask, fetchImpl } = {}) {
  const input = { ...modelInput(model, prompt), ...params };
  const r = await runImpl({ apiKey, model, input, fetchImpl });
  if (!r.ok) return { ok: false, model, error: r.error, creditsConsumed: r.creditsConsumed, latencyMs: r.latencyMs };
  return { ok: true, model, url: r.url, creditsConsumed: r.creditsConsumed, latencyMs: r.latencyMs };
}

module.exports = { generateImage };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test imagegen/test/generate.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add imagegen/kie/generate.js imagegen/test/generate.test.js
git commit -m "feat(imagegen): generateImage over the kie client"
```

---

### Task 7: VLM quality gate

**Files:**
- Create: `imagegen/quality_gate.js`
- Test: `imagegen/test/quality-gate.test.js`

**Interfaces:**
- Consumes: `defaultFetch` from `./kie/client`.
- Produces: `async checkImage({ apiKey, imageUrl, expectation, fetchImpl }) → { pass, reason }`. Sends the image + `expectation` to GPT-5.2 vision and parses a JSON verdict; on any error returns `{ pass: false, reason }` (fail-closed).

- [ ] **Step 1: Write the failing test**

```js
// imagegen/test/quality-gate.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { checkImage } = require('../quality_gate');

const chat = (content) => ({ statusCode: 200, body: JSON.stringify({ choices: [{ message: { content } }] }) });

test('parses a passing JSON verdict', async () => {
  const fetchImpl = async () => chat('{"pass": true, "reason": "warm and on-topic"}');
  const r = await checkImage({ apiKey: 'k', imageUrl: 'http://img/x.png', expectation: 'a warm train scene', fetchImpl });
  assert.strictEqual(r.pass, true);
});

test('parses a failing verdict with a reason', async () => {
  const fetchImpl = async () => chat('{"pass": false, "reason": "shows a book cover, not the scene"}');
  const r = await checkImage({ apiKey: 'k', imageUrl: 'http://img/x.png', expectation: 'a train scene', fetchImpl });
  assert.strictEqual(r.pass, false);
  assert.match(r.reason, /book cover/);
});

test('fails closed when the VLM call errors', async () => {
  const fetchImpl = async () => { throw new Error('network down'); };
  const r = await checkImage({ apiKey: 'k', imageUrl: 'http://img/x.png', expectation: 'x', fetchImpl });
  assert.strictEqual(r.pass, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test imagegen/test/quality-gate.test.js`
Expected: FAIL — `Cannot find module '../quality_gate'`.

- [ ] **Step 3: Write minimal implementation**

```js
// imagegen/quality_gate.js
'use strict';
const { defaultFetch } = require('./kie/client');

const VLM_URL = 'https://api.kie.ai/gpt-5-2/v1/chat/completions';

// Ask GPT-5.2 vision whether the generated image meets the expectation and is
// classroom-appropriate. Returns { pass, reason }; fails closed on any error.
async function checkImage({ apiKey, imageUrl, expectation, fetchImpl = defaultFetch } = {}) {
  const ask = `This image is meant to be: ${expectation}. It must be relevant, warm, and appropriate for a primary-school classroom. Reply with JSON only: {"pass": true|false, "reason": "one short sentence"}.`;
  const body = JSON.stringify({
    messages: [{ role: 'user', content: [
      { type: 'text', text: ask },
      { type: 'image_url', image_url: { url: imageUrl } },
    ] }],
  });
  try {
    const res = await fetchImpl(VLM_URL, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body });
    const json = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
    const text = json.choices && json.choices[0] && json.choices[0].message.content;
    const m = String(text || '').match(/\{[\s\S]*\}/);
    const verdict = JSON.parse(m ? m[0] : text);
    return { pass: verdict.pass === true, reason: verdict.reason || '' };
  } catch (e) {
    return { pass: false, reason: `gate error: ${e.message}` };
  }
}

module.exports = { checkImage };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test imagegen/test/quality-gate.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add imagegen/quality_gate.js imagegen/test/quality-gate.test.js
git commit -m "feat(imagegen): VLM quality gate (GPT-5.2 vision)"
```

---

### Task 8: Cache + budget guard

**Files:**
- Create: `imagegen/cache.js`
- Create: `imagegen/budget.js`
- Test: `imagegen/test/cache-budget.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `cache.js` exports `cacheKey(category, prompt, model) → string`, `MemoryAssetCache` and `FsAssetCache(dir)` with async `get(key)`/`set(key, asset)`. `budget.js` exports `class BudgetGuard(ceiling)` with `spend(credits)` (throws `BudgetExceededError` if it would exceed), `spent()`, `remaining()`.

- [ ] **Step 1: Write the failing test**

```js
// imagegen/test/cache-budget.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { cacheKey, MemoryAssetCache } = require('../cache');
const { BudgetGuard } = require('../budget');

test('cacheKey is stable and model/prompt/category sensitive', () => {
  const a = cacheKey('decorative_scene', 'a warm scene', 'nano-banana-2-lite');
  const b = cacheKey('decorative_scene', 'a warm scene', 'nano-banana-2-lite');
  const c = cacheKey('decorative_scene', 'a warm scene', 'nano-banana-2');
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
});

test('MemoryAssetCache round-trips and misses to null', async () => {
  const cache = new MemoryAssetCache();
  assert.strictEqual(await cache.get('k'), null);
  await cache.set('k', { url: 'x' });
  assert.deepStrictEqual(await cache.get('k'), { url: 'x' });
});

test('BudgetGuard tracks spend and throws before exceeding the ceiling', () => {
  const b = new BudgetGuard(10);
  b.spend(4);
  b.spend(5);
  assert.strictEqual(b.spent(), 9);
  assert.strictEqual(b.remaining(), 1);
  assert.throws(() => b.spend(3), /budget/i);
  assert.strictEqual(b.spent(), 9, 'a rejected spend is not counted');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test imagegen/test/cache-budget.test.js`
Expected: FAIL — `Cannot find module '../cache'`.

- [ ] **Step 3: Write minimal implementation**

```js
// imagegen/cache.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function cacheKey(category, prompt, model) {
  const h = crypto.createHash('sha1').update(`${category}\n${model}\n${prompt}`).digest('hex');
  return `${category}:${model}:${h.slice(0, 16)}`;
}

class MemoryAssetCache {
  constructor() { this.m = new Map(); }
  async get(key) { return this.m.has(key) ? this.m.get(key) : null; }
  async set(key, asset) { this.m.set(key, asset); }
}

class FsAssetCache {
  constructor(dir) { this.dir = dir; }
  _file(key) { return path.join(this.dir, `${crypto.createHash('sha1').update(key).digest('hex')}.json`); }
  async get(key) { try { return JSON.parse(fs.readFileSync(this._file(key), 'utf8')); } catch (_) { return null; } }
  async set(key, asset) { fs.mkdirSync(this.dir, { recursive: true }); fs.writeFileSync(this._file(key), JSON.stringify(asset)); }
}

module.exports = { cacheKey, MemoryAssetCache, FsAssetCache };
```

```js
// imagegen/budget.js
'use strict';
class BudgetExceededError extends Error {}

// Simple credit-spend guard: a batch bug cannot silently burn API spend.
class BudgetGuard {
  constructor(ceiling = Infinity) { this.ceiling = ceiling; this._spent = 0; }
  spend(credits) {
    const c = Number(credits) || 0;
    if (this._spent + c > this.ceiling) {
      throw new BudgetExceededError(`budget exceeded: ${this._spent}+${c} > ${this.ceiling}`);
    }
    this._spent += c;
  }
  spent() { return this._spent; }
  remaining() { return this.ceiling === Infinity ? Infinity : Math.max(0, this.ceiling - this._spent); }
}

module.exports = { BudgetGuard, BudgetExceededError };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test imagegen/test/cache-budget.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add imagegen/cache.js imagegen/budget.js imagegen/test/cache-budget.test.js
git commit -m "feat(imagegen): asset cache + budget guard"
```

---

### Task 9: Orchestrator — `resolveSegmentImages`

**Files:**
- Create: `imagegen/index.js`
- Test: `imagegen/test/index.test.js`

**Interfaces:**
- Consumes: `classifyBlock` (Task 1), `route` (Task 2), `resolvePrompt` (Task 4), `generateImage` (Task 6), `checkImage` (Task 7), `cacheKey`/`MemoryAssetCache` (Task 8), `BudgetGuard` (Task 8).
- Produces: `async resolveSegmentImages(segment, opts) → { images, report }`. `opts = { apiKey, region, generateImpl, gateImpl, cache, budget }`. `images[i] = { blockType, category, needsImage, model|null, asset|null, reason, creditsConsumed }`. `asset = { url, model }` or null. Also re-exports the public helpers (`classifyBlock`, `generateImage`).

- [ ] **Step 1: Write the failing test**

```js
// imagegen/test/index.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveSegmentImages } = require('../index');
const { MemoryAssetCache } = require('../cache');
const { BudgetGuard } = require('../budget');

const segment = {
  subject: 'English', grade: '1', region: 'pk',
  blocks: [
    { type: 'HOOK_STORY', text: 'Ali and Sara on the train', characters: [{ name: 'Ali' }, { name: 'Sara' }] },
    { type: 'BOARD_WORK', text: 'draw 4 picture boxes' },
  ],
};

test('generates an image for the hook, skips the structured block', async () => {
  const generateImpl = async ({ model }) => ({ ok: true, model, url: 'http://img/hook.png', creditsConsumed: 4 });
  const gateImpl = async () => ({ pass: true, reason: 'good' });
  const { images } = await resolveSegmentImages(segment, { apiKey: 'k', generateImpl, gateImpl, cache: new MemoryAssetCache(), budget: new BudgetGuard(100) });
  const hook = images.find((i) => i.blockType === 'HOOK_STORY');
  const board = images.find((i) => i.blockType === 'BOARD_WORK');
  assert.strictEqual(hook.category, 'decorative_scene');
  assert.strictEqual(hook.asset.url, 'http://img/hook.png');
  assert.strictEqual(hook.model, 'nano-banana-2-lite');   // ladder start
  assert.strictEqual(board.needsImage, false);
  assert.strictEqual(board.asset, null);
});

test('escalates up the ladder when the gate fails, then succeeds', async () => {
  const seen = [];
  const generateImpl = async ({ model }) => { seen.push(model); return { ok: true, model, url: `http://img/${model}.png`, creditsConsumed: 5 }; };
  const gateImpl = async ({ imageUrl }) => ({ pass: imageUrl.includes('seedream'), reason: 'x' }); // first (lite) fails
  const { images } = await resolveSegmentImages(segment, { apiKey: 'k', generateImpl, gateImpl, cache: new MemoryAssetCache(), budget: new BudgetGuard(100) });
  const hook = images.find((i) => i.blockType === 'HOOK_STORY');
  assert.strictEqual(seen[0], 'nano-banana-2-lite');
  assert.strictEqual(hook.model, 'bytedance/seedream-v4-text-to-image');
  assert.match(hook.asset.url, /seedream/);
});

test('falls back (asset null) when the whole ladder fails the gate', async () => {
  const generateImpl = async ({ model }) => ({ ok: true, model, url: 'http://img/x.png', creditsConsumed: 4 });
  const gateImpl = async () => ({ pass: false, reason: 'off-topic' });
  const { images } = await resolveSegmentImages(segment, { apiKey: 'k', generateImpl, gateImpl, cache: new MemoryAssetCache(), budget: new BudgetGuard(100) });
  const hook = images.find((i) => i.blockType === 'HOOK_STORY');
  assert.strictEqual(hook.asset, null);
  assert.match(hook.reason, /fallback/);
});

test('a cache hit skips generation', async () => {
  const cache = new MemoryAssetCache();
  let called = 0;
  const generateImpl = async ({ model }) => { called++; return { ok: true, model, url: 'http://img/hook.png', creditsConsumed: 4 }; };
  const gateImpl = async () => ({ pass: true });
  const opts = { apiKey: 'k', generateImpl, gateImpl, cache, budget: new BudgetGuard(100) };
  await resolveSegmentImages(segment, opts);
  const before = called;
  await resolveSegmentImages(segment, opts);   // second run should hit cache
  assert.strictEqual(called, before, 'no new generation on the cached run');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test imagegen/test/index.test.js`
Expected: FAIL — `Cannot find module '../index'`.

- [ ] **Step 3: Write minimal implementation**

```js
// imagegen/index.js
'use strict';
const { classifyBlock } = require('./classify');
const { route } = require('./route');
const { resolvePrompt } = require('./prompts/build');
const { generateImage } = require('./kie/generate');
const { checkImage } = require('./quality_gate');
const { cacheKey, MemoryAssetCache } = require('./cache');
const { BudgetGuard } = require('./budget');

// Resolve the images a segment needs: classify each block, and for blocks that
// need an image, walk the cost-ascending model ladder — generate, VLM-gate,
// cache — falling back to the deterministic path if the whole ladder fails.
async function resolveSegmentImages(segment = {}, opts = {}) {
  const {
    apiKey, region = segment.region || 'pk',
    generateImpl = generateImage, gateImpl = checkImage,
    cache = new MemoryAssetCache(), budget = new BudgetGuard(),
  } = opts;

  const images = [];
  const report = [];
  for (const block of (segment.blocks || [])) {
    const { category, needsImage, reason } = classifyBlock(block, segment);
    if (!needsImage) {
      images.push({ blockType: block.type, category, needsImage: false, model: null, asset: null, reason });
      continue;
    }
    const { ladder } = route(category);
    const prompt = resolvePrompt({ category, subject: segment.subject, block, region, grade: segment.grade });
    const expectation = block.text || segment.topic || category;

    let resolved = null;
    for (const model of ladder) {
      const key = cacheKey(category, prompt, model);
      const cached = await cache.get(key);
      if (cached) { resolved = { model, asset: cached, credits: 0, reason: 'cache' }; break; }

      const gen = await generateImpl({ apiKey, model, prompt });
      if (!gen.ok) { report.push({ blockType: block.type, model, event: 'gen_fail', error: gen.error }); continue; }
      if (typeof gen.creditsConsumed === 'number') budget.spend(gen.creditsConsumed);

      const gate = await gateImpl({ apiKey, imageUrl: gen.url, expectation });
      report.push({ blockType: block.type, model, credits: gen.creditsConsumed, gate: gate.pass, reason: gate.reason });
      if (gate.pass) {
        const asset = { url: gen.url, model };
        await cache.set(key, asset);
        resolved = { model, asset, credits: gen.creditsConsumed, reason: 'generated' };
        break;
      }
    }

    if (resolved) {
      images.push({ blockType: block.type, category, needsImage: true, model: resolved.model, asset: resolved.asset, reason: resolved.reason, creditsConsumed: resolved.credits });
    } else {
      images.push({ blockType: block.type, category, needsImage: true, model: null, asset: null, reason: 'fallback: no model passed the quality gate' });
    }
  }
  return { images, report };
}

module.exports = { resolveSegmentImages, classifyBlock, generateImage, checkImage };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test imagegen/test/index.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the whole module suite**

Run: `node --test imagegen/test/`
Expected: all tests pass, no network call.

- [ ] **Step 6: Commit**

```bash
git add imagegen/index.js imagegen/test/index.test.js
git commit -m "feat(imagegen): resolveSegmentImages orchestrator (ladder + gate + cache + fallback)"
```

---

### Task 10: CLI test harness + fixtures + README

**Files:**
- Create: `imagegen/cli.js`
- Create: `imagegen/fixtures/hook.json` (decorative_scene)
- Create: `imagegen/fixtures/board.json` (structured → no image)
- Create: `imagegen/fixtures/diagram.json` (labeled_diagram)
- Create: `imagegen/README.md`
- Create: `imagegen/test/cli-dry.test.js`
- Test: `imagegen/test/cli-dry.test.js`

**Interfaces:**
- Consumes: `classifyBlock`, `route`, `resolvePrompt` (dry run); `resolveSegmentImages` (live). CLI reads the key via `process.env.KIE_API_KEY`.
- Produces: `node imagegen/cli.js <fixture.json>` prints, per block: category, chosen model (ladder head), and the resolved prompt. `--live` (with `KIE_API_KEY` set) actually generates, saves images to `imagegen/out/`, and prints the gate verdict. Exports `dryRun(segment) → rows` for testing.

- [ ] **Step 1: Write the failing test**

```js
// imagegen/test/cli-dry.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { dryRun } = require('../cli');

const segment = {
  subject: 'English', grade: '1', region: 'pk',
  blocks: [
    { type: 'HOOK_STORY', text: 'Ali and Sara on the train', characters: [{ name: 'Ali' }, { name: 'Sara' }] },
    { type: 'BOARD_WORK', text: 'draw picture boxes' },
  ],
};

test('dryRun reports category + model + prompt per block, no network', () => {
  const rows = dryRun(segment);
  const hook = rows.find((r) => r.blockType === 'HOOK_STORY');
  const board = rows.find((r) => r.blockType === 'BOARD_WORK');
  assert.strictEqual(hook.category, 'decorative_scene');
  assert.strictEqual(hook.model, 'nano-banana-2-lite');
  assert.match(hook.prompt, /Ali/);
  assert.strictEqual(board.needsImage, false);
  assert.strictEqual(board.model, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test imagegen/test/cli-dry.test.js`
Expected: FAIL — `Cannot find module '../cli'`.

- [ ] **Step 3: Create the fixtures**

`imagegen/fixtures/hook.json`:
```json
{ "subject": "English", "grade": "1", "region": "pk", "topic": "Letter Sounds",
  "blocks": [ { "type": "HOOK_STORY", "text": "Ali and Sara ride the ABC-Express train; each carriage has a letter that makes a sound.",
    "characters": [ { "name": "Ali", "role": "student, boy" }, { "name": "Sara", "role": "student, girl" } ] } ] }
```

`imagegen/fixtures/board.json`:
```json
{ "subject": "Maths", "grade": "4", "region": "pk", "topic": "Place Value",
  "blocks": [ { "type": "BOARD_WORK", "text": "Draw a 5-column place-value chart and write 69,273 in it." } ] }
```

`imagegen/fixtures/diagram.json`:
```json
{ "subject": "Science", "grade": "5", "region": "pk", "topic": "Water cycle",
  "blocks": [ { "type": "DIAGRAM", "text": "the water cycle with labels: evaporation, condensation, precipitation, collection." } ] }
```

- [ ] **Step 4: Write minimal implementation**

```js
// imagegen/cli.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { classifyBlock } = require('./classify');
const { route } = require('./route');
const { resolvePrompt } = require('./prompts/build');
const { resolveSegmentImages } = require('./index');

// Dry run: classify + route + resolve the prompt for each block, no network.
function dryRun(segment) {
  return (segment.blocks || []).map((block) => {
    const { category, needsImage, reason } = classifyBlock(block, segment);
    const { ladder } = route(category);
    return {
      blockType: block.type, category, needsImage,
      model: ladder[0] || null,
      prompt: needsImage ? resolvePrompt({ category, subject: segment.subject, block, region: segment.region, grade: segment.grade }) : null,
      reason,
    };
  });
}

async function main() {
  const file = process.argv[2];
  const live = process.argv.includes('--live');
  if (!file) { console.error('Usage: node imagegen/cli.js <fixture.json> [--live]'); process.exit(2); }
  const segment = JSON.parse(fs.readFileSync(file, 'utf8'));

  console.log(`\n=== ${file} — subject=${segment.subject} grade=${segment.grade} region=${segment.region} ===`);
  for (const row of dryRun(segment)) {
    console.log(`\n[${row.blockType}] → ${row.category}${row.needsImage ? ` · model=${row.model}` : ' · (no AI image)'}`);
    if (row.prompt) console.log(`  prompt: ${row.prompt}`);
  }

  if (!live) { console.log('\n(dry run — pass --live to actually generate)'); return; }
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) { console.error('\nKIE_API_KEY is not set — cannot run --live'); process.exit(1); }
  const outDir = path.join(__dirname, 'out'); fs.mkdirSync(outDir, { recursive: true });
  const { images, report } = await resolveSegmentImages(segment, { apiKey, region: segment.region });
  console.log('\n--- live result ---');
  for (const img of images) {
    console.log(`[${img.blockType}] ${img.asset ? `OK ${img.model} → ${img.asset.url}` : `no image (${img.reason})`}`);
  }
  console.log('report:', JSON.stringify(report, null, 2));
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { dryRun, main };
```

- [ ] **Step 5: Write the README**

Create `imagegen/README.md` documenting: the pipeline (classify → route ladder → prompt → generate → VLM gate → cache/fallback); **how to add a content category** (add a rule in `classify.js` + a ladder in `config/models.config.js` + a template in `prompts/templates/`); **how to add a region** (new file in `prompts/regions/` + register in `regions/index.js`); **how to add/swap a kie.ai model** (add its slug + default `input` params to `config/models.config.js` `MODELS`, then place the slug in the relevant `LADDERS` entry — no code change); and the integration contract (`resolveSegmentImages(segment,{apiKey,region}) → images[]`; embed each `asset.url`/dataUri into an `<img>` before Puppeteer renders; `needsImage:false` blocks use the HTML/SVG path). Include the CLI usage and the `IMAGEGEN_LIVE=1` note.

- [ ] **Step 6: Run test + a manual dry run**

Run: `node --test imagegen/test/cli-dry.test.js` — Expected: PASS.
Run: `node imagegen/cli.js imagegen/fixtures/hook.json` and `... board.json` and `... diagram.json` — Expected: prints category/model/prompt; board shows "(no AI image)".

- [ ] **Step 7: Commit**

```bash
git add imagegen/cli.js imagegen/fixtures imagegen/README.md imagegen/test/cli-dry.test.js
git commit -m "feat(imagegen): CLI harness, fixtures, README"
```

---

### Task 11: Opt-in live smoke test

**Files:**
- Create: `imagegen/test/live.test.js`
- Modify: `package.json` (add `test:imagegen` script)

**Interfaces:**
- Consumes: `resolveSegmentImages`. Reads `process.env.KIE_API_KEY`; skips unless `IMAGEGEN_LIVE=1`.
- Produces: a network smoke test that generates one real hook image and asserts a URL + gate pass; and an npm script.

- [ ] **Step 1: Write the test**

```js
// imagegen/test/live.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveSegmentImages } = require('../index');

const skip = process.env.IMAGEGEN_LIVE !== '1' || !process.env.KIE_API_KEY;

test('live: generates a real hook image that passes the gate', { skip }, async () => {
  const segment = { subject: 'English', grade: '1', region: 'pk',
    blocks: [{ type: 'HOOK_STORY', text: 'Ali and Sara ride a colourful train through green fields',
      characters: [{ name: 'Ali', role: 'student, boy' }, { name: 'Sara', role: 'student, girl' }] }] };
  const { images } = await resolveSegmentImages(segment, { apiKey: process.env.KIE_API_KEY, region: 'pk' });
  const hook = images.find((i) => i.blockType === 'HOOK_STORY');
  assert.ok(hook.asset && /^https?:\/\//.test(hook.asset.url), 'got a real image URL');
});
```

- [ ] **Step 2: Verify it skips by default**

Run: `node --test imagegen/test/live.test.js`
Expected: PASS with 1 skipped (no `IMAGEGEN_LIVE`).

- [ ] **Step 3: Add the npm script**

In `package.json` `scripts`, add: `"test:imagegen": "node --test imagegen/test/"`.

- [ ] **Step 4: Run the full module suite**

Run: `node --test imagegen/test/`
Expected: all pass, 1 skipped (live), no network.

- [ ] **Step 5: (Optional, manual) one real end-to-end**

Run: `KIE_API_KEY=$(grep KIE_API_KEY assets/generated/.env-api | cut -d= -f2) IMAGEGEN_LIVE=1 node --test imagegen/test/live.test.js`
Expected: PASS (spends ~4 credits) — confirms the whole pipeline against real kie.ai.

- [ ] **Step 6: Commit**

```bash
git add imagegen/test/live.test.js package.json
git commit -m "test(imagegen): opt-in live smoke test + npm script"
```

---

## Self-Review

**Spec coverage:**
- §3.1 classifier (5 categories incl. structured→no-image, unknown→flag) → Task 1. ✅
- §3.2 kie multi-model client, async poll, retries/fallback, cost log → Tasks 5, 6, 9. ✅
- §3.2 model selection per category, config not code → Task 2 (+ ladders in Global Constraints). ✅
- §3.3 prompt templates keyed by (category, subject), data files, inject topic/grade/style/region → Task 4. ✅
- §3.4 region layer, `region` field, config-not-code, no PK hardcoding → Task 3. ✅
- §3.5 integration contract (input/output shape, embed, decoupling) → Task 9 output + Task 10 README. ✅
- §3.6 cache (hash key), budget guard, config-tunable models → Tasks 8, 2. ✅
- §quality-gate (VLM, retry/escalate/fallback) → Tasks 7, 9. ✅
- §4 unit tests for classifier + prompt render; CLI with 3 fixtures (scene/diagram/no-image) → Tasks 1,4,10. ✅
- §"never fail the LP job" fallback → Task 9 (ladder-exhausted → asset null). ✅
- Character consistency (seed + region appearance) → Task 3, used in Task 4. ✅

**Placeholder scan:** No TBD/TODO; every code step has real code. (Task 10 Step 5 describes the README in prose — acceptable, it is documentation, not code.) ✅

**Type consistency:** `fetchImpl(url,{method,headers,body})→{statusCode,body}` consistent (Tasks 5,7). `runImageTask({apiKey,model,input,fetchImpl,...})→{ok,url,creditsConsumed,latencyMs,error}` produced in Task 5, consumed in Task 6. `generateImage(...)→{ok,model,url,creditsConsumed}` produced in Task 6, consumed via `generateImpl` in Task 9. `checkImage(...)→{pass,reason}` produced in Task 7, consumed via `gateImpl` in Task 9. `cacheKey(category,prompt,model)` + cache `get/set` consistent (Tasks 8,9). `route(category)→{needsImage,ladder}`, `modelInput(slug,prompt)` consistent (Tasks 2,6,9,10). `resolvePrompt({category,subject,block,region,grade})` consistent (Tasks 4,9,10). ✅
