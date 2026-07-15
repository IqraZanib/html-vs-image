# Code-Rendered Lesson-Plan Image Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a POC that turns a lesson-plan request into a PNG image by having Claude write self-contained HTML/CSS/SVG which is then rendered locally with Puppeteer — no AI image model anywhere — plus a benchmark comparing Claude model tiers and a minimal web form.

**Architecture:** A pipeline of small, independently-testable CommonJS modules: `promptBuilder` → `llmClient` (Claude) → `validateHtml` → `renderer` (Puppeteer), orchestrated by `generate` with a validate/overflow retry loop. A `benchmark` harness runs a golden test set across models and emits a gallery report. A minimal Express web form calls `generate`.

**Tech Stack:** Node.js (v20+, CommonJS), Puppeteer (already installed), `@anthropic-ai/sdk`, Express, `@fontsource` Noto fonts, Node's built-in test runner (`node --test`).

## Global Constraints

- **No AI image model anywhere in the pipeline.** Images are produced ONLY by rendering code with Puppeteer. Claude is used only to write HTML/CSS/SVG text.
- **Claude models only** for code generation. Exact model IDs: `claude-haiku-4-5`, `claude-sonnet-5`, `claude-opus-4-8`. Never append date suffixes.
- **Generated HTML must be self-contained:** no `http://` / `https://` references (no external images, no Google Fonts links). Fonts are bundled locally and injected by the renderer.
- **Fonts bundled locally:** Noto Nastaliq Urdu (Urdu), Noto Naskh Arabic (Sindhi/Arabic), Noto Sans (Latin). Renderer waits for `document.fonts.ready` before screenshotting.
- **Page format:** A4 (210mm wide). Horizontal overflow is a failure; vertical multi-page flow is allowed.
- **All documentation in English.** Lesson-plan *content* may be in the target language (Urdu/Sindhi).
- **Prerequisite:** an Anthropic API key must be available (`ANTHROPIC_API_KEY` env var, or `ant auth login`). No image-model key is needed. Tests that call the real API are opt-in (skipped without a key); all core logic is tested with injected stubs.
- **CommonJS** (`require`/`module.exports`) to match the existing `render.js`. Test files run under `node --test`.

---

### Task 1: Project setup + model cost table

**Files:**
- Modify: `package.json`
- Create: `src/models.js`
- Test: `test/models.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `MODELS` — object keyed by model ID → `{ inPricePerM: number, outPricePerM: number, label: string }`.
  - `costUsd(model: string, tokensIn: number, tokensOut: number) → number` — USD cost, throws on unknown model.

- [ ] **Step 1: Install dependencies**

Run:
```bash
cd /home/orenda/html-vs-image
npm install @anthropic-ai/sdk express @fontsource/noto-nastaliq-urdu @fontsource/noto-naskh-arabic @fontsource/noto-sans
```
Expected: packages added to `package.json` dependencies, no errors.

- [ ] **Step 2: Add the test script to package.json**

In `package.json`, replace the `scripts` block with:
```json
  "scripts": {
    "test": "node --test",
    "render": "node render.js"
  },
```

- [ ] **Step 3: Write the failing test**

Create `test/models.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { MODELS, costUsd } = require('../src/models');

test('MODELS contains the three benchmark models', () => {
  assert.ok(MODELS['claude-haiku-4-5']);
  assert.ok(MODELS['claude-sonnet-5']);
  assert.ok(MODELS['claude-opus-4-8']);
});

test('costUsd computes input+output cost per million tokens', () => {
  // haiku: $1/M in, $5/M out. 1_000_000 in + 200_000 out = 1.00 + 1.00 = 2.00
  assert.strictEqual(costUsd('claude-haiku-4-5', 1_000_000, 200_000), 2.0);
});

