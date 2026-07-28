# LP-Render Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone module that turns a single-locale lesson-plan JSON into an A4-paginated PDF buffer, entirely from code (HTML/CSS + inline SVG, rendered by Playwright), as a drop-in alternative to Gamma for rumi-platform.

**Architecture:** A pure `buildLessonPlanHtml(lesson, {locale})` composes an HTML string from a shell (base64 fonts + tokens CSS + A4 page rules + direction) plus one pure renderer per section type, selected from a registry. `htmlToPdf(html, opts)` (a local Playwright clone of rumi's primitive) rasterizes that string to a PDF buffer. `renderLessonPlanPdf` = validate → build → htmlToPdf.

**Tech Stack:** Node.js (CommonJS), `playwright-core`, `@fontsource` Noto fonts (Nastaliq Urdu / Naskh Arabic / Sans), `node:test`.

## Global Constraints

- Module system: **CommonJS** (`require` / `module.exports`) — no ESM. (matches rumi-platform)
- **No Puppeteer** — rendering uses `playwright-core` only.
- **No Gamma, no AI image model** anywhere. Every visual is inline SVG authored in code.
- **No hard-coded lesson content** — all content comes from the `lesson` argument.
- `htmlToPdf(html, options) → Promise<Buffer>` signature MUST match rumi's `bot/shared/utils/html-to-pdf.js` exactly (options: `{ timeout=30000, pdfOptions }`), so integration is an import swap.
- Fonts embedded as **base64 `@font-face`** — output HTML must contain no `file://`, no external URL, no `<img>`, no `data:image` raster.
- Locales: `en` (LTR, Noto Sans), `ur` (RTL, Noto Nastaliq Urdu), `sd` (RTL, Noto Naskh Arabic), `ar` (RTL, Noto Naskh Arabic).
- Filenames: `kebab-case`. Tests under `lp-render/test/`. Test runner: `node --test`.
- Module renders single-locale JSON; it does **not** translate.

---

### Task 1: Package setup, module scaffold & schema validation

**Files:**
- Modify: `package.json` (deps + scripts)
- Create: `lp-render/schema.js`
- Test: `lp-render/test/schema.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `validateLesson(lesson) → { ok: boolean, errors: string[] }`; constant `SECTION_TYPES` (array of recognized type strings).

- [ ] **Step 1: Swap deps and test script in package.json**

Edit `package.json` — remove `"puppeteer"`, add `"playwright-core": "^1.48.0"`, set the test script:

```json
{
  "name": "lp-render",
  "version": "1.0.0",
  "main": "lp-render/index.js",
  "scripts": {
    "test": "node --test lp-render/test/",
    "test:smoke": "node --test lp-render/test/render.smoke.test.js"
  },
  "dependencies": {
    "@fontsource/noto-naskh-arabic": "^5.2.11",
    "@fontsource/noto-nastaliq-urdu": "^5.2.8",
    "@fontsource/noto-sans": "^5.2.10",
    "playwright-core": "^1.48.0"
  }
}
```

Then: `npm install` (installs playwright-core; keeps @fontsource).

- [ ] **Step 2: Write the failing test** — `lp-render/test/schema.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateLesson, SECTION_TYPES } = require('../schema');

test('valid minimal lesson passes', () => {
  const r = validateLesson({ meta: { id: '1', title: 'T', locale: 'en' }, sections: [] });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.errors, []);
});

test('missing meta fails with clear error', () => {
  const r = validateLesson({ sections: [] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('meta')));
});

test('missing meta.title and meta.locale fail', () => {
  const r = validateLesson({ meta: { id: '1' }, sections: [] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('meta.title')));
  assert.ok(r.errors.some((e) => e.includes('meta.locale')));
});

test('sections must be an array', () => {
  const r = validateLesson({ meta: { id: '1', title: 'T', locale: 'en' }, sections: {} });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('sections')));
});

test('a section without a type fails', () => {
  const r = validateLesson({ meta: { id: '1', title: 'T', locale: 'en' }, sections: [{}] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('sections[0].type')));
});

test('unknown locale fails', () => {
  const r = validateLesson({ meta: { id: '1', title: 'T', locale: 'xx' }, sections: [] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('locale')));
});