test('costUsd throws on unknown model', () => {
  assert.throws(() => costUsd('gpt-4', 1, 1), /unknown model/i);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `node --test test/models.test.js`
Expected: FAIL — `Cannot find module '../src/models'`.

- [ ] **Step 5: Write the implementation**

Create `src/models.js`:
```js
const MODELS = {
  'claude-haiku-4-5': { label: 'Claude Haiku 4.5', inPricePerM: 1.0, outPricePerM: 5.0 },
  'claude-sonnet-5': { label: 'Claude Sonnet 5', inPricePerM: 3.0, outPricePerM: 15.0 },
  'claude-opus-4-8': { label: 'Claude Opus 4.8', inPricePerM: 5.0, outPricePerM: 25.0 },
};

function costUsd(model, tokensIn, tokensOut) {
  const m = MODELS[model];
  if (!m) throw new Error(`unknown model: ${model}`);
  return (tokensIn / 1e6) * m.inPricePerM + (tokensOut / 1e6) * m.outPricePerM;
}

module.exports = { MODELS, costUsd };
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test test/models.test.js`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/models.js test/models.test.js
git commit -m "feat: add model cost table and project deps"
```

---

### Task 2: Bundled-font configuration

**Files:**
- Create: `src/fonts.js`
- Test: `test/fonts.test.js`

**Interfaces:**
- Consumes: `@fontsource/*` packages installed in Task 1.
- Produces:
  - `FONTS` — array of `{ family: string, path: string }` (absolute paths to woff2 files).
  - `fontFaceCss() → string` — `@font-face` CSS rules referencing the local files via `file://` URLs.

- [ ] **Step 1: Write the failing test**

Create `test/fonts.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { FONTS, fontFaceCss } = require('../src/fonts');

test('FONTS resolves three families to existing woff2 files', () => {
  const families = FONTS.map((f) => f.family);
  assert.ok(families.includes('Noto Nastaliq Urdu'));
  assert.ok(families.includes('Noto Naskh Arabic'));
  assert.ok(families.includes('Noto Sans'));
  for (const f of FONTS) {
    assert.ok(fs.existsSync(f.path), `font file missing: ${f.path}`);
  }
});

test('fontFaceCss emits one @font-face per family with file:// URL', () => {
  const css = fontFaceCss();
  assert.match(css, /@font-face/);
  assert.match(css, /Noto Nastaliq Urdu/);
  assert.match(css, /file:\/\//);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/fonts.test.js`
Expected: FAIL — `Cannot find module '../src/fonts'`.

- [ ] **Step 3: Write the implementation**

Create `src/fonts.js`:
```js
const fs = require('node:fs');
const path = require('node:path');

function resolveFont(pkg, pattern) {
  const dir = path.join(__dirname, '..', 'node_modules', pkg, 'files');
  const match = fs.readdirSync(dir).find((f) => pattern.test(f));
  if (!match) throw new Error(`no font matching ${pattern} in ${dir}`);
  return path.join(dir, match);
}

const FONTS = [
  { family: 'Noto Nastaliq Urdu', path: resolveFont('@fontsource/noto-nastaliq-urdu', /arabic-400-normal\.woff2$/) },
  { family: 'Noto Naskh Arabic', path: resolveFont('@fontsource/noto-naskh-arabic', /arabic-400-normal\.woff2$/) },
  { family: 'Noto Sans', path: resolveFont('@fontsource/noto-sans', /latin-400-normal\.woff2$/) },
];

function fontFaceCss() {
  return FONTS.map(
    (f) =>
      `@font-face{font-family:'${f.family}';src:url('file://${f.path}') format('woff2');font-weight:400 700;font-display:swap;}`
  ).join('\n');
}

module.exports = { FONTS, fontFaceCss };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/fonts.test.js`
Expected: PASS (2 tests). If a `no font matching` error appears, run `ls node_modules/@fontsource/noto-nastaliq-urdu/files` and adjust the regex to match the actual `*-400-normal.woff2` filename.

- [ ] **Step 5: Commit**

```bash
git add src/fonts.js test/fonts.test.js
git commit -m "feat: add bundled local font configuration"
```

---

### Task 3: HTML validator

**Files:**
- Create: `src/validateHtml.js`
- Test: `test/validateHtml.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `validateHtml(html: string) → { ok: boolean, issues: string[] }`.

- [ ] **Step 1: Write the failing test**

Create `test/validateHtml.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { validateHtml } = require('../src/validateHtml');

const GOOD = '<!DOCTYPE html><html><head></head><body><h1>Hi</h1></body></html>';

test('accepts a self-contained document', () => {
  const r = validateHtml(GOOD);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.issues, []);
});

test('rejects missing DOCTYPE', () => {
  const r = validateHtml('<html><body>x</body></html>');
  assert.strictEqual(r.ok, false);
  assert.ok(r.issues.some((i) => /doctype/i.test(i)));
});

test('rejects external http(s) references', () => {
  const r = validateHtml('<!DOCTYPE html><html><body><img src="https://x.com/a.png"></body></html>');
  assert.strictEqual(r.ok, false);
  assert.ok(r.issues.some((i) => /external|http/i.test(i)));
});

test('rejects empty body', () => {
  const r = validateHtml('<!DOCTYPE html><html><head></head><body>   </body></html>');
  assert.strictEqual(r.ok, false);
  assert.ok(r.issues.some((i) => /empty|content/i.test(i)));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/validateHtml.test.js`
Expected: FAIL — `Cannot find module '../src/validateHtml'`.

- [ ] **Step 3: Write the implementation**

Create `src/validateHtml.js`:
```js
function validateHtml(html) {
  const issues = [];
  const text = String(html || '');

  if (!/<!doctype html>/i.test(text)) {
    issues.push('missing <!DOCTYPE html>');
  }
  if (/https?:\/\//i.test(text)) {
    issues.push('contains external http(s) reference; HTML must be self-contained');
  }
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = bodyMatch ? bodyMatch[1] : '';
  const stripped = bodyInner.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
  if (!bodyMatch || stripped.length === 0) {
    issues.push('empty body content');
  }
  return { ok: issues.length === 0, issues };
}

module.exports = { validateHtml };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/validateHtml.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/validateHtml.js test/validateHtml.test.js
git commit -m "feat: add self-contained HTML validator"
```

---

### Task 4: Prompt builder

**Files:**
- Create: `src/promptBuilder.js`
- Test: `test/promptBuilder.test.js`

**Interfaces:**
- Consumes: nothing (few-shot anchor HTML is passed in by the caller).
- Produces: `buildMessages(input, fewShotHtml) → { system: string, user: string }` where `input = { subject, grade, language, topic }`.

- [ ] **Step 1: Write the failing test**

Create `test/promptBuilder.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { buildMessages } = require('../src/promptBuilder');

const input = { subject: 'Math', grade: 1, language: 'Urdu', topic: 'counting 1-10' };

test('system prompt states the hard constraints', () => {
  const { system } = buildMessages(input, '<html>anchor</html>');
  assert.match(system, /self-contained/i);
  assert.match(system, /A4/);
  assert.match(system, /Noto Nastaliq Urdu/);
  assert.match(system, /no external/i);
});

test('system prompt embeds the few-shot anchor', () => {
  const { system } = buildMessages(input, '<html>ANCHOR_MARKER</html>');
  assert.match(system, /ANCHOR_MARKER/);
});

test('user prompt carries the request fields', () => {
  const { user } = buildMessages(input, '<html>a</html>');
  assert.match(user, /Math/);
  assert.match(user, /Urdu/);
  assert.match(user, /counting 1-10/);
  assert.match(user, /grade 1/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/promptBuilder.test.js`
Expected: FAIL — `Cannot find module '../src/promptBuilder'`.

- [ ] **Step 3: Write the implementation**

Create `src/promptBuilder.js`:
```js
const SYSTEM_RULES = `You generate a single, complete, self-contained HTML document for a printable primary-school lesson plan.

HARD RULES:
- Output ONLY the HTML document. No explanation, no markdown fences.
- The document MUST be fully self-contained: NO external resources, NO http/https URLs, NO <link> to web fonts, NO remote images.
- Use inline SVG for all illustrations and icons. Never use <img> with a URL.
- Page format is A4 (210mm wide). Content MUST fit within 210mm width; it may span multiple A4 pages vertically.
- For fonts, use these font-family names only (they are provided by the host, do not @import them):
  - 'Noto Nastaliq Urdu' for Urdu text
  - 'Noto Naskh Arabic' for Sindhi/Arabic text
  - 'Noto Sans' for Latin text
- For Urdu and Sindhi, set direction:rtl and text-align:right on the relevant blocks.
- Make it colorful, clear, and age-appropriate, matching the quality of the reference example below.

REFERENCE EXAMPLE (match this quality and structure; do not copy its content):
`;

function buildMessages(input, fewShotHtml) {
  const { subject, grade, language, topic } = input;
  const system = SYSTEM_RULES + '\n' + fewShotHtml + '\n';
  const user =
    `Create a lesson plan.\n` +
    `Subject: ${subject}\n` +
    `Grade: grade ${grade}\n` +
    `Language of the lesson content: ${language}\n` +
    `Topic: ${topic}\n` +
    `Return the complete self-contained HTML document only.`;
  return { system, user };
}

module.exports = { buildMessages };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/promptBuilder.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/promptBuilder.js test/promptBuilder.test.js
git commit -m "feat: add constrained prompt builder with few-shot anchor"
```

---

### Task 5: Renderer (HTML → PNG with font loading + overflow detection)

**Files:**
- Create: `src/renderer.js`
- Test: `test/renderer.test.js`

**Interfaces:**
- Consumes: `fontFaceCss` from `src/fonts.js`.
- Produces:
  - `injectFontCss(html: string) → string` — inserts the bundled `@font-face` `<style>` into `<head>`.
  - `renderHtml(html: string, outPath: string, opts?) → Promise<{ pngPath: string, overflowed: boolean, dims: { width, clientWidth, height } }>`. `opts.injectFonts` defaults to `true`.

- [ ] **Step 1: Write the failing test**

Create `test/renderer.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { injectFontCss, renderHtml } = require('../src/renderer');

test('injectFontCss adds a bundled-fonts style into head', () => {
  const out = injectFontCss('<!DOCTYPE html><html><head></head><body>x</body></html>');
  assert.match(out, /bundled-fonts/);
  assert.match(out, /@font-face/);
});

test('renderHtml produces a non-blank PNG and reports no overflow for a fitting page', async () => {
  const html =
    '<!DOCTYPE html><html><head><style>body{margin:0}.p{width:200mm}</style></head>' +
    '<body><div class="p" style="font-family:\'Noto Nastaliq Urdu\';direction:rtl">پنکی کا دن</div></body></html>';
  const outPath = path.join(os.tmpdir(), `renderer-test-${process.pid}.png`);
  const res = await renderHtml(html, outPath);
  assert.strictEqual(res.pngPath, outPath);
  assert.ok(fs.existsSync(outPath));
  assert.ok(fs.statSync(outPath).size > 1000, 'PNG should be non-trivial');
  assert.strictEqual(res.overflowed, false);
  fs.unlinkSync(outPath);
});

test('renderHtml detects horizontal overflow', async () => {
  const html =
    '<!DOCTYPE html><html><head><style>body{margin:0}.w{width:400mm;height:20mm;background:#eee}</style></head>' +
    '<body><div class="w">too wide</div></body></html>';
  const outPath = path.join(os.tmpdir(), `renderer-overflow-${process.pid}.png`);
  const res = await renderHtml(html, outPath);
  assert.strictEqual(res.overflowed, true);
  fs.unlinkSync(outPath);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/renderer.test.js`
Expected: FAIL — `Cannot find module '../src/renderer'`.

- [ ] **Step 3: Write the implementation**

Create `src/renderer.js`:
```js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const { fontFaceCss } = require('./fonts');

let counter = 0;

function injectFontCss(html) {
  const style = `<style id="bundled-fonts">\n${fontFaceCss()}\n</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, style + '</head>');
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + style);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + '<head>' + style + '</head>');
  return style + html;
}

async function renderHtml(html, outPath, opts = {}) {
  const injectFonts = opts.injectFonts !== false;
  const finalHtml = injectFonts ? injectFontCss(html) : html;
  const tmpPath = path.join(os.tmpdir(), `lp-${process.pid}-${counter++}.html`);
  fs.writeFileSync(tmpPath, finalHtml);

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 820, height: 1160, deviceScaleFactor: 2 });
    await page.goto('file://' + tmpPath, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const dims = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
    }));
    const overflowed = dims.width > dims.clientWidth + 2;
    await page.screenshot({ path: outPath, fullPage: true });
    return { pngPath: outPath, overflowed, dims };
  } finally {
    await browser.close();
    fs.unlinkSync(tmpPath);
  }
}

module.exports = { injectFontCss, renderHtml };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/renderer.test.js`
Expected: PASS (3 tests). This launches a real headless Chromium; allow up to ~30s.

- [ ] **Step 5: Commit**

```bash
git add src/renderer.js test/renderer.test.js
git commit -m "feat: add Puppeteer renderer with font loading and overflow detection"
```

---

### Task 6: LLM client (Claude → HTML + usage metrics)

**Files:**
- Create: `src/llmClient.js`
- Test: `test/llmClient.test.js`

**Interfaces:**
- Consumes: `costUsd` from `src/models.js`.
- Produces:
  - `extractHtml(text: string) → string` — strips markdown fences / surrounding prose, returns the HTML.
  - `generateHtml({ model, system, user, createMessage?, maxTokens? }) → Promise<{ html, tokensIn, tokensOut, latencyMs, costUsd }>`. `createMessage` is injectable for tests; default calls the Anthropic SDK.

- [ ] **Step 1: Write the failing test**

Create `test/llmClient.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { extractHtml, generateHtml } = require('../src/llmClient');

test('extractHtml strips ```html fences', () => {
  const out = extractHtml('Here you go:\n```html\n<!DOCTYPE html><html></html>\n```\nDone');
  assert.strictEqual(out, '<!DOCTYPE html><html></html>');
});

test('extractHtml returns trimmed raw html when no fences', () => {
  const out = extractHtml('  <!DOCTYPE html><html></html>  ');
  assert.strictEqual(out, '<!DOCTYPE html><html></html>');
});

test('generateHtml returns html + usage + cost via injected createMessage', async () => {
  const fakeCreate = async ({ model, system, user }) => {
    assert.strictEqual(model, 'claude-haiku-4-5');
    assert.ok(system.length > 0 && user.length > 0);
    return {
      content: [{ type: 'text', text: '```html\n<!DOCTYPE html><html><body>ok</body></html>\n```' }],
      usage: { input_tokens: 1_000_000, output_tokens: 200_000 },
    };
  };
  const res = await generateHtml({
    model: 'claude-haiku-4-5',
    system: 'sys',
    user: 'usr',
    createMessage: fakeCreate,
  });
  assert.match(res.html, /<!DOCTYPE html>/);
  assert.strictEqual(res.tokensIn, 1_000_000);
  assert.strictEqual(res.tokensOut, 200_000);
  assert.strictEqual(res.costUsd, 2.0); // haiku: 1.00 + 1.00
  assert.ok(typeof res.latencyMs === 'number');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/llmClient.test.js`
Expected: FAIL — `Cannot find module '../src/llmClient'`.

- [ ] **Step 3: Write the implementation**

Create `src/llmClient.js`:
```js
const { costUsd } = require('./models');

function extractHtml(text) {
  const s = String(text || '');
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : s).trim();
}

async function defaultCreateMessage({ model, system, user, maxTokens }) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();
  return client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
}

async function generateHtml({ model, system, user, createMessage, maxTokens = 16000 }) {
  const create = createMessage || defaultCreateMessage;
  const started = Date.now();
  const resp = await create({ model, system, user, maxTokens });
  const latencyMs = Date.now() - started;

  const text = (resp.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const html = extractHtml(text);
  const tokensIn = resp.usage ? resp.usage.input_tokens : 0;
  const tokensOut = resp.usage ? resp.usage.output_tokens : 0;
  return { html, tokensIn, tokensOut, latencyMs, costUsd: costUsd(model, tokensIn, tokensOut) };
}

module.exports = { extractHtml, generateHtml };
```

> Note: `thinking`/`effort` params are intentionally omitted so the same call works on Haiku 4.5, Sonnet 5, and Opus 4.8 without per-model branching. If quality tuning later needs thinking, add it per-model in `defaultCreateMessage`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/llmClient.test.js`
Expected: PASS (3 tests). No API key needed — the test injects `createMessage`.

- [ ] **Step 5: Commit**

```bash
git add src/llmClient.js test/llmClient.test.js
git commit -m "feat: add Claude LLM client with usage/cost capture"
```

---

### Task 7: Generate orchestrator (pipeline + retry loop)

**Files:**
- Create: `src/generate.js`
- Test: `test/generate.test.js`

**Interfaces:**
- Consumes: `buildMessages` (Task 4), and injectable deps `{ llmGenerate, validate, render }` defaulting to the real modules.
- Produces: `generate(input, opts) → Promise<{ pngPath, metadata }>` where `opts = { model, fewShotHtml, outPath, maxRetries?, deps? }` and `metadata = { model, tokensIn, tokensOut, latencyMs, costUsd, attempts, overflowed, issues }`.

- [ ] **Step 1: Write the failing test**

Create `test/generate.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { generate } = require('../src/generate');

const baseOpts = (deps) => ({
  model: 'claude-haiku-4-5',
  fewShotHtml: '<html>anchor</html>',
  outPath: '/tmp/does-not-matter.png',
  maxRetries: 2,
  deps,
});
const input = { subject: 'Math', grade: 1, language: 'Urdu', topic: 'counting' };

test('happy path returns pngPath and metadata on first attempt', async () => {
  const deps = {
    llmGenerate: async () => ({ html: '<!DOCTYPE html><html><body>ok</body></html>', tokensIn: 10, tokensOut: 20, latencyMs: 5, costUsd: 0.1 }),
    validate: () => ({ ok: true, issues: [] }),
    render: async (html, outPath) => ({ pngPath: outPath, overflowed: false, dims: {} }),
  };
  const res = await generate(input, baseOpts(deps));
  assert.strictEqual(res.pngPath, '/tmp/does-not-matter.png');
  assert.strictEqual(res.metadata.attempts, 1);
  assert.strictEqual(res.metadata.costUsd, 0.1);
});

test('retries after a validation failure, then succeeds', async () => {
  let call = 0;
  const deps = {
    llmGenerate: async () => { call++; return { html: `attempt${call}`, tokensIn: 1, tokensOut: 1, latencyMs: 1, costUsd: 0 }; },
    validate: (html) => (html === 'attempt1' ? { ok: false, issues: ['missing DOCTYPE'] } : { ok: true, issues: [] }),
    render: async (html, outPath) => ({ pngPath: outPath, overflowed: false, dims: {} }),
  };
  const res = await generate(input, baseOpts(deps));
  assert.strictEqual(res.metadata.attempts, 2);
});

test('throws after exhausting retries', async () => {
  const deps = {
    llmGenerate: async () => ({ html: 'bad', tokensIn: 1, tokensOut: 1, latencyMs: 1, costUsd: 0 }),
    validate: () => ({ ok: false, issues: ['always bad'] }),
    render: async () => { throw new Error('should not render'); },
  };
  await assert.rejects(() => generate(input, baseOpts(deps)), /after retries/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/generate.test.js`
Expected: FAIL — `Cannot find module '../src/generate'`.

- [ ] **Step 3: Write the implementation**

Create `src/generate.js`:
```js
const { buildMessages } = require('./promptBuilder');

async function generate(input, opts) {
  const { model, fewShotHtml, outPath, maxRetries = 2, deps = {} } = opts;
  const llmGenerate = deps.llmGenerate || require('./llmClient').generateHtml;
  const validate = deps.validate || require('./validateHtml').validateHtml;
  const render = deps.render || require('./renderer').renderHtml;

  let feedback = '';
  let lastIssues = [];

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const { system, user } = buildMessages(input, fewShotHtml);
    const userMsg = feedback
      ? `${user}\n\nThe previous attempt had these problems:\n${feedback}\nFix them and return the full HTML again.`
      : user;

    const res = await llmGenerate({ model, system, user: userMsg });

    const v = validate(res.html);
    if (!v.ok) {
      feedback = v.issues.join('; ');
      lastIssues = v.issues;
      continue;
    }

    const r = await render(res.html, outPath);
    if (r.overflowed && attempt <= maxRetries) {
      feedback = 'Content overflowed the page width. Make everything fit within A4 (210mm) width.';
      lastIssues = ['overflow'];
      continue;
    }

    return {
      pngPath: r.pngPath,
      metadata: {
        model,
        tokensIn: res.tokensIn,
        tokensOut: res.tokensOut,
        latencyMs: res.latencyMs,
        costUsd: res.costUsd,
        attempts: attempt,
        overflowed: r.overflowed,
        issues: [],
      },
    };
  }

  throw new Error(`failed to generate a valid lesson plan after retries: ${lastIssues.join('; ')}`);
}

module.exports = { generate };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/generate.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/generate.js test/generate.test.js
git commit -m "feat: add generate orchestrator with validate/overflow retry loop"
```

---

### Task 8: Update index.html anchor to use bundled fonts

**Files:**
- Modify: `index.html:6-9` (the Google Fonts `<link>`/`<meta>` block)

**Interfaces:**
- Consumes: nothing.
- Produces: an `index.html` that is self-contained (no `https://` refs) and renders with the bundled fonts, so it works both as the offline render target and as a clean few-shot anchor.

- [ ] **Step 1: Remove the Google Fonts links**

In `index.html`, delete these lines (currently around lines 6–9):
```html
<!-- Urdu Nastaliq web font — needs internet on first load; falls back to system fonts if offline -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet">
```
Replace with:
```html
<!-- Fonts are injected locally by the renderer (Noto Nastaliq Urdu / Noto Naskh Arabic / Noto Sans) -->
```

- [ ] **Step 2: Verify it is now self-contained**

Run:
```bash
node -e "const {validateHtml}=require('./src/validateHtml');const fs=require('fs');console.log(validateHtml(fs.readFileSync('index.html','utf8')))"
```
Expected: `{ ok: true, issues: [] }`.

- [ ] **Step 3: Verify it still renders**

Run:
```bash
node -e "const {renderHtml}=require('./src/renderer');const fs=require('fs');renderHtml(fs.readFileSync('index.html','utf8'),'assets/lesson-plan.png').then(r=>console.log(r.overflowed,r.dims))"
```
Expected: prints `false` (no horizontal overflow) and dims; `assets/lesson-plan.png` is regenerated with correctly-rendered Urdu.

- [ ] **Step 4: Commit**

```bash
git add index.html assets/lesson-plan.png
git commit -m "refactor: make index.html self-contained using bundled fonts"
```

---

### Task 9: Golden test set + benchmark harness + report

**Files:**
- Create: `src/testset.js`
- Create: `src/benchmark.js`
- Test: `test/benchmark.test.js`

**Interfaces:**
- Consumes: `generate` (Task 7), `MODELS` (Task 1).
- Produces:
  - `TEST_SET` — array of `{ id, subject, grade, language, topic }`.
  - `runBenchmark({ models, testSet, generate, fewShotHtml, outDir }) → Promise<Array<result>>` where `result = { model, item, ok, pngPath?, tokensIn?, tokensOut?, latencyMs?, costUsd?, attempts?, error? }`.
  - `renderReport(results) → string` — an HTML page: a metrics table plus a gallery grid of the rendered images.

- [ ] **Step 1: Write the failing test**

Create `test/benchmark.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { TEST_SET } = require('../src/testset');
const { runBenchmark, renderReport } = require('../src/benchmark');

test('TEST_SET covers Urdu and Sindhi across subjects', () => {
  const langs = new Set(TEST_SET.map((t) => t.language));
  assert.ok(langs.has('Urdu'));
  assert.ok(langs.has('Sindhi'));
  assert.ok(TEST_SET.length >= 6);
  for (const t of TEST_SET) {
    assert.ok(t.id && t.subject && t.language && t.topic);
  }
});

test('runBenchmark runs every model x item and records results', async () => {
  const fakeGenerate = async (input, opts) => ({
    pngPath: opts.outPath,
    metadata: { model: opts.model, tokensIn: 10, tokensOut: 20, latencyMs: 5, costUsd: 0.01, attempts: 1, overflowed: false, issues: [] },
  });
  const testSet = [{ id: 't1', subject: 'Math', grade: 1, language: 'Urdu', topic: 'x' }];
  const results = await runBenchmark({
    models: ['claude-haiku-4-5', 'claude-sonnet-5'],
    testSet,
    generate: fakeGenerate,
    fewShotHtml: '<html>a</html>',
    outDir: '/tmp',
  });
  assert.strictEqual(results.length, 2);
  assert.ok(results.every((r) => r.ok));
});

test('runBenchmark records failures without throwing', async () => {
  const fakeGenerate = async () => { throw new Error('boom'); };
  const results = await runBenchmark({
    models: ['claude-haiku-4-5'],
    testSet: [{ id: 't1', subject: 'Math', grade: 1, language: 'Urdu', topic: 'x' }],
    generate: fakeGenerate,
    fewShotHtml: '<html>a</html>',
    outDir: '/tmp',
  });
  assert.strictEqual(results[0].ok, false);
  assert.match(results[0].error, /boom/);
});

test('renderReport produces an HTML page with a table and images', () => {
  const html = renderReport([
    { model: 'claude-haiku-4-5', item: 't1', ok: true, pngPath: '/tmp/a.png', costUsd: 0.01, latencyMs: 5, attempts: 1 },
  ]);
  assert.match(html, /<table/);
  assert.match(html, /claude-haiku-4-5/);
  assert.match(html, /<img/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/benchmark.test.js`
Expected: FAIL — `Cannot find module '../src/testset'`.

- [ ] **Step 3: Write the test set**

Create `src/testset.js`:
```js
const TEST_SET = [
  { id: 'math-ur-1', subject: 'Math', grade: 2, language: 'Urdu', topic: 'addition up to 20 with pictures' },
  { id: 'math-sd-1', subject: 'Math', grade: 1, language: 'Sindhi', topic: 'counting 1 to 10' },
  { id: 'sci-ur-1', subject: 'Science', grade: 3, language: 'Urdu', topic: 'parts of a plant with a labelled diagram' },
  { id: 'sci-sd-1', subject: 'Science', grade: 2, language: 'Sindhi', topic: 'living vs non-living things' },
  { id: 'urdu-lang-1', subject: 'Urdu', grade: 1, language: 'Urdu', topic: 'alphabet alif bay pay' },
  { id: 'sindhi-lang-1', subject: 'Sindhi', grade: 1, language: 'Sindhi', topic: 'Sindhi alphabet' },
  { id: 'math-ur-edge', subject: 'Math', grade: 5, language: 'Urdu', topic: 'long multi-step word problems (overflow stress test)' },
  { id: 'sci-sd-edge', subject: 'Science', grade: 4, language: 'Sindhi', topic: 'the water cycle with a diagram (diagram-heavy)' },
];

module.exports = { TEST_SET };
```

- [ ] **Step 4: Write the benchmark harness + report**

Create `src/benchmark.js`:
```js
const path = require('node:path');

async function runBenchmark({ models, testSet, generate, fewShotHtml, outDir }) {
  const results = [];
  for (const model of models) {
    for (const item of testSet) {
      const outPath = path.join(outDir, `${model}__${item.id}.png`);
      try {
        const { pngPath, metadata } = await generate(
          { subject: item.subject, grade: item.grade, language: item.language, topic: item.topic },
          { model, fewShotHtml, outPath }
        );
        results.push({ model, item: item.id, ok: true, pngPath, ...metadata });
      } catch (e) {
        results.push({ model, item: item.id, ok: false, error: e.message });
      }
    }
  }
  return results;
}

function renderReport(results) {
  const rows = results
    .map(
      (r) =>
        `<tr><td>${r.model}</td><td>${r.item}</td><td>${r.ok ? 'ok' : 'FAIL'}</td>` +
        `<td>${r.costUsd != null ? '$' + r.costUsd.toFixed(5) : '-'}</td>` +
        `<td>${r.latencyMs != null ? r.latencyMs + 'ms' : '-'}</td>` +
        `<td>${r.attempts != null ? r.attempts : '-'}</td></tr>`
    )
    .join('\n');

  const cards = results
    .filter((r) => r.ok && r.pngPath)
    .map(
      (r) =>
        `<figure style="margin:0"><figcaption>${r.model} · ${r.item}</figcaption>` +
        `<img src="file://${r.pngPath}" width="360" style="border:1px solid #ccc"></figure>`
    )
    .join('\n');

  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Benchmark Report</title></head><body>` +
    `<h1>Lesson-Plan Benchmark</h1>` +
    `<table border="1" cellpadding="6" style="border-collapse:collapse">` +
    `<thead><tr><th>Model</th><th>Item</th><th>Status</th><th>Cost</th><th>Latency</th><th>Attempts</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `<h2>Gallery</h2><div style="display:flex;flex-wrap:wrap;gap:16px">${cards}</div>` +
    `</body></html>`
  );
}

module.exports = { runBenchmark, renderReport };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test test/benchmark.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/testset.js src/benchmark.js test/benchmark.test.js
git commit -m "feat: add golden test set, benchmark harness, and report generator"
```

---

### Task 10: Benchmark runner CLI

**Files:**
- Create: `scripts/run-benchmark.js`
- Modify: `package.json` (add `benchmark` script)
- Modify: `.gitignore` (ignore `out/`)

**Interfaces:**
- Consumes: `runBenchmark`, `renderReport`, `TEST_SET`, `MODELS`, `generate`.
- Produces: writes `out/report.html` and `out/results.json`, and per-image PNGs in `out/`. This task calls the real Anthropic API, so it needs `ANTHROPIC_API_KEY`.

- [ ] **Step 1: Add `out/` to .gitignore**

Append to `.gitignore`:
```
# Benchmark output
out/
```

- [ ] **Step 2: Write the runner**

Create `scripts/run-benchmark.js`:
```js
const fs = require('node:fs');
const path = require('node:path');
const { TEST_SET } = require('../src/testset');
const { MODELS } = require('../src/models');
const { runBenchmark, renderReport } = require('../src/benchmark');
const { generate } = require('../src/generate');

async function main() {
  const outDir = path.join(__dirname, '..', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const fewShotHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const models = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MODELS);
  console.log(`Benchmarking models: ${models.join(', ')} over ${TEST_SET.length} prompts`);

  const results = await runBenchmark({ models, testSet: TEST_SET, generate, fewShotHtml, outDir });

  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(outDir, 'report.html'), renderReport(results));

  const ok = results.filter((r) => r.ok).length;
  console.log(`Done. ${ok}/${results.length} succeeded. Report: out/report.html`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Add the npm script**

In `package.json` `scripts`, add:
```json
    "benchmark": "node scripts/run-benchmark.js",
```

- [ ] **Step 4: Smoke-test with one model on a subset (needs API key)**

Run:
```bash
node -e "
const fs=require('fs');const {generate}=require('./src/generate');
(async()=>{
  fs.mkdirSync('out',{recursive:true});
  const anchor=fs.readFileSync('index.html','utf8');
  const r=await generate({subject:'Math',grade:1,language:'Urdu',topic:'counting 1-10'},{model:'claude-haiku-4-5',fewShotHtml:anchor,outPath:'out/smoke.png'});
  console.log(r.metadata);
})();
"
```
Expected: prints metadata (cost, latency, attempts) and writes `out/smoke.png` showing a real Urdu math lesson. If it errors with auth, set `ANTHROPIC_API_KEY` or run `ant auth login` first.

- [ ] **Step 5: Commit**

```bash
git add scripts/run-benchmark.js package.json .gitignore
git commit -m "feat: add benchmark runner CLI"
```

---

### Task 11: Minimal web form

**Files:**
- Create: `web/server.js`
- Create: `web/public/index.html`
- Modify: `package.json` (add `web` script)

**Interfaces:**
- Consumes: `generate` (Task 7), `MODELS` (Task 1).
- Produces: an Express server on port 3000. `GET /` serves the form; `POST /generate` accepts `{ subject, grade, language, topic, model }` JSON, runs `generate`, and returns `{ imageDataUrl, metadata }` (PNG as a base64 data URL so the browser can show it directly). Needs `ANTHROPIC_API_KEY`.

- [ ] **Step 1: Write the server**

Create `web/server.js`:
```js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const express = require('express');
const { generate } = require('../src/generate');
const { MODELS } = require('../src/models');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const anchor = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

app.get('/models', (req, res) => res.json(Object.keys(MODELS)));

app.post('/generate', async (req, res) => {
  const { subject, grade, language, topic, model } = req.body || {};
  if (!subject || !language || !topic || !model) {
    return res.status(400).json({ error: 'subject, language, topic, and model are required' });
  }
  const outPath = path.join(os.tmpdir(), `web-lp-${Date.now()}.png`);
  try {
    const { pngPath, metadata } = await generate(
      { subject, grade: grade || 1, language, topic },
      { model, fewShotHtml: anchor, outPath }
    );
    const dataUrl = 'data:image/png;base64,' + fs.readFileSync(pngPath).toString('base64');
    fs.unlinkSync(pngPath);
    res.json({ imageDataUrl: dataUrl, metadata });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lesson-plan generator on http://localhost:${PORT}`));
```

- [ ] **Step 2: Write the form page**

Create `web/public/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Lesson Plan Generator</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px}
  label{display:block;margin:10px 0 4px;font-weight:600}
  input,select{width:100%;padding:8px;font-size:15px}
  button{margin-top:16px;padding:10px 20px;font-size:15px;cursor:pointer}
  #meta{color:#555;font-size:14px;margin-top:10px}
  #out img{max-width:100%;border:1px solid #ccc;margin-top:12px}
</style>
</head>
<body>
<h1>Lesson Plan Generator</h1>
<label>Subject</label>
<input id="subject" value="Math">
<label>Grade</label>
<input id="grade" type="number" value="1">
<label>Language</label>
<select id="language"><option>Urdu</option><option>Sindhi</option><option>English</option></select>
<label>Topic</label>
<input id="topic" value="counting 1 to 10">
<label>Model</label>
<select id="model"></select>
<button id="go">Generate</button>
<div id="meta"></div>
<div id="out"></div>
<script>
fetch('/models').then(r=>r.json()).then(ms=>{
  document.getElementById('model').innerHTML = ms.map(m=>`<option>${m}</option>`).join('');
});
document.getElementById('go').onclick = async () => {
  const meta = document.getElementById('meta');
  const out = document.getElementById('out');
  out.innerHTML = ''; meta.textContent = 'Generating…';
  const started = Date.now();
  const body = {
    subject: subject.value, grade: Number(grade.value),
    language: language.value, topic: topic.value, model: model.value,
  };
  try {
    const r = await fetch('/generate', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'failed');
    meta.textContent = `${data.metadata.model} · $${data.metadata.costUsd.toFixed(5)} · ${data.metadata.latencyMs}ms · ${data.metadata.attempts} attempt(s)`;
    const img = document.createElement('img'); img.src = data.imageDataUrl; out.appendChild(img);
    const a = document.createElement('a'); a.href = data.imageDataUrl; a.download = 'lesson-plan.png'; a.textContent = 'Download PNG';
    a.style.display='block'; a.style.marginTop='8px'; out.appendChild(a);
  } catch (e) {
    meta.textContent = 'Error: ' + e.message + ' (elapsed ' + (Date.now()-started) + 'ms)';
  }
};
</script>
</body>
</html>
```

- [ ] **Step 3: Add the npm script**

In `package.json` `scripts`, add:
```json
    "web": "node web/server.js",
```

- [ ] **Step 4: Manual smoke test (needs API key)**

Run:
```bash
npm run web
```
Then open `http://localhost:3000`, fill the form, click Generate. Expected: a rendered lesson-plan image appears with `model · cost · time` metadata below. Stop the server with Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add web/server.js web/public/index.html package.json
git commit -m "feat: add minimal web form for lesson-plan generation"
```

---

### Task 12: Update README + recommendation stub

**Files:**
- Modify: `README.md`
- Create: `docs/RECOMMENDATION.md`

**Interfaces:**
- Consumes: everything above.
- Produces: English docs explaining how to run the tool, the benchmark, and where the recommendation lives.

- [ ] **Step 1: Update README usage section**

In `README.md`, under a new `## Running the generator` section, add:
```markdown
## Running the generator

Prerequisites: Node.js 20+, and an Anthropic API key (`export ANTHROPIC_API_KEY=...` or `ant auth login`). No image-model key is needed — images are rendered from code.

```bash
npm install
npm test           # run the unit tests
npm run web        # start the web form at http://localhost:3000
npm run benchmark  # run all models over the golden test set -> out/report.html
```

The pipeline: your prompt → Claude writes self-contained HTML/CSS/SVG → Puppeteer renders it to a PNG. No AI image model is used at any step.
```

- [ ] **Step 2: Create the recommendation stub**

Create `docs/RECOMMENDATION.md`:
```markdown
# Recommendation: Code-Rendered Lesson Plans vs Image Models

_Fill in after running `npm run benchmark` and scoring the outputs with the rubric._

## Summary table
| Model | $/lesson (avg) | Latency (avg) | Quality /10 (avg) | Reliability % |
|-------|----------------|---------------|-------------------|---------------|
| Claude Haiku 4.5 | | | | |
| Claude Sonnet 5 | | | | |
| Claude Opus 4.8 | | | | |

## vs nano-banana (Gemini image model)
- Image cost per lesson: **$0** (rendered from code) vs ~$0.03–0.04 per image.
- Non-Latin text correctness: **100%** (real fonts) vs frequent Urdu/Sindhi spelling errors.

## Rubric (score each output 0–2)
- Content correct & complete
- Layout not broken / no overflow
- Language & script correct, RTL right
- Fonts render (no tofu boxes)
- Visual appeal

## Recommendation
_Which model to adopt and why._
```

- [ ] **Step 3: Verify docs are self-consistent**

Run: `npm test`
Expected: all tests pass (full suite).

- [ ] **Step 4: Commit**

```bash
git add README.md docs/RECOMMENDATION.md
git commit -m "docs: add run instructions and recommendation template"
```

---

## Self-Review

**Spec coverage:**
- §3 Architecture components → Tasks 1–9 (models, fonts, validate, promptBuilder, renderer, llmClient, generate, benchmark). ✅
- §4 Quality control (constraints, few-shot anchor, validate+retry, overflow detect) → Tasks 3, 4, 5, 7. ✅
- §5 Fonts/multilingual (local fonts, fonts.ready, RTL) → Tasks 2, 5, 8. ✅
- §6.1 Functional tests → each task's tests. ✅
- §6.2 Golden test set (Urdu/Sindhi × Math/Science + edge cases) → Task 9 `TEST_SET`. ✅
- §7 Benchmark & metrics (cost/latency/quality/reliability, report) → Tasks 9, 10, 12 (rubric lives in RECOMMENDATION.md; quality is human-scored per spec). ✅
- §8 UI/UX (web form + gallery report) → Tasks 9 (report), 11 (form). ✅
- §9 Tech stack / model IDs → Tasks 1, 6. ✅

**Placeholder scan:** No TBD/TODO in code steps; `docs/RECOMMENDATION.md` intentionally contains fill-in blanks because quality scoring is a human step per the spec (§7). All code steps contain complete code.

**Type consistency:** `generate(input, opts)` return `{ pngPath, metadata }` is consumed identically in Tasks 9 (benchmark), 10 (runner), 11 (web). `llmGenerate` returns `{ html, tokensIn, tokensOut, latencyMs, costUsd }` in Task 6 and is stubbed with the same shape in Task 7 tests. `render`/`renderHtml` returns `{ pngPath, overflowed, dims }` consistently in Tasks 5 and 7. `validateHtml` returns `{ ok, issues }` consistently in Tasks 3 and 7. ✅