test('SECTION_TYPES includes the 5E-aligned set', () => {
  for (const t of ['objectives', 'materials', 'introduction', 'explanation',
                   'guided_practice', 'assessment', 'differentiation', 'generic']) {
    assert.ok(SECTION_TYPES.includes(t), `missing ${t}`);
  }
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test lp-render/test/schema.test.js`
Expected: FAIL — `Cannot find module '../schema'`.

- [ ] **Step 4: Write minimal implementation** — `lp-render/schema.js`

```js
'use strict';

const SECTION_TYPES = [
  'objectives', 'materials', 'introduction', 'explore',
  'explanation', 'guided_practice', 'assessment', 'differentiation', 'generic',
];

const LOCALES = ['en', 'ur', 'sd', 'ar'];

function validateLesson(lesson) {
  const errors = [];
  if (!lesson || typeof lesson !== 'object') {
    return { ok: false, errors: ['lesson must be an object'] };
  }
  const meta = lesson.meta;
  if (!meta || typeof meta !== 'object') {
    errors.push('meta is required and must be an object');
  } else {
    if (!meta.title) errors.push('meta.title is required');
    if (!meta.locale) errors.push('meta.locale is required');
    else if (!LOCALES.includes(meta.locale)) {
      errors.push(`meta.locale must be one of ${LOCALES.join(', ')} (got "${meta.locale}")`);
    }
  }
  if (!Array.isArray(lesson.sections)) {
    errors.push('sections must be an array');
  } else {
    lesson.sections.forEach((s, i) => {
      if (!s || typeof s !== 'object' || !s.type) {
        errors.push(`sections[${i}].type is required`);
      }
    });
  }
  return { ok: errors.length === 0, errors };
}

module.exports = { validateLesson, SECTION_TYPES, LOCALES };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test lp-render/test/schema.test.js`
Expected: PASS (all subtests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lp-render/schema.js lp-render/test/schema.test.js
git commit -m "feat(lp-render): lesson schema validation + playwright-core dep swap"
```

---

### Task 2: Base64 font-face loader

**Files:**
- Create: `lp-render/fonts/load.js`
- Test: `lp-render/test/fonts.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `fontFaceCss() → string` (CSS with one `@font-face` per bundled family/weight, each `src` a base64 `data:` URI).

- [ ] **Step 1: Write the failing test** — `lp-render/test/fonts.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { fontFaceCss } = require('../fonts/load');

test('emits base64 @font-face for the three families', () => {
  const css = fontFaceCss();
  assert.match(css, /@font-face/);
  assert.match(css, /Noto Nastaliq Urdu/);
  assert.match(css, /Noto Naskh Arabic/);
  assert.match(css, /Noto Sans/);
  assert.match(css, /src:url\(data:font\/woff2;base64,/);
  assert.doesNotMatch(css, /file:\/\//, 'must not reference file:// paths');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/fonts.test.js`
Expected: FAIL — `Cannot find module '../fonts/load'`.

- [ ] **Step 3: Write minimal implementation** — `lp-render/fonts/load.js`

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Resolve one woff2 file matching `pattern` inside a @fontsource package's files/ dir.
function resolveFont(pkg, pattern) {
  const dir = path.join(__dirname, '..', '..', 'node_modules', pkg, 'files');
  const match = fs.readdirSync(dir).find((f) => pattern.test(f));
  return match ? path.join(dir, match) : null;
}

const FAMILIES = [
  { family: 'Noto Nastaliq Urdu', pkg: '@fontsource/noto-nastaliq-urdu', script: 'arabic' },
  { family: 'Noto Naskh Arabic', pkg: '@fontsource/noto-naskh-arabic', script: 'arabic' },
  { family: 'Noto Sans', pkg: '@fontsource/noto-sans', script: 'latin' },
];
const WEIGHTS = [400, 700];

let _cache = null;

function fontFaceCss() {
  if (_cache) return _cache;
  const faces = [];
  for (const { family, pkg, script } of FAMILIES) {
    for (const weight of WEIGHTS) {
      const file = resolveFont(pkg, new RegExp(`${script}-${weight}-normal\\.woff2$`));
      if (!file) continue;
      const b64 = fs.readFileSync(file).toString('base64');
      faces.push(
        `@font-face{font-family:'${family}';font-weight:${weight};font-display:swap;` +
        `src:url(data:font/woff2;base64,${b64}) format('woff2');}`
      );
    }
  }
  _cache = faces.join('\n');
  return _cache;
}

module.exports = { fontFaceCss };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/fonts.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/fonts/load.js lp-render/test/fonts.test.js
git commit -m "feat(lp-render): base64 @font-face loader for Noto families"
```

---

### Task 3: Locale → direction/font resolver

**Files:**
- Create: `lp-render/template/direction.js`
- Test: `lp-render/test/direction.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveDirection(locale) → { dir: 'ltr'|'rtl', fontFamily: string }`.

- [ ] **Step 1: Write the failing test** — `lp-render/test/direction.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveDirection } = require('../template/direction');

test('english is ltr with Noto Sans', () => {
  assert.deepStrictEqual(resolveDirection('en'), { dir: 'ltr', fontFamily: `"Noto Sans", sans-serif` });
});
test('urdu is rtl with Nastaliq', () => {
  const r = resolveDirection('ur');
  assert.strictEqual(r.dir, 'rtl');
  assert.match(r.fontFamily, /Noto Nastaliq Urdu/);
});
test('sindhi is rtl with Naskh', () => {
  const r = resolveDirection('sd');
  assert.strictEqual(r.dir, 'rtl');
  assert.match(r.fontFamily, /Noto Naskh Arabic/);
});
test('unknown locale falls back to ltr Noto Sans', () => {
  assert.deepStrictEqual(resolveDirection('zz'), { dir: 'ltr', fontFamily: `"Noto Sans", sans-serif` });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/direction.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation** — `lp-render/template/direction.js`

```js
'use strict';

const MAP = {
  en: { dir: 'ltr', fontFamily: `"Noto Sans", sans-serif` },
  ur: { dir: 'rtl', fontFamily: `"Noto Nastaliq Urdu", "Noto Naskh Arabic", serif` },
  sd: { dir: 'rtl', fontFamily: `"Noto Naskh Arabic", "Noto Nastaliq Urdu", serif` },
  ar: { dir: 'rtl', fontFamily: `"Noto Naskh Arabic", serif` },
};

function resolveDirection(locale) {
  return MAP[locale] || MAP.en;
}

module.exports = { resolveDirection };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/direction.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/direction.js lp-render/test/direction.test.js
git commit -m "feat(lp-render): locale -> direction/font resolver"
```

---

### Task 4: Design tokens (palette, type scale, section accents)

**Files:**
- Create: `lp-render/template/tokens.js`
- Test: `lp-render/test/tokens.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `tokensCss() → string` (`:root{--var:…}` declarations); `SECTION_ACCENT` (object mapping section type → CSS var name, e.g. `objectives → '--coral'`).

- [ ] **Step 1: Write the failing test** — `lp-render/test/tokens.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { tokensCss, SECTION_ACCENT } = require('../template/tokens');

test('tokensCss defines the core palette vars', () => {
  const css = tokensCss();
  for (const v of ['--paper', '--ink', '--coral', '--sky', '--sun', '--mint', '--grape']) {
    assert.ok(css.includes(v), `missing ${v}`);
  }
});
test('every 5E section type has an accent', () => {
  for (const t of ['objectives', 'materials', 'introduction', 'explanation',
                   'guided_practice', 'assessment', 'differentiation', 'generic']) {
    assert.ok(SECTION_ACCENT[t], `missing accent for ${t}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/tokens.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation** — `lp-render/template/tokens.js`

```js
'use strict';

const PALETTE = {
  '--paper': '#fffdf3',
  '--ink': '#33334d',
  '--ink-soft': '#5a5a72',
  '--sky': '#5ec6ff', '--sky-soft': '#e9f7ff', '--sky-bd': '#bfe9ff',
  '--sun': '#ffcf33', '--sun-soft': '#fff6d6', '--sun-bd': '#ffe79e',
  '--coral': '#ff6f61', '--coral-soft': '#ffe6e2', '--coral-bd': '#ffc7c0',
  '--mint': '#2fd0a6', '--mint-soft': '#dcfbf1', '--mint-bd': '#b7f3e3',
  '--grape': '#9b6bff', '--grape-soft': '#efe6ff', '--grape-bd': '#d9c8ff',
  '--amber': '#ff9f43',
};

// section type -> accent CSS var (drives the coloured section header + icon disc)
const SECTION_ACCENT = {
  objectives: '--coral',
  materials: '--sun',
  introduction: '--sky',
  explore: '--sky',
  explanation: '--grape',
  guided_practice: '--mint',
  assessment: '--amber',
  differentiation: '--grape',
  generic: '--ink',
};

function tokensCss() {
  const decls = Object.entries(PALETTE).map(([k, v]) => `${k}:${v}`).join(';');
  return `:root{${decls}}`;
}

module.exports = { tokensCss, SECTION_ACCENT, PALETTE };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/tokens.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/tokens.js lp-render/test/tokens.test.js
git commit -m "feat(lp-render): design tokens + section accent map"
```

---

### Task 5: Inline SVG icon library

**Files:**
- Create: `lp-render/template/icons.js`
- Test: `lp-render/test/icons.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `icon(name, size = 24) → string` (an `<svg>…</svg>` string; unknown name → `''`); `hasIcon(name) → boolean`; `ICON_NAMES` (array).

- [ ] **Step 1: Write the failing test** — `lp-render/test/icons.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { icon, hasIcon, ICON_NAMES } = require('../template/icons');

test('known icon returns sized svg markup', () => {
  const s = icon('school', 30);
  assert.match(s, /^<svg/);
  assert.match(s, /width="30"/);
  assert.match(s, /<\/svg>$/);
});
test('unknown icon returns empty string', () => {
  assert.strictEqual(icon('does-not-exist'), '');
});
test('library covers section-type + item icons', () => {
  for (const n of ['target', 'toolbox', 'rocket', 'lightbulb', 'pencil', 'checklist', 'ladder',
                   'person', 'cake', 'family', 'heart', 'school', 'apple', 'thumbup', 'thumbdown']) {
    assert.ok(hasIcon(n), `missing icon ${n}`);
  }
  assert.ok(Array.isArray(ICON_NAMES) && ICON_NAMES.length >= 15);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/icons.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation** — `lp-render/template/icons.js`

Each entry is the inner markup of a `viewBox="0 0 64 64"` SVG. (Shapes lifted verbatim from the validated `lesson-113087-full.html` symbol set, plus section-type icons.)

```js
'use strict';

// name -> inner SVG markup (viewBox 0 0 64 64)
const BODY = {
  // --- section-type icons ---
  target: `<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="5"/><circle cx="32" cy="32" r="12" fill="none" stroke="#fff" stroke-width="5"/><circle cx="32" cy="32" r="4" fill="#fff"/>`,
  toolbox: `<rect x="10" y="24" width="44" height="26" rx="4" fill="#fff"/><rect x="22" y="16" width="20" height="9" rx="3" fill="none" stroke="#fff" stroke-width="4"/><rect x="10" y="33" width="44" height="6" fill="rgba(0,0,0,.15)"/>`,
  rocket: `<path d="M32 6c9 6 12 16 12 26l-6 8H26l-6-8C20 22 23 12 32 6z" fill="#fff"/><circle cx="32" cy="26" r="5" fill="rgba(0,0,0,.2)"/><path d="M26 40l-6 12 10-5M38 40l6 12-10-5" fill="#fff"/>`,
  lightbulb: `<circle cx="32" cy="26" r="16" fill="#fff"/><rect x="25" y="40" width="14" height="8" rx="2" fill="#fff"/><rect x="27" y="50" width="10" height="4" rx="2" fill="#fff"/>`,
  pencil: `<path d="M14 50l4-12 26-26 8 8-26 26z" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/><path d="M40 12l8 8" stroke="#fff" stroke-width="3.5"/><path d="M14 50l4-12 8 8z" fill="#fff"/>`,
  checklist: `<rect x="14" y="10" width="36" height="46" rx="4" fill="none" stroke="#fff" stroke-width="3.5"/><path d="M20 24l4 4 7-8M20 38l4 4 7-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M38 24h8M38 38h8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  ladder: `<path d="M22 8v48M42 8v48M22 20h20M22 32h20M22 44h20" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
  board: `<rect x="8" y="10" width="48" height="36" rx="4" fill="#2f6b4f"/><rect x="8" y="10" width="48" height="36" rx="4" fill="none" stroke="#fff" stroke-width="4"/><path d="M18 22h20M18 30h26M18 38h14" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><rect x="24" y="48" width="16" height="6" fill="#fff"/>`,
  // --- item icons ---
  person: `<circle cx="32" cy="22" r="11" fill="#fff"/><path d="M14 54c0-11 8-16 18-16s18 5 18 16z" fill="#fff"/>`,
  cake: `<path d="M16 34h32l-4 18a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" fill="#ff9a8b"/><path d="M14 34c0-9 8-14 18-14s18 5 18 14z" fill="#fff3c9" stroke="#f0a500" stroke-width="3"/><circle cx="24" cy="30" r="3" fill="#ff6f61"/><circle cx="34" cy="27" r="3" fill="#9b6bff"/><circle cx="42" cy="31" r="3" fill="#2fd0a6"/><rect x="30" y="8" width="4" height="12" fill="#5ec6ff"/><path d="M32 2c3 3 3 6 0 8-3-2-3-5 0-8z" fill="#ffcf33"/>`,
  family: `<circle cx="16" cy="18" r="8" fill="#fff"/><path d="M8 50c0-9 6-13 12-13s12 4 12 13z" fill="#fff"/><circle cx="48" cy="18" r="8" fill="#fff"/><path d="M32 50c0-9 6-13 12-13s12 4 12 13z" fill="#fff"/><circle cx="32" cy="34" r="6" fill="#fff"/><path d="M23 54c0-6 4-9 9-9s9 3 9 9z" fill="#fff"/>`,
  heart: `<path d="M32 54S8 40 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 16-24 30-24 30z" fill="#ff6f61"/><path d="M20 26a8 8 0 0 1 8-6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  school: `<rect x="14" y="30" width="36" height="24" rx="3" fill="#2fd0a6"/><path d="M10 30L32 14l22 16z" fill="#ff6f61"/><rect x="28" y="40" width="8" height="14" fill="#fff"/><rect x="18" y="35" width="7" height="7" rx="1.5" fill="#fff"/><rect x="39" y="35" width="7" height="7" rx="1.5" fill="#fff"/><rect x="31" y="6" width="2.5" height="9" fill="#33334d"/><path d="M33.5 6l8 3-8 3z" fill="#ffcf33"/>`,
  nametag: `<rect x="8" y="16" width="48" height="34" rx="7" fill="#5ec6ff"/><rect x="8" y="16" width="48" height="11" rx="6" fill="#3aa8e8"/><circle cx="25" cy="33" r="5" fill="#fff"/><path d="M18 42a7 7 0 0 1 14 0" fill="#fff"/><line x1="38" y1="32" x2="50" y2="32" stroke="#fff" stroke-width="3" stroke-linecap="round"/><line x1="38" y1="40" x2="47" y2="40" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  apple: `<path d="M32 20c-4-6-14-6-18 0-5 8-1 26 6 32 3 3 5 3 8 1 3 2 5 2 8-1 7-6 11-24 6-32-4-6-14-6-18 0z" fill="#ff6f61"/><rect x="30" y="10" width="3" height="10" rx="1.5" fill="#8a5a2b"/><path d="M33 14c5-4 9-2 9-2s-2 6-8 6z" fill="#2fd0a6"/>`,
  star: `<path d="M32 4l8 18 20 2-15 13 5 20-18-11-18 11 5-20L4 24l20-2z" fill="#ffcf33" stroke="#f0a500" stroke-width="3"/>`,
  thumbup: `<path d="M20 28h6v28h-6z" fill="#fff"/><path d="M28 28l4-14a4 4 0 0 1 8 0l-2 12h14a5 5 0 0 1 5 6l-4 18a6 6 0 0 1-6 5H28z" fill="#fff"/>`,
  thumbdown: `<path d="M44 36h-6V8h6z" fill="#fff"/><path d="M36 36l-4 14a4 4 0 0 1-8 0l2-12H12a5 5 0 0 1-5-6l4-18a6 6 0 0 1 6-5h19z" fill="#fff"/>`,
};

const ICON_NAMES = Object.keys(BODY);

function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(BODY, name);
}

function icon(name, size = 24) {
  if (!hasIcon(name)) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${BODY[name]}</svg>`;
}

module.exports = { icon, hasIcon, ICON_NAMES };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/icons.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/icons.js lp-render/test/icons.test.js
git commit -m "feat(lp-render): inline SVG icon library (section + item icons)"
```

---

### Task 6: HTML shell (head, CSS, A4 pagination, fonts, direction)

**Files:**
- Create: `lp-render/template/shell.js`
- Test: `lp-render/test/shell.test.js`

**Interfaces:**
- Consumes: `fontFaceCss()` (Task 2), `tokensCss()` (Task 4), `resolveDirection()` (Task 3), `esc()` (defined here and reused by renderers).
- Produces: `buildShell({ headerHtml, bodyHtml, locale, title }) → string` (full HTML document); `esc(str) → string` (HTML-escape helper).

- [ ] **Step 1: Write the failing test** — `lp-render/test/shell.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildShell, esc } = require('../template/shell');

test('esc escapes html-significant characters', () => {
  assert.strictEqual(esc('a & <b> "c"'), 'a &amp; &lt;b&gt; &quot;c&quot;');
});

test('shell is a self-contained A4 doc with dir + fonts', () => {
  const html = buildShell({ headerHtml: '<h1>H</h1>', bodyHtml: '<p>B</p>', locale: 'ur', title: 'T' });
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /@font-face/);
  assert.match(html, /@page/);
  assert.match(html, /break-inside/);
  assert.ok(html.includes('<h1>H</h1>') && html.includes('<p>B</p>'));
  assert.doesNotMatch(html, /<img|data:image|file:\/\/|https?:\/\/(?!www\.w3)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/shell.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation** — `lp-render/template/shell.js`

```js
'use strict';
const { fontFaceCss } = require('../fonts/load');
const { tokensCss } = require('./tokens');
const { resolveDirection } = require('./direction');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const LAYOUT_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);color:var(--ink);background:#fff;line-height:1.55;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-font-smoothing:antialiased}
b{font-weight:700;color:var(--coral)}
.sheet{padding:12mm 12mm 14mm}
.lp-header{background:linear-gradient(225deg,var(--sky-soft),#f3fbff);border:3px solid var(--sky-bd);
  border-radius:22px;padding:18px 22px;margin-bottom:16px}
.lp-header h1{font-size:30px;line-height:1.3}
.lp-header .sub{font-size:15px;color:var(--ink-soft);font-weight:700;margin-top:4px}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.meta span{background:#fff;border:2px solid var(--sky-bd);font-size:13px;font-weight:700;padding:4px 11px;border-radius:14px}
.meta span b{color:var(--sky)}
.section{margin-top:18px;break-inside:avoid;page-break-inside:avoid}
.sec-head{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.sec-disc{width:40px;height:40px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;color:#fff}
.sec-title{font-size:22px;font-weight:800}
.time{margin-inline-start:auto;background:#fff;border:2px solid #e7dcb6;color:var(--ink-soft);
  font-size:13px;font-weight:700;padding:4px 12px;border-radius:16px;white-space:nowrap}
.panel{background:#fff;border:3px solid #f0e8cd;border-radius:18px;padding:16px 18px}
.panel + .panel{margin-top:10px}
.lead{font-size:16px;font-weight:600}
.tag{display:inline-block;background:var(--grape);color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;margin-inline-start:6px}
.list{list-style:none}
.list li{font-size:15px;padding-inline-start:22px;position:relative;margin-bottom:6px;font-weight:600;color:#44445c}
.list li::before{content:"\\25CF";position:absolute;inset-inline-start:4px;color:var(--sky);font-size:10px;top:6px}
.note{background:var(--sun-soft);border:2px solid var(--sun-bd);border-inline-start:7px solid var(--sun);
  border-radius:14px;padding:12px 16px;margin-top:12px}
.note .nt{font-size:14px;font-weight:800;color:#8a6d00;margin-bottom:5px}
.note p{font-size:14px;font-weight:600;color:#5f5320}
.subh{font-size:15px;font-weight:800;margin-bottom:8px}
.story{display:flex;gap:14px;align-items:center}
.story + .story{margin-top:10px}
.story .pic{flex:0 0 auto;width:70px;height:70px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:var(--sky-soft)}
.story .bubble{flex:1;background:#fff;border:2.5px solid #eee3c4;border-radius:16px;padding:12px 16px;font-size:15px;font-weight:600}
.grid5{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.wcard{border-radius:18px;padding:14px 8px;text-align:center;border:3px solid var(--sky-bd);background:var(--sky-soft)}
.wcard .disc{width:52px;height:52px;border-radius:50%;background:#fff;margin:0 auto 8px;display:flex;align-items:center;justify-content:center}
.wcard .w{font-size:18px;font-weight:800}
.wcard .m{font-size:12px;color:var(--ink-soft);margin-top:4px;font-weight:600}
.formula{display:flex;align-items:center;justify-content:center;gap:9px;flex-wrap:wrap;background:#fff;border:3px dashed var(--sky);border-radius:16px;padding:14px;margin-top:10px}
.fb{color:#fff;border-radius:14px;padding:9px 16px;text-align:center;background:var(--sky)}
.fb .l{font-size:10px;font-weight:800;opacity:.9}.fb .v{font-size:15px;font-weight:800;margin-top:2px}
.plus{font-size:22px;font-weight:900;color:var(--sun)}
.step{display:flex;gap:12px;margin-top:10px}
.step .badge{flex:0 0 auto;min-width:84px;padding:8px;border-radius:12px;color:#fff;font-size:12px;font-weight:800;
  display:flex;align-items:center;justify-content:center;text-align:center;background:var(--grape)}
.step .body{flex:1;background:#faf7ee;border:2px solid #eee3c4;border-radius:14px;padding:10px 14px;font-size:14px;font-weight:600}
.qa3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}
.qa{background:#fff;border:2.5px solid var(--sky-bd);border-radius:16px;padding:12px}
.qa .q{font-size:13px;font-weight:700}.qa .a{margin-top:8px;background:var(--mint);color:#fff;font-size:13px;font-weight:800;border-radius:10px;padding:6px 10px;text-align:center}
.grid5 .scard{background:#fff;border:2.5px solid #eee3c4;border-radius:16px;overflow:hidden;text-align:center}
.scard .top{height:52px;display:flex;align-items:center;justify-content:center}
.scard .s{font-size:13px;font-weight:700;padding:8px 6px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
.diff{border-radius:16px;padding:14px 16px}
.diff.s{background:var(--sky-soft);border:2.5px solid var(--sky-bd)}.diff.a{background:var(--grape-soft);border:2.5px solid var(--grape-bd)}
.diff p{font-size:14px;font-weight:600}
.afl-note{font-size:14px;font-weight:600;color:var(--ink-soft);margin-bottom:10px}
.grow{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:14px;margin-bottom:8px}
.grow.up{background:var(--mint-soft)}.grow.down{background:var(--coral-soft)}
.grow .t{flex:1;font-size:15px;font-weight:700}
.vb{flex:0 0 auto;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.vb.u{background:var(--mint)}.vb.d{background:var(--coral)}
`;

function buildShell({ headerHtml = '', bodyHtml = '', locale = 'en', title = '' } = {}) {
  const { dir, fontFamily } = resolveDirection(locale);
  return `<!DOCTYPE html><html lang="${esc(locale)}" dir="${dir}"><head><meta charset="UTF-8">` +
    `<title>${esc(title)}</title><style>` +
    `@page{size:A4;margin:0}` +
    fontFaceCss() + '\n' +
    tokensCss() + '\n' +
    `:root{--font:${fontFamily}}` +
    LAYOUT_CSS +
    `</style></head><body><div class="sheet">${headerHtml}${bodyHtml}</div></body></html>`;
}

module.exports = { buildShell, esc };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/shell.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/shell.js lp-render/test/shell.test.js
git commit -m "feat(lp-render): HTML shell with A4 pagination, base64 fonts, RTL"
```

---

### Task 7: Section registry + `generic`, `objectives`, `materials` renderers

**Files:**
- Create: `lp-render/template/sections/index.js`, `generic.js`, `objectives.js`, `materials.js`
- Test: `lp-render/test/sections-basic.test.js`

**Interfaces:**
- Consumes: `esc()` (Task 6), `icon()` (Task 5), `SECTION_ACCENT` (Task 4).
- Produces: `getRenderer(type) → fn(section, ctx) → string` (falls back to `generic`); each renderer `(section, ctx) → string`. `ctx = { locale, dir }`. Convention: every section wraps in `sectionShell(section, accentVar, iconName, innerHtml)`.

- [ ] **Step 1: Write the failing test** — `lp-render/test/sections-basic.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { getRenderer } = require('../template/sections');

const ctx = { locale: 'en', dir: 'ltr' };

test('objectives renders items and tag', () => {
  const html = getRenderer('objectives')({ type: 'objectives', time: '2 min',
    items: [{ text: 'Use 5 words', tag: 'Apply' }] }, ctx);
  assert.match(html, /Use 5 words/);
  assert.match(html, /Apply/);
  assert.match(html, /2 min/);
});

test('materials renders resources, target words, note', () => {
  const html = getRenderer('materials')({ type: 'materials',
    resources: ['Whiteboard'], targetWords: ['name', 'age'],
    note: { title: 'Tip', body: 'Use gestures' } }, ctx);
  assert.match(html, /Whiteboard/);
  assert.match(html, /name/); assert.match(html, /age/);
  assert.match(html, /Use gestures/);
});

test('unknown type falls back to generic', () => {
  const r = getRenderer('totally-unknown');
  const html = r({ type: 'totally-unknown', title: 'X', body: 'hi', items: ['a'] }, ctx);
  assert.match(html, /hi/); assert.match(html, />a</);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/sections-basic.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3a: Create the shared section-shell helper + registry** — `lp-render/template/sections/index.js`

```js
'use strict';
const { esc } = require('../shell');
const { icon } = require('../icons');
const { SECTION_ACCENT } = require('../tokens');

// Shared coloured-header wrapper every renderer uses.
function sectionShell(section, iconName, innerHtml) {
  const accent = SECTION_ACCENT[section.type] || '--ink';
  const title = esc(section.title || defaultTitle(section.type));
  const time = section.time ? `<span class="time">${esc(section.time)}</span>` : '';
  return `<section class="section"><div class="sec-head">` +
    `<div class="sec-disc" style="background:var(${accent})">${icon(iconName, 22)}</div>` +
    `<div class="sec-title">${title}</div>${time}</div>${innerHtml}</section>`;
}

const DEFAULT_TITLES = {
  objectives: 'Objectives', materials: 'Resources & Support', introduction: 'Introduction',
  explore: 'Explore', explanation: 'Explanation & Teaching', guided_practice: 'Guided Practice',
  assessment: 'Assessment & Wrap-up', differentiation: 'Differentiation', generic: 'Section',
};
function defaultTitle(type) { return DEFAULT_TITLES[type] || 'Section'; }

const RENDERERS = {
  objectives: require('./objectives'),
  materials: require('./materials'),
  introduction: require('./introduction'),
  explanation: require('./explanation'),
  guided_practice: require('./guided-practice'),
  assessment: require('./assessment'),
  differentiation: require('./differentiation'),
  generic: require('./generic'),
};

function getRenderer(type) {
  return RENDERERS[type] || RENDERERS.generic;
}

module.exports = { getRenderer, sectionShell, defaultTitle };
```

> Note: `index.js` `require`s all renderers up front. Tasks 8–10 create the remaining ones; until they exist, run the Task-7 test with only the three files present by temporarily commenting the not-yet-created requires. Simpler: create empty-but-valid stubs for the four later renderers now (each `module.exports = require('./generic')` re-export) and replace them in their tasks. Do that in Step 3d below.

- [ ] **Step 3b: `generic.js`** — `lp-render/template/sections/generic.js`

```js
'use strict';
const { esc } = require('../shell');
const { sectionShell } = require('./index');

module.exports = function generic(section, _ctx) {
  const items = Array.isArray(section.items) && section.items.length
    ? `<ul class="list">${section.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const body = section.body ? `<p class="lead">${esc(section.body)}</p>` : '';
  return sectionShell(section, 'lightbulb', `<div class="panel">${body}${items}</div>`);
};
```

> `generic.js` requires `./index` for `sectionShell`, and `index.js` requires `./generic`. Node handles this circular require because `sectionShell` is only *called* at render time, not at module-load time. Keep `sectionShell`'s definition above the `RENDERERS` require block (as written) so it is assigned before the children load.

- [ ] **Step 3c: `objectives.js`** — `lp-render/template/sections/objectives.js`

```js
'use strict';
const { esc } = require('../shell');
const { sectionShell } = require('./index');

module.exports = function objectives(section, _ctx) {
  const items = (section.items || []).map((it) => {
    const tag = it.tag ? `<span class="tag">${esc(it.tag)}</span>` : '';
    return `<li>${esc(it.text)}${tag}</li>`;
  }).join('');
  return sectionShell(section, 'target', `<div class="panel"><ul class="list">${items}</ul></div>`);
};
```

- [ ] **Step 3d: `materials.js`** — `lp-render/template/sections/materials.js`

```js
'use strict';
const { esc } = require('../shell');
const { sectionShell } = require('./index');

module.exports = function materials(section, _ctx) {
  const res = (section.resources || []).map((t) => `<li>${esc(t)}</li>`).join('');
  const words = (section.targetWords || []).length
    ? `<div class="subh" style="margin-top:10px">Target words</div>` +
      `<ul class="list"><li>${section.targetWords.map(esc).join(' · ')}</li></ul>` : '';
  const note = section.note
    ? `<div class="note"><div class="nt">${esc(section.note.title || 'Teacher note')}</div>` +
      `<p>${esc(section.note.body)}</p></div>` : '';
  const inner = `<div class="panel"><div class="subh">Resources</div>` +
    `<ul class="list">${res}</ul>${words}${note}</div>`;
  return sectionShell(section, 'toolbox', inner);
};
```

- [ ] **Step 3e: Create temporary re-export stubs** for the four not-yet-built renderers so `index.js` loads:

```bash
for f in introduction explanation guided-practice assessment differentiation; do
  echo "'use strict';\nmodule.exports = require('./generic');" > lp-render/template/sections/$f.js
done
```

(Tasks 8–10 replace `introduction.js`, `explanation.js`, `guided-practice.js`, `assessment.js`, `differentiation.js` with real implementations.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/sections-basic.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/sections/ lp-render/test/sections-basic.test.js
git commit -m "feat(lp-render): section registry + generic/objectives/materials renderers"
```

---

### Task 8: `introduction` + `differentiation` renderers

**Files:**
- Modify: `lp-render/template/sections/introduction.js`, `lp-render/template/sections/differentiation.js` (replace stubs)
- Test: `lp-render/test/sections-intro-diff.test.js`

**Interfaces:**
- Consumes: `esc()`, `icon()`, `sectionShell()`.
- Produces: `introduction(section, ctx) → string`, `differentiation(section, ctx) → string`.

- [ ] **Step 1: Write the failing test** — `lp-render/test/sections-intro-diff.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { getRenderer } = require('../template/sections');
const ctx = { locale: 'en', dir: 'ltr' };

test('introduction renders greeting + story bubbles with icons', () => {
  const html = getRenderer('introduction')({ type: 'introduction', time: '5 min',
    greeting: 'Good morning!', stories: [{ label: 'Story', text: 'Pinky went to school', icon: 'school' }] }, ctx);
  assert.match(html, /Good morning!/);
  assert.match(html, /Pinky went to school/);
  assert.match(html, /<svg/);
});

test('differentiation renders struggling + advanced', () => {
  const html = getRenderer('differentiation')({ type: 'differentiation',
    struggling: 'Give sentence starters', advanced: 'Use two words' }, ctx);
  assert.match(html, /Give sentence starters/);
  assert.match(html, /Use two words/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/sections-intro-diff.test.js`
Expected: FAIL — assertions fail (stubs render generic, no bubbles/greeting).

- [ ] **Step 3a: `introduction.js`**

```js
'use strict';
const { esc } = require('../shell');
const { icon, hasIcon } = require('../icons');
const { sectionShell } = require('./index');

module.exports = function introduction(section, _ctx) {
  const greet = section.greeting ? `<div class="lead" style="color:#1f7fb8;margin-bottom:10px">${esc(section.greeting)}</div>` : '';
  const stories = (section.stories || []).map((s) => {
    const pic = s.icon && hasIcon(s.icon) ? `<div class="pic">${icon(s.icon, 40)}</div>` : '';
    const label = s.label ? `<b>${esc(s.label)}:</b> ` : '';
    return `<div class="story">${pic}<div class="bubble">${label}${esc(s.text)}</div></div>`;
  }).join('');
  return sectionShell(section, 'rocket', `<div class="panel">${greet}${stories}</div>`);
};
```

- [ ] **Step 3b: `differentiation.js`**

```js
'use strict';
const { esc } = require('../shell');
const { sectionShell } = require('./index');

module.exports = function differentiation(section, _ctx) {
  const s = section.struggling ? `<div class="diff s"><div class="subh">For struggling students</div><p>${esc(section.struggling)}</p></div>` : '';
  const a = section.advanced ? `<div class="diff a"><div class="subh">For advanced students</div><p>${esc(section.advanced)}</p></div>` : '';
  return sectionShell(section, 'ladder', `<div class="two">${s}${a}</div>`);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/sections-intro-diff.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/sections/introduction.js lp-render/template/sections/differentiation.js lp-render/test/sections-intro-diff.test.js
git commit -m "feat(lp-render): introduction + differentiation renderers"
```

---

### Task 9: `explanation` renderer (word wall, formula, steps, CFU)

**Files:**
- Modify: `lp-render/template/sections/explanation.js` (replace stub)
- Test: `lp-render/test/sections-explanation.test.js`

**Interfaces:**
- Consumes: `esc()`, `icon()`, `sectionShell()`.
- Produces: `explanation(section, ctx) → string`.

- [ ] **Step 1: Write the failing test** — `lp-render/test/sections-explanation.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { getRenderer } = require('../template/sections');
const ctx = { locale: 'en', dir: 'ltr' };

test('explanation renders word wall, formula, steps and cfu', () => {
  const html = getRenderer('explanation')({ type: 'explanation', time: '15 min',
    wordWall: [{ word: 'name', meaning: 'what people call you', icon: 'nametag' }],
    formula: { parts: [{ label: 'WHO', value: 'I' }, { label: 'ACTION', value: 'like' }] },
    steps: [{ label: 'Model', body: 'I like to paint.' }],
    cfu: [{ q: 'Which word = people you live with?', a: 'family' }] }, ctx);
  assert.match(html, /name/);
  assert.match(html, /what people call you/);
  assert.match(html, /WHO/); assert.match(html, />I</);
  assert.match(html, /I like to paint\./);
  assert.match(html, /family/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/sections-explanation.test.js`
Expected: FAIL — stub renders generic.

- [ ] **Step 3: `explanation.js`**

```js
'use strict';
const { esc } = require('../shell');
const { icon, hasIcon } = require('../icons');
const { sectionShell } = require('./index');

function wordWall(items) {
  if (!items || !items.length) return '';
  const cards = items.map((w) => {
    const disc = w.icon && hasIcon(w.icon) ? `<div class="disc">${icon(w.icon, 30)}</div>` : '';
    return `<div class="wcard">${disc}<div class="w">${esc(w.word)}</div><div class="m">${esc(w.meaning)}</div></div>`;
  }).join('');
  return `<div class="grid5">${cards}</div>`;
}

function formula(f) {
  if (!f || !Array.isArray(f.parts) || !f.parts.length) return '';
  const bits = [];
  f.parts.forEach((p, i) => {
    if (i > 0) bits.push('<div class="plus">+</div>');
    bits.push(`<div class="fb"><div class="l">${esc(p.label)}</div><div class="v">${esc(p.value)}</div></div>`);
  });
  return `<div class="formula">${bits.join('')}</div>`;
}

function steps(list) {
  return (list || []).map((s) =>
    `<div class="step"><div class="badge">${esc(s.label)}</div><div class="body">${esc(s.body)}</div></div>`
  ).join('');
}

function cfu(list) {
  if (!list || !list.length) return '';
  const cards = list.map((c) =>
    `<div class="qa"><div class="q">${esc(c.q)}</div><div class="a">${esc(c.a)}</div></div>`
  ).join('');
  return `<div class="subh" style="margin-top:14px">Check for understanding</div><div class="qa3">${cards}</div>`;
}

module.exports = function explanation(section, _ctx) {
  const inner = `<div class="panel">${wordWall(section.wordWall)}${formula(section.formula)}` +
    `${steps(section.steps)}${cfu(section.cfu)}</div>`;
  return sectionShell(section, 'lightbulb', inner);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/sections-explanation.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/sections/explanation.js lp-render/test/sections-explanation.test.js
git commit -m "feat(lp-render): explanation renderer (word wall, formula, steps, CFU)"
```

---

### Task 10: `guided_practice` + `assessment` renderers

**Files:**
- Modify: `lp-render/template/sections/guided-practice.js`, `lp-render/template/sections/assessment.js` (replace stubs)
- Test: `lp-render/test/sections-practice-assess.test.js`

**Interfaces:**
- Consumes: `esc()`, `icon()`, `sectionShell()`.
- Produces: `guided_practice(section, ctx) → string`, `assessment(section, ctx) → string`.

- [ ] **Step 1: Write the failing test** — `lp-render/test/sections-practice-assess.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { getRenderer } = require('../template/sections');
const ctx = { locale: 'en', dir: 'ltr' };

test('guided_practice renders task, samples, differentiation', () => {
  const html = getRenderer('guided_practice')({ type: 'guided_practice', time: '15 min',
    task: 'Write 5 sentences', samples: [{ text: 'My name is Ali.', icon: 'nametag' }],
    differentiation: { struggling: 'starters', advanced: 'two words' } }, ctx);
  assert.match(html, /Write 5 sentences/);
  assert.match(html, /My name is Ali\./);
  assert.match(html, /starters/); assert.match(html, /two words/);
});

test('assessment renders AFL up/down, exit ticket, homework', () => {
  const html = getRenderer('assessment')({ type: 'assessment', time: '3 min',
    afl: { instruction: 'Thumbs?', items: [
      { text: 'I eat my name.', verdict: 'down' }, { text: 'My family lives here.', verdict: 'up' } ] },
    exitTicket: 'Read one sentence aloud', homework: 'Draw your family' }, ctx);
  assert.match(html, /Thumbs\?/);
  assert.match(html, /I eat my name\./);
  assert.match(html, /grow down/); assert.match(html, /grow up/);
  assert.match(html, /Read one sentence aloud/);
  assert.match(html, /Draw your family/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/sections-practice-assess.test.js`
Expected: FAIL — stubs render generic.

- [ ] **Step 3a: `guided-practice.js`**

```js
'use strict';
const { esc } = require('../shell');
const { icon, hasIcon } = require('../icons');
const { sectionShell } = require('./index');

module.exports = function guidedPractice(section, _ctx) {
  const task = section.task ? `<p class="lead">${esc(section.task)}</p>` : '';
  const note = section.note ? `<div class="note"><div class="nt">Teacher note</div><p>${esc(section.note)}</p></div>` : '';
  const samples = (section.samples || []).length
    ? `<div class="grid5" style="margin-top:12px">` + section.samples.map((s) => {
        const top = s.icon && hasIcon(s.icon) ? `<div class="top">${icon(s.icon, 30)}</div>` : '<div class="top"></div>';
        return `<div class="scard">${top}<div class="s">${esc(s.text)}</div></div>`;
      }).join('') + `</div>` : '';
  const d = section.differentiation || {};
  const diff = (d.struggling || d.advanced)
    ? `<div class="two" style="margin-top:12px">` +
      (d.struggling ? `<div class="diff s"><div class="subh">For struggling students</div><p>${esc(d.struggling)}</p></div>` : '') +
      (d.advanced ? `<div class="diff a"><div class="subh">For advanced students</div><p>${esc(d.advanced)}</p></div>` : '') +
      `</div>` : '';
  return sectionShell(section, 'pencil', `<div class="panel">${task}${note}${samples}${diff}</div>`);
};
```

- [ ] **Step 3b: `assessment.js`**

```js
'use strict';
const { esc } = require('../shell');
const { icon } = require('../icons');
const { sectionShell } = require('./index');

module.exports = function assessment(section, _ctx) {
  let afl = '';
  if (section.afl && Array.isArray(section.afl.items)) {
    const note = section.afl.instruction ? `<div class="afl-note">${esc(section.afl.instruction)}</div>` : '';
    const rows = section.afl.items.map((it) => {
      const up = it.verdict === 'up';
      const cls = up ? 'up' : 'down';
      const glyph = up ? icon('thumbup', 18) : icon('thumbdown', 18);
      return `<div class="grow ${cls}"><div class="t">${esc(it.text)}</div><div class="vb ${up ? 'u' : 'd'}">${glyph}</div></div>`;
    }).join('');
    afl = `${note}${rows}`;
  }
  const exit = section.exitTicket ? `<div class="note"><div class="nt">Exit ticket</div><p>${esc(section.exitTicket)}</p></div>` : '';
  const hw = section.homework ? `<div class="note" style="background:var(--grape-soft);border-color:var(--grape-bd);border-inline-start-color:var(--grape)"><div class="nt" style="color:var(--grape)">Homework</div><p>${esc(section.homework)}</p></div>` : '';
  return sectionShell(section, 'checklist', `<div class="panel">${afl}${exit}${hw}</div>`);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/sections-practice-assess.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/sections/guided-practice.js lp-render/template/sections/assessment.js lp-render/test/sections-practice-assess.test.js
git commit -m "feat(lp-render): guided_practice + assessment renderers"
```

---

### Task 11: `buildLessonPlanHtml` composition

**Files:**
- Create: `lp-render/template/build.js`
- Test: `lp-render/test/build.test.js`

**Interfaces:**
- Consumes: `buildShell()`, `esc()` (Task 6), `getRenderer()` (Task 7), `resolveDirection()` (Task 3).
- Produces: `buildLessonPlanHtml(lesson, { locale }) → string`.

- [ ] **Step 1: Write the failing test** — `lp-render/test/build.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildLessonPlanHtml } = require('../template/build');

const lesson = {
  meta: { id: '113087', subject: 'English', grade: 'One', locale: 'en',
          title: 'Descriptive Sentences', durationMin: 40, classSize: 23, type: 'Comprehension' },
  sections: [
    { type: 'objectives', time: '2 min', items: [{ text: 'Use 5 words', tag: 'Apply' }] },
    { type: 'assessment', time: '3 min', afl: { instruction: 'Thumbs?', items: [{ text: 'x', verdict: 'up' }] } },
  ],
};

test('build produces a full doc with header meta and all sections', () => {
  const html = buildLessonPlanHtml(lesson, { locale: 'en' });
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /Descriptive Sentences/);
  assert.match(html, /113087/); assert.match(html, /English/); assert.match(html, /23/);
  assert.match(html, /Use 5 words/);
  assert.match(html, /Thumbs\?/);
});

test('urdu build sets rtl and contains no raster/external images', () => {
  const ur = buildLessonPlanHtml({ ...lesson, meta: { ...lesson.meta, locale: 'ur' } }, {});
  assert.match(ur, /dir="rtl"/);
  assert.doesNotMatch(ur, /<img|data:image|file:\/\//);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/build.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation** — `lp-render/template/build.js`

```js
'use strict';
const { buildShell, esc } = require('./shell');
const { getRenderer } = require('./sections');
const { resolveDirection } = require('./direction');

function buildHeader(meta) {
  const chips = [];
  if (meta.id) chips.push(`<span><b>ID</b> ${esc(meta.id)}</span>`);
  if (meta.subject) chips.push(`<span><b>Subject</b> ${esc(meta.subject)}</span>`);
  if (meta.grade) chips.push(`<span><b>Grade</b> ${esc(meta.grade)}</span>`);
  if (meta.classSize) chips.push(`<span><b>Class</b> ${esc(meta.classSize)}</span>`);
  if (meta.durationMin) chips.push(`<span><b>Time</b> ${esc(meta.durationMin)} min</span>`);
  if (meta.type) chips.push(`<span><b>Type</b> ${esc(meta.type)}</span>`);
  const sub = meta.subtitle ? `<div class="sub">${esc(meta.subtitle)}</div>` : '';
  return `<div class="lp-header"><h1>${esc(meta.title)}</h1>${sub}<div class="meta">${chips.join('')}</div></div>`;
}

function buildLessonPlanHtml(lesson, opts = {}) {
  const meta = lesson.meta || {};
  const locale = opts.locale || meta.locale || 'en';
  const { dir } = resolveDirection(locale);
  const ctx = { locale, dir };
  const headerHtml = buildHeader(meta);
  const bodyHtml = (lesson.sections || []).map((s) => getRenderer(s.type)(s, ctx)).join('');
  return buildShell({ headerHtml, bodyHtml, locale, title: meta.title || 'Lesson Plan' });
}

module.exports = { buildLessonPlanHtml };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/build.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/build.js lp-render/test/build.test.js
git commit -m "feat(lp-render): buildLessonPlanHtml composition (header + sections)"
```

---

### Task 12: `htmlToPdf` — local Playwright renderer (rumi-compatible)

**Files:**
- Create: `lp-render/render/html-to-pdf.js`
- Test: `lp-render/test/render.smoke.test.js`

**Interfaces:**
- Consumes: nothing (Playwright).
- Produces: `htmlToPdf(html, options = {}) → Promise<Buffer>`; `closeBrowser() → Promise<void>`. Options: `{ timeout = 30000, pdfOptions }`. Signature identical to rumi's `bot/shared/utils/html-to-pdf.js`.

- [ ] **Step 1: Write the failing/skipping smoke test** — `lp-render/test/render.smoke.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { htmlToPdf, closeBrowser } = require('../render/html-to-pdf');

// Skips when no Chromium is resolvable (e.g. CI without a browser).
test('htmlToPdf yields a %PDF- buffer', async (t) => {
  let buf;
  try {
    buf = await htmlToPdf('<!DOCTYPE html><html><body><h1>Hi</h1></body></html>');
  } catch (e) {
    if (/executable|Chromium|browserType|ENOENT/i.test(String(e.message))) {
      t.skip(`no Chromium available: ${e.message}`);
      return;
    }
    throw e;
  } finally {
    await closeBrowser();
  }
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 1000);
  assert.strictEqual(buf.subarray(0, 5).toString('latin1'), '%PDF-');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/render.smoke.test.js`
Expected: FAIL — `Cannot find module '../render/html-to-pdf'`.

- [ ] **Step 3: Write implementation** — `lp-render/render/html-to-pdf.js`

Mirrors rumi's primitive: lazy browser singleton, launch lock, resolves a system/available Chromium, waits fonts, returns a PDF Buffer.

```js
'use strict';
const fs = require('node:fs');
const { chromium } = require('playwright-core');

let _browser = null;
let _launching = null;

// Resolve a Chromium executable. Honors env overrides (as rumi does), then
// common system paths, then a puppeteer-installed Chromium if present locally.
function resolveChromiumPath() {
  const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const candidates = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  try {
    const pptr = require('puppeteer');
    if (typeof pptr.executablePath === 'function') {
      const p = pptr.executablePath();
      if (p && fs.existsSync(p)) return p;
    }
  } catch (_) { /* puppeteer not installed — fine */ }
  return undefined; // let Playwright try its own default; may throw (handled by caller/skip)
}

async function getBrowser() {
  if (_browser) return _browser;
  if (_launching) return _launching;
  _launching = chromium.launch({
    headless: true,
    executablePath: resolveChromiumPath(),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
  }).then((b) => { _browser = b; _launching = null; return b; });
  return _launching;
}

const DEFAULT_PDF = { format: 'A4', printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' } };

async function htmlToPdf(html, options = {}) {
  const { timeout = 30000, pdfOptions = {} } = options;
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle', timeout });
    await page.evaluate(async () => { await document.fonts.ready; });
    const buf = await page.pdf({ ...DEFAULT_PDF, ...pdfOptions });
    return buf;
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (_browser) { await _browser.close(); _browser = null; }
}

for (const sig of ['exit', 'SIGINT', 'SIGTERM']) {
  process.on(sig, () => { if (_browser) { try { _browser.close(); } catch (_) {} } });
}

module.exports = { htmlToPdf, closeBrowser };
```

- [ ] **Step 4: Run test to verify it passes (or skips cleanly)**

Run: `node --test lp-render/test/render.smoke.test.js`
Expected: PASS (real `%PDF-` buffer) where Chromium is available; otherwise the single test SKIPS with a "no Chromium" message — not a failure.

- [ ] **Step 5: Commit**

```bash
git add lp-render/render/html-to-pdf.js lp-render/test/render.smoke.test.js
git commit -m "feat(lp-render): local Playwright htmlToPdf (rumi-compatible signature)"
```

---

### Task 13: Public API (`index.js`)

**Files:**
- Create: `lp-render/index.js`
- Test: `lp-render/test/index.test.js`

**Interfaces:**
- Consumes: `validateLesson()` (Task 1), `buildLessonPlanHtml()` (Task 11), `htmlToPdf()` (Task 12).
- Produces: `renderLessonPlanPdf(lesson, { locale }) → Promise<Buffer>`; re-exports `buildLessonPlanHtml`, `validateLesson`, `htmlToPdf`, `closeBrowser`.

- [ ] **Step 1: Write the failing test** — `lp-render/test/index.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const api = require('../index');

test('exposes the public surface', () => {
  for (const fn of ['renderLessonPlanPdf', 'buildLessonPlanHtml', 'validateLesson', 'htmlToPdf', 'closeBrowser']) {
    assert.strictEqual(typeof api[fn], 'function', `missing ${fn}`);
  }
});

test('renderLessonPlanPdf throws a clear error on invalid input (before touching a browser)', async () => {
  await assert.rejects(
    () => api.renderLessonPlanPdf({ sections: [] }),
    (err) => /meta/.test(err.message)
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/index.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation** — `lp-render/index.js`

```js
'use strict';
const { validateLesson } = require('./schema');
const { buildLessonPlanHtml } = require('./template/build');
const { htmlToPdf, closeBrowser } = require('./render/html-to-pdf');

async function renderLessonPlanPdf(lesson, opts = {}) {
  const { ok, errors } = validateLesson(lesson);
  if (!ok) throw new Error(`Invalid lesson: ${errors.join('; ')}`);
  const html = buildLessonPlanHtml(lesson, opts);
  return htmlToPdf(html, { pdfOptions: { format: 'A4', printBackground: true } });
}

module.exports = { renderLessonPlanPdf, buildLessonPlanHtml, validateLesson, htmlToPdf, closeBrowser };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/index.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lp-render/index.js lp-render/test/index.test.js
git commit -m "feat(lp-render): public API (renderLessonPlanPdf + re-exports)"
```

---

### Task 14: 113087 fixtures + parity build test

**Files:**
- Create: `lp-render/fixtures/lesson-113087.en.json`, `lp-render/fixtures/lesson-113087.ur.json`
- Test: `lp-render/test/fixtures.test.js`

**Interfaces:**
- Consumes: `validateLesson()`, `buildLessonPlanHtml()`.
- Produces: two canonical fixture lessons in the schema.

- [ ] **Step 1: Write the failing test** — `lp-render/test/fixtures.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { validateLesson } = require('../schema');
const { buildLessonPlanHtml } = require('../template/build');

function load(f) { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', f), 'utf8')); }

test('en fixture is valid and renders key content', () => {
  const lesson = load('lesson-113087.en.json');
  assert.strictEqual(validateLesson(lesson).ok, true);
  const html = buildLessonPlanHtml(lesson, {});
  assert.match(html, /Descriptive Sentences/);
  assert.match(html, /My name is Ali\./);
  assert.match(html, /Thumbs/i);
});

test('ur fixture is valid, rtl, and free of raster/external images', () => {
  const lesson = load('lesson-113087.ur.json');
  assert.strictEqual(validateLesson(lesson).ok, true);
  const html = buildLessonPlanHtml(lesson, {});
  assert.match(html, /dir="rtl"/);
  assert.doesNotMatch(html, /<img|data:image|file:\/\/|https?:\/\/(?!www\.w3)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/fixtures.test.js`
Expected: FAIL — fixture files not found.

- [ ] **Step 3: Create `lesson-113087.en.json`**

Express the 113087 lesson (content lifted from the existing `lesson-113087-full.html`) in the schema:

```json
{
  "meta": { "id": "113087", "subject": "English", "grade": "One", "locale": "en",
    "title": "Descriptive Sentences", "subtitle": "Writing with target words",
    "durationMin": 40, "classSize": 23, "type": "Comprehension (Word Meanings)" },
  "sections": [
    { "type": "objectives", "time": "2 min",
      "items": [ { "text": "Students will use 5 target words (name, age, family, like, school) in descriptive sentences.", "tag": "Apply" } ] },
    { "type": "materials",
      "resources": ["Whiteboard and markers", "Flashcards of the 5 target words with simple icons"],
      "targetWords": ["name", "age", "family", "like", "school"],
      "note": { "title": "Teacher note - gestures", "body": "Point to yourself for name, hold up fingers for age, hug your arms for family, thumbs up for like, make a roof over your head for school." } },
    { "type": "introduction", "time": "5 min", "greeting": "Good morning, class! Today we learn some powerful new words.",
      "stories": [
        { "label": "A short story", "text": "A little girl named Pinky went to a big building to read and write. Where was she? At school!", "icon": "school" },
        { "text": "Zainab lives with her mother, father and baby brother. What do we call them? Family!", "icon": "family" } ] },
    { "type": "explanation", "time": "15 min",
      "wordWall": [
        { "word": "name", "meaning": "what people call you", "icon": "nametag" },
        { "word": "age", "meaning": "how many years old you are", "icon": "cake" },
        { "word": "family", "meaning": "the people you live with", "icon": "family" },
        { "word": "like", "meaning": "something that makes you happy", "icon": "heart" },
        { "word": "school", "meaning": "the place where you go to learn", "icon": "school" } ],
      "formula": { "parts": [ { "label": "WHO/WHAT", "value": "Who / What" }, { "label": "ACTION", "value": "Action" }, { "label": "DESCRIPTION", "value": "Description" } ] },
      "steps": [
        { "label": "Teacher Model", "body": "I like to paint nice pictures. Who? I. Action? like. Description? to paint nice pictures." },
        { "label": "Shared Practice", "body": "Bilal goes to a big school. Who? Bilal. Action? goes to. Description? a big school." } ],
      "cfu": [
        { "q": "Which word means the people you live with?", "a": "Family" },
        { "q": "\"I am six years old.\" Which word is this?", "a": "Age" },
        { "q": "In the formula, what comes after Who/What?", "a": "Action" } ] },
    { "type": "guided_practice", "time": "15 min",
      "task": "All students write original sentences for all 5 target words using Who/What + Action + Description.",
      "note": "Work in pairs (brainstorming) or individually (focused writing) based on your class.",
      "samples": [
        { "text": "My name is Ali.", "icon": "nametag" },
        { "text": "My age is six.", "icon": "cake" },
        { "text": "My family loves to play.", "icon": "family" },
        { "text": "I like to eat apples.", "icon": "apple" },
        { "text": "My school has a big park.", "icon": "school" } ],
      "differentiation": { "struggling": "Provide sentence starters: \"My name ____.\" \"I like ____.\"", "advanced": "Use two target words in one sentence: \"My family likes my school.\"" } },
    { "type": "assessment", "time": "3 min",
      "afl": { "instruction": "Thumbs up if the target word is used correctly, thumbs down if wrong.",
        "items": [
          { "text": "I eat my name for breakfast.", "verdict": "down" },
          { "text": "My family lives in my house.", "verdict": "up" },
          { "text": "I am age years old.", "verdict": "down" },
          { "text": "I like to play games.", "verdict": "up" },
          { "text": "I sleep in my school at night.", "verdict": "down" } ] },
      "exitTicket": "Have 2-3 students read their favourite sentence aloud.",
      "homework": "Draw your family and write one sentence about them using the formula." }
  ]
}
```

- [ ] **Step 4: Create `lesson-113087.ur.json`**

Same structure, Urdu text (lifted from the existing `lesson-113087-ur.html`), `meta.locale` = `"ur"`, icons unchanged:

```json
{
  "meta": { "id": "113087", "subject": "انگریزی", "grade": "اول", "locale": "ur",
    "title": "میرے بولنے والے الفاظ", "subtitle": "پانچ خاص الفاظ سے اپنے بارے میں بتائیں",
    "durationMin": 40, "classSize": 23, "type": "فہم — الفاظ کے معنی" },
  "sections": [
    { "type": "objectives", "time": "۲ منٹ",
      "items": [ { "text": "طلبہ ۵ ہدف الفاظ (نام، عمر، خاندان، پسند، اسکول) کو وضاحتی جملوں میں استعمال کر سکیں گے۔", "tag": "اطلاق" } ] },
    { "type": "materials",
      "resources": ["وائٹ بورڈ اور مارکر", "۵ ہدف الفاظ کے فلیش کارڈ"],
      "targetWords": ["نام", "عمر", "خاندان", "پسند", "اسکول"],
      "note": { "title": "اُستاد کے لیے نوٹ", "body": "اشاروں سے معنی سمجھائیں۔" } },
    { "type": "explanation", "time": "۱۵ منٹ",
      "wordWall": [
        { "word": "نام", "meaning": "جس نام سے لوگ آپ کو پکارتے ہیں", "icon": "nametag" },
        { "word": "عمر", "meaning": "آپ کتنے سال کے ہیں", "icon": "cake" },
        { "word": "خاندان", "meaning": "جن کے ساتھ آپ رہتے ہیں", "icon": "family" },
        { "word": "پسند", "meaning": "جو چیز آپ کو خوش کرتی ہے", "icon": "heart" },
        { "word": "اسکول", "meaning": "جہاں آپ سیکھنے جاتے ہیں", "icon": "school" } ],
      "formula": { "parts": [ { "label": "WHO", "value": "کون / کیا" }, { "label": "ACTION", "value": "عمل" }, { "label": "DESC", "value": "تفصیل" } ] } }
  ]
}
```

> The `ur` fixture is intentionally shorter (objectives, materials, explanation) — enough to prove RTL + Nastaliq + the word-wall render. Extend later if a fuller Urdu fixture is wanted.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test lp-render/test/fixtures.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lp-render/fixtures/ lp-render/test/fixtures.test.js
git commit -m "test(lp-render): 113087 en/ur fixtures + parity build test"
```

---

### Task 15: Cleanup — remove non-module files

**Files:**
- Remove (via `git rm`): the non-module files listed in the spec §11.
- Modify: none (package.json already trimmed in Task 1).

**Interfaces:** none.

- [ ] **Step 1: Verify the full module suite is green first**

Run: `node --test lp-render/test/`
Expected: PASS (smoke test may SKIP if no Chromium). Do not proceed if anything fails.

- [ ] **Step 2: Remove non-module files**

```bash
git rm -r \
  src/benchmark.js src/llmClient.js src/models.js src/generate.js src/promptBuilder.js \
  src/gallery.js src/testset.js src/template.js src/renderer.js src/fonts.js \
  scripts/run-benchmark.js content-svg-agent \
  docs/comparison.html docs/comparison-site.html docs/pinky-interactive.html \
  docs/COMPARISON.md docs/RECOMMENDATION.md references \
  index.html lesson-113087-full.html lesson-113087-ur.html lesson-113087-sd.html \
  lesson-descriptive-sentences.html lesson-talking-words-original.html \
  scratch-multilang.js scratch-artifact-update.js render.js 2>/dev/null || true
git rm -r test/benchmark.test.js test/fonts.test.js test/gallery.test.js test/generate.test.js \
  test/llmClient.test.js test/models.test.js test/promptBuilder.test.js test/renderer.test.js \
  test/template.test.js test/validateHtml.test.js src/validateHtml.js 2>/dev/null || true
```

(The `|| true` and `2>/dev/null` tolerate any file already absent. `assets/generated/` PNGs and `docs/superpowers/` are intentionally NOT removed.)

- [ ] **Step 3: Verify nothing the module needs was removed**

Run: `node --test lp-render/test/`
Expected: PASS (same as Step 1). If any test now errors on a missing require, restore that file with `git checkout HEAD -- <path>`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(lp-render): remove non-module files (benchmark harness, old renderers, demo HTML)"
```

---

### Task 16: README + final suite green

**Files:**
- Create: `lp-render/README.md`
- Modify: `README.md` (root — replace with a short pointer)

**Interfaces:** none.

- [ ] **Step 1: Write `lp-render/README.md`**

````markdown
# lp-render

Turn a single-locale lesson-plan JSON into an **A4 PDF buffer**, entirely from code
(HTML/CSS + inline SVG, rendered by Playwright). No Gamma, no AI image model, no
hard-coded content. Drop-in for rumi-platform.

## API

```js
const { renderLessonPlanPdf, buildLessonPlanHtml, validateLesson } = require('./lp-render');

const pdf = await renderLessonPlanPdf(lesson, { locale: 'ur' }); // Buffer
const html = buildLessonPlanHtml(lesson, { locale: 'ur' });       // string (browser-free)
const { ok, errors } = validateLesson(lesson);
```

Input schema: `{ meta: { id, subject, grade, locale, title, subtitle?, durationMin?, classSize?, type? },
sections: [ { type, title?, time?, ...typed } ] }`. Section types: `objectives, materials,
introduction, explore, explanation, guided_practice, assessment, differentiation, generic`.
See `fixtures/lesson-113087.en.json` for a full example.

## Test

```bash
node --test lp-render/test/
```

The PDF smoke test skips when no Chromium is resolvable.

## Integration (rumi-platform)

Delete `render/html-to-pdf.js` and import rumi's `bot/shared/utils/html-to-pdf.js`
(identical signature). Upload the returned buffer via `uploadLessonPlanBuffer(...)`.
Wire behind a feature flag inside `content.service.js`. See
`docs/superpowers/specs/2026-07-25-lp-render-module-design.md`.
````

- [ ] **Step 2: Replace root `README.md` with a pointer**

```markdown
# lp-render (lesson-plan code renderer)

Standalone module that renders lesson-plan JSON to an A4 PDF buffer via HTML/CSS + SVG + Playwright.

See **[lp-render/README.md](lp-render/README.md)** and the design spec at
**[docs/superpowers/specs/2026-07-25-lp-render-module-design.md](docs/superpowers/specs/2026-07-25-lp-render-module-design.md)**.
```

- [ ] **Step 3: Run the full suite**

Run: `node --test lp-render/test/`
Expected: PASS across all files (smoke may SKIP).

- [ ] **Step 4: Commit**

```bash
git add lp-render/README.md README.md
git commit -m "docs(lp-render): module README + root pointer"
```

---

## Self-Review

**Spec coverage:**
- Public API (§3) → Tasks 1, 11, 12, 13. ✓
- Input schema (§4) → Task 1 (`SECTION_TYPES`, validation) + every renderer Task 7–10 + fixtures Task 14. ✓
- Module layout (§5) → Tasks 1–14 create each listed file. ✓
- Data flow (§6) → Task 13 (`renderLessonPlanPdf`) + Task 11 (`buildLessonPlanHtml`). ✓
- Rendering & fonts (§7) → Task 2 (base64 fonts), Task 6 (shell embeds them), Task 12 (Playwright). ✓
- Visual system (§8) → Task 4 (tokens/accents), Task 5 (icons), Task 6 (CSS), renderers. ✓
- Testing (§9) → node:test in every task; `no <img>/external` asserted in Tasks 6, 11, 14; smoke skip in Task 12. ✓
- Error handling (§10) → Task 1 (validate), Task 7 (generic fallback), Task 13 (throw). ✓
- Cleanup (§11) → Task 15. ✓
- Non-goals (§12) → nothing in the plan touches R2/flags/feedback/content-gen. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command shows expected output. ✓

**Type consistency:** `validateLesson`, `fontFaceCss`, `resolveDirection`, `tokensCss`/`SECTION_ACCENT`, `icon`/`hasIcon`/`ICON_NAMES`, `buildShell`/`esc`, `getRenderer`/`sectionShell`, `buildLessonPlanHtml`, `htmlToPdf`/`closeBrowser`, `renderLessonPlanPdf` — names/signatures match across the tasks that produce and consume them. ✓

**Note on Task 7 circular require:** `sections/index.js` and the child renderers require each other; `sectionShell` is defined before the child `require` block and only invoked at render time, so load-time is safe. Flagged inline in Task 7.
