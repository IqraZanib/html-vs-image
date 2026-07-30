# Image Resolution Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pre-render step that resolves a lesson's image hints into inline SVG icons (dataset) or Openverse real photos (base64 + attribution), deterministically and offline-safe, then fix the `fit`-mode PDF bug that clips tall lessons.

**Architecture:** A new `lp-render/images/` layer (`license`, `cache`, `openverse`, `resolve`) turns a lesson's new `picture_cards` cards into a `_resolved` object per card. Network lives only in `resolveImages`; the existing renderer stays sync/deterministic and gains a `picture_cards` renderer plus an attribution footer.

**Tech Stack:** Node.js (CommonJS), `node:test` + `node:assert`, `node:https` (injectable), Playwright (existing), base64 data URIs.

## Global Constraints

- **No AI image generation** — ever (no DALL·E/Midjourney/FLUX/nano-banana). SVG icons + Openverse photos only.
- **Relevance-or-blank** — never insert an irrelevant/decorative image; if nothing matches, render nothing.
- **CommonJS** — `require`/`module.exports`, matching the existing module.
- **License whitelist** — accept only `pdm, cc0, by, by-sa`; reject everything else.
- **`resolveImages` never throws** on network/resolution failure — it degrades (photo → icon → blank).
- **Renderer is network-free** — all fetching happens in `resolveImages`, never during HTML/PDF build.
- **Openverse `source` default = `wikimedia`** (production). Dev/sandbox passes `source: 'flickr'`.
- Existing tests must stay green: `node --test lp-render/test/`.

---

### Task 1: License gate

**Files:**
- Create: `lp-render/images/license.js`
- Test: `lp-render/test/license.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `isAllowedLicense(code: string) → boolean`; `ALLOWED_LICENSES: string[]`.

- [ ] **Step 1: Write the failing test**

```js
// lp-render/test/license.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { isAllowedLicense, ALLOWED_LICENSES } = require('../images/license');

test('accepts public-domain and permissive CC licenses', () => {
  for (const c of ['pdm', 'cc0', 'by', 'by-sa', 'BY', ' By-Sa ']) {
    assert.strictEqual(isAllowedLicense(c), true, `should accept ${c}`);
  }
});

test('rejects non-commercial, no-derivatives, empty, unknown', () => {
  for (const c of ['by-nc', 'by-nc-sa', 'by-nd', '', null, undefined, 'sampling+']) {
    assert.strictEqual(isAllowedLicense(c), false, `should reject ${c}`);
  }
});

test('exposes the allowed set', () => {
  assert.deepStrictEqual([...ALLOWED_LICENSES].sort(), ['by', 'by-sa', 'cc0', 'pdm']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/license.test.js`
Expected: FAIL — `Cannot find module '../images/license'`.

- [ ] **Step 3: Write minimal implementation**

```js
// lp-render/images/license.js
'use strict';
// Only Public Domain / CC0 / CC-BY / CC-BY-SA are usable (attribution logged).
// CC-BY-NC*, CC-BY-ND*, and anything unknown are rejected.
const ALLOWED = new Set(['pdm', 'cc0', 'by', 'by-sa']);

function isAllowedLicense(code) {
  return ALLOWED.has(String(code == null ? '' : code).trim().toLowerCase());
}

module.exports = { isAllowedLicense, ALLOWED_LICENSES: [...ALLOWED] };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/license.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lp-render/images/license.js lp-render/test/license.test.js
git commit -m "feat(lp-render): license whitelist gate for sourced images"
```

---

### Task 2: Image cache (interface + filesystem + memory)

**Files:**
- Create: `lp-render/images/cache.js`
- Test: `lp-render/test/cache.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `cacheKey(source, license, query) → string`; `class FsImageCache(dir)` with `async get(key)`/`async set(key, record)`; `class MemoryImageCache()` with the same two methods. `get` returns the stored record or `null` on miss.

- [ ] **Step 1: Write the failing test**

```js
// lp-render/test/cache.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cacheKey, FsImageCache, MemoryImageCache } = require('../images/cache');

test('cacheKey normalizes source, license and query', () => {
  assert.strictEqual(cacheKey('wikimedia', 'cc0,by', '  Duck  Bird '), 'wikimedia:cc0,by:duck bird');
});

test('MemoryImageCache round-trips and misses to null', async () => {
  const c = new MemoryImageCache();
  assert.strictEqual(await c.get('k'), null);
  await c.set('k', { dataUri: 'x' });
  assert.deepStrictEqual(await c.get('k'), { dataUri: 'x' });
});

test('FsImageCache round-trips through disk and misses to null', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lpcache-'));
  const c = new FsImageCache(dir);
  assert.strictEqual(await c.get('missing'), null);
  await c.set('wikimedia:cc0:cow', { title: 'A cow', dataUri: 'data:...' });
  assert.deepStrictEqual(await c.get('wikimedia:cc0:cow'), { title: 'A cow', dataUri: 'data:...' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/cache.test.js`
Expected: FAIL — `Cannot find module '../images/cache'`.

- [ ] **Step 3: Write minimal implementation**

```js
// lp-render/images/cache.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Stable cache key: source + license set + normalized query.
function cacheKey(source, license, query) {
  const q = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${source}:${license}:${q}`;
}

// Default cache: one JSON file per key (incl. base64) under `dir`.
class FsImageCache {
  constructor(dir) { this.dir = dir; }
  _file(key) {
    const h = crypto.createHash('sha1').update(key).digest('hex');
    return path.join(this.dir, `${h}.json`);
  }
  async get(key) {
    try { return JSON.parse(fs.readFileSync(this._file(key), 'utf8')); }
    catch (_) { return null; }
  }
  async set(key, record) {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this._file(key), JSON.stringify(record));
  }
}

// In-process cache (tests, single-run pipelines). rumi injects an R2-backed
// cache implementing the same { get, set } interface.
class MemoryImageCache {
  constructor() { this.m = new Map(); }
  async get(key) { return this.m.has(key) ? this.m.get(key) : null; }
  async set(key, record) { this.m.set(key, record); }
}

module.exports = { cacheKey, FsImageCache, MemoryImageCache };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/cache.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lp-render/images/cache.js lp-render/test/cache.test.js
git commit -m "feat(lp-render): pluggable image cache (fs + memory)"
```

---

### Task 3: Openverse client

**Files:**
- Create: `lp-render/images/openverse.js`
- Test: `lp-render/test/openverse.test.js`

**Interfaces:**
- Consumes: `isAllowedLicense` from `./license`.
- Produces: `async searchImage(query, opts) → record | null`, where `record = { dataUri, title, creator, license, source, sourceUrl }`. `opts` accepts `{ source='wikimedia', license='cc0,pdm,by,by-sa', size='medium', minSide=600, pageSize=12, timeout=12000, retries=1, fetchImpl, userAgent }`. **`fetchImpl(url, { binary, timeout, userAgent }) → Promise<{ statusCode, body }>`** — `body` is a `string` for the JSON search call and a `Buffer` when `binary:true`. Also exports `defaultFetch` (the `node:https` implementation).

- [ ] **Step 1: Write the failing test**

```js
// lp-render/test/openverse.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { searchImage } = require('../images/openverse');

// A stub fetchImpl: first call (contains '/v1/images/') returns the JSON search
// body; later calls (image urls) return bytes keyed by url.
function makeFetch(searchJson, bytesByUrl) {
  const calls = [];
  const fetchImpl = async (url, optsIn) => {
    calls.push(url);
    if (url.includes('/v1/images/')) return { statusCode: 200, body: JSON.stringify(searchJson) };
    const buf = bytesByUrl[url];
    if (!buf) return { statusCode: 404, body: Buffer.alloc(0) };
    return { statusCode: 200, body: buf };
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}
const bigJpeg = Buffer.alloc(50000, 1); // passes 4KB..2.2MB byte check

test('returns a record for the first license-valid, large-enough result', async () => {
  const search = { results: [
    { url: 'http://img/ok.jpg', title: 'A Duck', creator: 'Jo', license: 'by', license_version: '2.0',
      source: 'flickr', width: 1200, height: 800, foreign_landing_url: 'http://land/ok' },
  ] };
  const rec = await searchImage('duck', { fetchImpl: makeFetch(search, { 'http://img/ok.jpg': bigJpeg }), source: 'flickr' });
  assert.ok(rec);
  assert.match(rec.dataUri, /^data:image\/jpeg;base64,/);
  assert.strictEqual(rec.title, 'A Duck');
  assert.strictEqual(rec.creator, 'Jo');
  assert.strictEqual(rec.sourceUrl, 'http://land/ok');
});

test('skips a non-commercial result and picks the next valid one', async () => {
  const search = { results: [
    { url: 'http://img/nc.jpg', title: 'NC', creator: 'x', license: 'by-nc', width: 1200, height: 800 },
    { url: 'http://img/ok.jpg', title: 'OK', creator: 'y', license: 'cc0', width: 1200, height: 800 },
  ] };
  const rec = await searchImage('duck', { fetchImpl: makeFetch(search, { 'http://img/ok.jpg': bigJpeg }), source: 'flickr' });
  assert.strictEqual(rec.title, 'OK');
});

test('skips results below the minimum shortest side', async () => {
  const search = { results: [
    { url: 'http://img/tiny.jpg', title: 'tiny', creator: 'x', license: 'by', width: 300, height: 200 },
  ] };
  const rec = await searchImage('duck', { fetchImpl: makeFetch(search, { 'http://img/tiny.jpg': bigJpeg }), source: 'flickr', minSide: 600 });
  assert.strictEqual(rec, null);
});

test('skips downloads that are too small (broken)', async () => {
  const search = { results: [
    { url: 'http://img/small.jpg', title: 't', creator: 'x', license: 'by', width: 1200, height: 800 },
  ] };
  const rec = await searchImage('duck', { fetchImpl: makeFetch(search, { 'http://img/small.jpg': Buffer.alloc(100) }), source: 'flickr' });
  assert.strictEqual(rec, null);
});

test('returns null when the API call throws', async () => {
  const fetchImpl = async () => { throw new Error('network down'); };
  const rec = await searchImage('duck', { fetchImpl, source: 'flickr', retries: 0 });
  assert.strictEqual(rec, null);
});

test('returns null when there are no results', async () => {
  const rec = await searchImage('duck', { fetchImpl: makeFetch({ results: [] }, {}), source: 'flickr' });
  assert.strictEqual(rec, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/openverse.test.js`
Expected: FAIL — `Cannot find module '../images/openverse'`.

- [ ] **Step 3: Write minimal implementation**

```js
// lp-render/images/openverse.js
'use strict';
const https = require('node:https');
const { isAllowedLicense } = require('./license');

const API = 'https://api.openverse.org/v1/images/';

// Default network fetch. Resolves { statusCode, body } where body is a string
// unless binary:true (then a Buffer). Follows one level of redirects.
function defaultFetch(url, { binary = false, timeout = 12000, userAgent = 'TaleemabadLP/1.0 (educational)' } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': userAgent } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return resolve(defaultFetch(r.headers.location, { binary, timeout, userAgent }));
      }
      const chunks = [];
      r.on('data', (d) => chunks.push(d));
      r.on('end', () => resolve({ statusCode: r.statusCode, body: binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error('timeout')));
  });
}

async function withRetry(fn, retries) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function searchImage(query, opts = {}) {
  const {
    source = 'wikimedia', license = 'cc0,pdm,by,by-sa', size = 'medium',
    minSide = 600, pageSize = 12, timeout = 12000, retries = 1,
    fetchImpl = defaultFetch, userAgent = 'TaleemabadLP/1.0 (educational)',
  } = opts;

  const api = `${API}?q=${encodeURIComponent(query)}&source=${encodeURIComponent(source)}`
    + `&license=${encodeURIComponent(license)}&size=${encodeURIComponent(size)}`
    + `&mature=false&page_size=${pageSize}`;

  let data;
  try {
    const res = await withRetry(() => fetchImpl(api, { timeout, userAgent }), retries);
    data = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
  } catch (_) { return null; }

  for (const r of (data.results || [])) {
    if (!r.url) continue;
    if (!isAllowedLicense(r.license)) continue;
    const w = Number(r.width), h = Number(r.height);
    if (w && h && Math.min(w, h) < minSide) continue;
    let buf;
    try {
      const res = await withRetry(() => fetchImpl(r.url, { binary: true, timeout, userAgent }), retries);
      if (res.statusCode && res.statusCode !== 200) continue;
      buf = res.body;
    } catch (_) { continue; }
    if (!Buffer.isBuffer(buf) || buf.length < 4000 || buf.length > 2_200_000) continue;
    return {
      dataUri: `data:image/jpeg;base64,${buf.toString('base64')}`,
      title: (r.title || '').trim(),
      creator: (r.creator || 'unknown').trim(),
      license: (`CC ${r.license || ''} ${r.license_version || ''}`).trim(),
      source: r.source || source,
      sourceUrl: r.foreign_landing_url || r.url,
    };
  }
  return null;
}

module.exports = { searchImage, defaultFetch };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/openverse.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lp-render/images/openverse.js lp-render/test/openverse.test.js
git commit -m "feat(lp-render): Openverse client with injectable fetch + license/size gates"
```

---

### Task 4: Resolve enrichment (`resolveImages`)

**Files:**
- Create: `lp-render/images/resolve.js`
- Test: `lp-render/test/resolve.test.js`

**Interfaces:**
- Consumes: `hasIcon` from `../template/icons`; `searchImage` from `./openverse`; `cacheKey` from `./cache`.
- Produces: `async resolveImages(lesson, opts) → { lesson, report }`. Each `picture_cards` card gets a `_resolved = { mode:'photo'|'icon'|'none', dataUri?, iconName?, attribution? }` where `attribution = { title, creator, license, source, sourceUrl }`. `report` is an array of `{ query, kind, tried, used, reason }`. `opts`: `{ source, license, cache, searchImpl=searchImage, logger, ...openverseOpts }`. The input `lesson` is never mutated.

- [ ] **Step 1: Write the failing test**

```js
// lp-render/test/resolve.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveImages } = require('../images/resolve');
const { MemoryImageCache, cacheKey } = require('../images/cache');

// 'apple' and 'duck' are real library icons; 'zzz_nope' is not.
const photoRec = { dataUri: 'data:image/jpeg;base64,AAAA', title: 'T', creator: 'C', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' };
const lesson = (cards) => ({ meta: { title: 'x', locale: 'en' }, sections: [{ type: 'picture_cards', cards }] });
const resolved = (out) => out.lesson.sections[0].cards.map((c) => c._resolved);

test('kind:icon uses a library icon, or blank when none matches', async () => {
  const out = await resolveImages(lesson([{ query: 'apple', kind: 'icon' }, { query: 'zzz_nope', kind: 'icon' }]),
    { searchImpl: async () => { throw new Error('must not fetch'); } });
  assert.deepStrictEqual(resolved(out)[0], { mode: 'icon', iconName: 'apple' });
  assert.deepStrictEqual(resolved(out)[1], { mode: 'none' });
});

test('kind:auto prefers a library icon without fetching', async () => {
  let called = false;
  const out = await resolveImages(lesson([{ query: 'apple', kind: 'auto' }]),
    { searchImpl: async () => { called = true; return photoRec; } });
  assert.deepStrictEqual(resolved(out)[0], { mode: 'icon', iconName: 'apple' });
  assert.strictEqual(called, false);
});

test('kind:auto with no icon fetches a photo', async () => {
  const out = await resolveImages(lesson([{ query: 'zzz_nope', kind: 'auto' }]),
    { searchImpl: async () => photoRec });
  const r = resolved(out)[0];
  assert.strictEqual(r.mode, 'photo');
  assert.strictEqual(r.dataUri, photoRec.dataUri);
  assert.deepStrictEqual(r.attribution, { title: 'T', creator: 'C', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' });
});

test('kind:photo forces a photo even when an icon exists', async () => {
  const out = await resolveImages(lesson([{ query: 'apple', kind: 'photo' }]),
    { searchImpl: async () => photoRec });
  assert.strictEqual(resolved(out)[0].mode, 'photo');
});

test('kind:photo falls back to an icon when the fetch returns nothing', async () => {
  const out = await resolveImages(lesson([{ query: 'apple', kind: 'photo' }]),
    { searchImpl: async () => null });
  assert.deepStrictEqual(resolved(out)[0], { mode: 'icon', iconName: 'apple' });
});

test('kind:photo with no photo and no icon is blank', async () => {
  const out = await resolveImages(lesson([{ query: 'zzz_nope', kind: 'photo' }]),
    { searchImpl: async () => null });
  assert.deepStrictEqual(resolved(out)[0], { mode: 'none' });
});

test('a cache hit skips the network', async () => {
  const cache = new MemoryImageCache();
  await cache.set(cacheKey('wikimedia', 'cc0,pdm,by,by-sa', 'zzz_nope'), photoRec);
  let called = false;
  const out = await resolveImages(lesson([{ query: 'zzz_nope', kind: 'photo' }]),
    { cache, searchImpl: async () => { called = true; return null; } });
  assert.strictEqual(resolved(out)[0].mode, 'photo');
  assert.strictEqual(called, false);
});

test('never throws when the fetch throws (offline) and reports each card', async () => {
  const input = lesson([{ query: 'zzz_nope', kind: 'photo' }]);
  const out = await resolveImages(input, { searchImpl: async () => { throw new Error('offline'); } });
  assert.deepStrictEqual(resolved(out)[0], { mode: 'none' });
  assert.strictEqual(out.report.length, 1);
  assert.strictEqual(out.report[0].query, 'zzz_nope');
  assert.strictEqual(out.report[0].used, 'none');
  // input untouched
  assert.strictEqual('_resolved' in input.sections[0].cards[0], false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/resolve.test.js`
Expected: FAIL — `Cannot find module '../images/resolve'`.

- [ ] **Step 3: Write minimal implementation**

```js
// lp-render/images/resolve.js
'use strict';
const { hasIcon } = require('../template/icons');
const { searchImage } = require('./openverse');
const { cacheKey } = require('./cache');

async function tryPhoto(query, opts) {
  const { cache, source = 'wikimedia', license = 'cc0,pdm,by,by-sa', searchImpl = searchImage } = opts;
  const key = cacheKey(source, license, query);
  if (cache) { try { const hit = await cache.get(key); if (hit) return hit; } catch (_) { /* ignore */ } }
  let rec = null;
  try { rec = await searchImpl(query, opts); } catch (_) { rec = null; }
  if (rec && cache) { try { await cache.set(key, rec); } catch (_) { /* ignore */ } }
  return rec;
}

async function resolveCard(card, opts) {
  const kind = card.kind || 'auto';
  const iconName = card.icon || card.query;
  const canIcon = hasIcon(iconName);
  const tried = [];

  if (kind === 'icon') {
    tried.push('icon');
    return canIcon
      ? { r: { mode: 'icon', iconName }, tried, used: 'icon', reason: 'library icon' }
      : { r: { mode: 'none' }, tried, used: 'none', reason: 'no library icon (kind=icon)' };
  }
  if (kind === 'auto' && canIcon) {
    tried.push('icon');
    return { r: { mode: 'icon', iconName }, tried, used: 'icon', reason: 'auto → library icon' };
  }

  tried.push('photo');
  const photo = await tryPhoto(card.query, opts);
  if (photo) {
    return {
      r: { mode: 'photo', dataUri: photo.dataUri, attribution: {
        title: photo.title, creator: photo.creator, license: photo.license, source: photo.source, sourceUrl: photo.sourceUrl } },
      tried, used: 'photo', reason: 'openverse',
    };
  }
  if (canIcon) { tried.push('icon'); return { r: { mode: 'icon', iconName }, tried, used: 'icon', reason: 'photo failed → icon' }; }
  return { r: { mode: 'none' }, tried, used: 'none', reason: 'photo failed, no icon' };
}

async function resolveImages(lesson, opts = {}) {
  const out = JSON.parse(JSON.stringify(lesson));
  const report = [];
  for (const section of (out.sections || [])) {
    if (!section || section.type !== 'picture_cards' || !Array.isArray(section.cards)) continue;
    for (const card of section.cards) {
      const { r, tried, used, reason } = await resolveCard(card, opts);
      card._resolved = r;
      const entry = { query: card.query, kind: card.kind || 'auto', tried, used, reason };
      report.push(entry);
      if (typeof opts.logger === 'function') { try { opts.logger(entry); } catch (_) { /* ignore */ } }
    }
  }
  return { lesson: out, report };
}

module.exports = { resolveImages, resolveCard };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/resolve.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lp-render/images/resolve.js lp-render/test/resolve.test.js
git commit -m "feat(lp-render): resolveImages enrichment (icon/photo/blank chain + report)"
```

---

### Task 5: Schema support for `picture_cards`

**Files:**
- Modify: `lp-render/schema.js:3-6` (add type) and `lp-render/schema.js:28-32` (add card validation)
- Test: `lp-render/test/schema-picture-cards.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `validateLesson` accepts a `picture_cards` section and errors when its `cards` is missing/empty or a card lacks `query`. `SECTION_TYPES` includes `'picture_cards'`.

- [ ] **Step 1: Write the failing test**

```js
// lp-render/test/schema-picture-cards.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateLesson, SECTION_TYPES } = require('../schema');

const base = (section) => ({ meta: { title: 't', locale: 'en' }, sections: [section] });

test('picture_cards is a known section type', () => {
  assert.ok(SECTION_TYPES.includes('picture_cards'));
});

test('valid picture_cards passes', () => {
  const { ok } = validateLesson(base({ type: 'picture_cards', cards: [{ query: 'duck', kind: 'photo' }] }));
  assert.strictEqual(ok, true);
});

test('picture_cards with empty cards fails', () => {
  const { ok, errors } = validateLesson(base({ type: 'picture_cards', cards: [] }));
  assert.strictEqual(ok, false);
  assert.ok(errors.some((e) => /cards/.test(e)));
});

test('picture_cards card missing query fails', () => {
  const { ok, errors } = validateLesson(base({ type: 'picture_cards', cards: [{ kind: 'photo' }] }));
  assert.strictEqual(ok, false);
  assert.ok(errors.some((e) => /query/.test(e)));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/schema-picture-cards.test.js`
Expected: FAIL — `picture_cards` not in `SECTION_TYPES`; empty-cards case returns `ok:true`.

- [ ] **Step 3: Write minimal implementation**

In `lp-render/schema.js`, change the `SECTION_TYPES` array (lines 3-6) to include `picture_cards`:

```js
const SECTION_TYPES = [
  'objectives', 'materials', 'introduction', 'explore',
  'explanation', 'picture_equation', 'picture_cards', 'guided_practice', 'assessment', 'differentiation', 'generic',
];
```

Then replace the `sections.forEach` block (lines 28-32) with card-aware validation:

```js
    lesson.sections.forEach((s, i) => {
      if (!s || typeof s !== 'object' || !s.type) {
        errors.push(`sections[${i}].type is required`);
        return;
      }
      if (s.type === 'picture_cards') {
        if (!Array.isArray(s.cards) || s.cards.length === 0) {
          errors.push(`sections[${i}].cards must be a non-empty array`);
        } else {
          s.cards.forEach((c, j) => {
            if (!c || typeof c !== 'object' || !c.query) {
              errors.push(`sections[${i}].cards[${j}].query is required`);
            }
          });
        }
      }
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/schema-picture-cards.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lp-render/schema.js lp-render/test/schema-picture-cards.test.js
git commit -m "feat(lp-render): validate picture_cards section + cards"
```

---

### Task 6: `picture_cards` renderer (+ registration, accent, CSS)

**Files:**
- Create: `lp-render/template/sections/picture-cards.js`
- Modify: `lp-render/template/sections/index.js` (register renderer + `DEFAULT_TITLES`)
- Modify: `lp-render/template/tokens.js:16-27` (`SECTION_ACCENT['picture_cards']`)
- Modify: `lp-render/template/shell.js` (append CSS for `.pcards`/`.pcard` in the layout CSS block)
- Test: `lp-render/test/picture-cards.test.js`

**Interfaces:**
- Consumes: `esc` from `../shell`; `icon` from `../icons`; `sectionShell` from `./index`; a card's `_resolved` shape from Task 4.
- Produces: `module.exports = function pictureCards(section, ctx) → htmlString`. Renders a photo card (`<img>`), an icon card (inline SVG), and omits `none`/absent-`_resolved` cards.

- [ ] **Step 1: Write the failing test**

```js
// lp-render/test/picture-cards.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const pictureCards = require('../template/sections/picture-cards');
const { resolveLabels } = require('../template/labels');

const ctx = { locale: 'en', dir: 'ltr', labels: resolveLabels('en') };

test('renders a photo card with its image and label', () => {
  const html = pictureCards({ type: 'picture_cards', cards: [
    { query: 'duck', label: 'Duck', note: 'a bird', _resolved: { mode: 'photo', dataUri: 'data:image/jpeg;base64,AAAA', attribution: {} } },
  ] }, ctx);
  assert.match(html, /<img[^>]+src="data:image\/jpeg;base64,AAAA"/);
  assert.match(html, /Duck/);
});

test('renders an icon card as inline SVG', () => {
  const html = pictureCards({ type: 'picture_cards', cards: [
    { query: 'apple', label: 'Apple', _resolved: { mode: 'icon', iconName: 'apple' } },
  ] }, ctx);
  assert.match(html, /<svg/);
  assert.match(html, /Apple/);
});

test('omits none and unresolved cards', () => {
  const html = pictureCards({ type: 'picture_cards', cards: [
    { query: 'x', label: 'Gone', _resolved: { mode: 'none' } },
    { query: 'y', label: 'AlsoGone' },
  ] }, ctx);
  assert.doesNotMatch(html, /Gone/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/picture-cards.test.js`
Expected: FAIL — `Cannot find module '../template/sections/picture-cards'`.

- [ ] **Step 3: Write minimal implementation**

Create `lp-render/template/sections/picture-cards.js`:

```js
'use strict';
const { esc } = require('../shell');
const { icon } = require('../icons');
const { sectionShell } = require('./index');

function card(c) {
  const r = c && c._resolved;
  if (!r || r.mode === 'none') return '';
  const cap = `<div class="pc-cap"><div class="pc-lab">${esc(c.label || '')}</div>`
    + (c.note ? `<div class="pc-note">${esc(c.note)}</div>` : '') + '</div>';
  if (r.mode === 'photo') {
    return `<div class="pcard"><img src="${r.dataUri}" alt="${esc(c.label || '')}">${cap}</div>`;
  }
  if (r.mode === 'icon') {
    return `<div class="pcard icon"><div class="pc-ic">${icon(r.iconName, 56)}</div>${cap}</div>`;
  }
  return '';
}

module.exports = function pictureCards(section, ctx) {
  const cards = (section.cards || []).map(card).join('');
  return sectionShell(section, 'palette', `<div class="panel"><div class="pcards">${cards}</div></div>`, ctx);
};
```

In `lp-render/template/sections/index.js`, add to the `DEFAULT_TITLES` object (after the `picture_equation` entry):

```js
  picture_cards: 'Pictures',
```

and add to the `RENDERERS` object (after the `picture_equation` line):

```js
  picture_cards: require('./picture-cards'),
```

In `lp-render/template/tokens.js`, add to `SECTION_ACCENT` (after the `picture_equation` line):

```js
  picture_cards: '--sky',
```

In `lp-render/template/shell.js`, find the layout CSS string and append these rules (inside the same backtick CSS block, before its closing backtick):

```css
.pcards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.pcard{background:#fff;border:2px solid var(--sky-bd);border-radius:16px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.05)}
.pcard img{width:100%;height:140px;object-fit:cover;display:block}
.pcard.icon{border-color:var(--sun-bd)}
.pcard .pc-ic{display:flex;justify-content:center;align-items:center;height:140px;background:var(--sun-soft)}
.pc-cap{padding:9px 12px;text-align:center}
.pc-lab{font-size:19px;font-weight:800;color:var(--ink)}
.pc-note{font-size:12px;color:var(--ink-soft);font-weight:700;margin-top:2px}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/picture-cards.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/sections/picture-cards.js lp-render/template/sections/index.js lp-render/template/tokens.js lp-render/template/shell.js lp-render/test/picture-cards.test.js
git commit -m "feat(lp-render): picture_cards renderer (photo/icon cards)"
```

---

### Task 7: Attribution footer in `build.js` (+ locale label)

**Files:**
- Modify: `lp-render/template/labels.js` (add `photoCredits` to each locale)
- Modify: `lp-render/template/build.js` (collect photo attributions, append a credits footer)
- Test: `lp-render/test/attribution.test.js`

**Interfaces:**
- Consumes: `_resolved.attribution` from Task 4; `buildLessonPlanHtml` from `build.js`.
- Produces: `buildLessonPlanHtml` appends a `<div class="credits">…</div>` footer listing photo credits when any resolved photo carries attribution, and nothing when there are none. Adds `labels.photoCredits`.

- [ ] **Step 1: Write the failing test**

```js
// lp-render/test/attribution.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildLessonPlanHtml } = require('../template/build');

const withPhoto = {
  meta: { title: 'x', locale: 'en' },
  sections: [{ type: 'picture_cards', cards: [
    { query: 'duck', label: 'Duck', _resolved: { mode: 'photo', dataUri: 'data:image/jpeg;base64,AA',
      attribution: { title: 'A Duck', creator: 'Jo', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' } } },
  ] }],
};

test('renders a credits footer when photos have attribution', () => {
  const html = buildLessonPlanHtml(withPhoto, { locale: 'en' });
  assert.match(html, /Photo credits/);
  assert.match(html, /A Duck/);
  assert.match(html, /Jo/);
  assert.match(html, /CC by 2\.0/);
});

test('no credits footer when there are no photos', () => {
  const noPhoto = { meta: { title: 'x', locale: 'en' }, sections: [{ type: 'objectives', items: [{ text: 'a' }] }] };
  const html = buildLessonPlanHtml(noPhoto, { locale: 'en' });
  assert.doesNotMatch(html, /Photo credits/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/attribution.test.js`
Expected: FAIL — no "Photo credits" text in output.

- [ ] **Step 3: Write minimal implementation**

In `lp-render/template/labels.js`, add a `photoCredits` key to each locale object (alongside `homework`):
- `en`: `photoCredits: 'Photo credits',`
- `ur`: `photoCredits: 'تصاویر کے حوالہ جات',`
- `sd`: `photoCredits: 'تصويرن جا حوالا',`
- `ar`: `photoCredits: 'حقوق الصور',`

In `lp-render/template/build.js`, add a collector and append the footer. Replace the `buildLessonPlanHtml` function body's `bodyHtml` line and shell call with:

```js
function collectCredits(lesson) {
  const out = [];
  for (const s of (lesson.sections || [])) {
    if (!s || s.type !== 'picture_cards' || !Array.isArray(s.cards)) continue;
    for (const c of s.cards) {
      const a = c && c._resolved && c._resolved.mode === 'photo' && c._resolved.attribution;
      if (a) out.push(a);
    }
  }
  return out;
}

function creditsFooter(lesson, labels) {
  const credits = collectCredits(lesson);
  if (!credits.length) return '';
  const items = credits.map((a) =>
    `${esc(a.title || '')} — ${esc(a.creator || 'unknown')} — ${esc(a.license || '')} (${esc(a.source || '')})`
  ).join('  ·  ');
  return `<div class="credits" style="font-size:10px;color:#9aa3b5;line-height:1.6;`
    + `border-top:1px solid #e5e9f0;padding-top:10px;margin-top:18px">`
    + `<b>${esc(labels.photoCredits)}:</b> ${items}</div>`;
}
```

Then, inside `buildLessonPlanHtml`, change the body assembly:

```js
  const sectionsHtml = (lesson.sections || []).map((s) => getRenderer(s.type)(s, ctx)).join('');
  const bodyHtml = sectionsHtml + creditsFooter(lesson, labels);
  return buildShell({ headerHtml, bodyHtml, locale, title: meta.title || 'Lesson Plan' });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/attribution.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lp-render/template/labels.js lp-render/template/build.js lp-render/test/attribution.test.js
git commit -m "feat(lp-render): localized photo-credits footer"
```

---

### Task 8: Export `resolveImages` from the module entry

**Files:**
- Modify: `lp-render/index.js`
- Test: `lp-render/test/index-exports.test.js`

**Interfaces:**
- Consumes: `resolveImages` from `./images/resolve`.
- Produces: `require('lp-render').resolveImages` is a function; end-to-end `resolveImages` → `buildLessonPlanHtml` embeds resolved photos.

- [ ] **Step 1: Write the failing test**

```js
// lp-render/test/index-exports.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const lp = require('../index');

test('exports resolveImages', () => {
  assert.strictEqual(typeof lp.resolveImages, 'function');
});

test('resolveImages output renders an embedded photo in the HTML', async () => {
  const lesson = { meta: { title: 't', locale: 'en' }, sections: [
    { type: 'picture_cards', cards: [{ query: 'zzz_nope', kind: 'photo', label: 'Thing' }] },
  ] };
  const { lesson: enriched } = await lp.resolveImages(lesson, {
    searchImpl: async () => ({ dataUri: 'data:image/jpeg;base64,ZZ', title: 'T', creator: 'C', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' }),
  });
  const html = lp.buildLessonPlanHtml(enriched, { locale: 'en' });
  assert.match(html, /data:image\/jpeg;base64,ZZ/);
  assert.match(html, /Photo credits/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/index-exports.test.js`
Expected: FAIL — `lp.resolveImages` is `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `lp-render/index.js`, add the require and the export:

```js
const { resolveImages } = require('./images/resolve');
```

and extend `module.exports`:

```js
module.exports = { renderLessonPlanPdf, resolveImages, buildLessonPlanHtml, validateLesson, htmlToPdf, closeBrowser };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/index-exports.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lp-render/index.js lp-render/test/index-exports.test.js
git commit -m "feat(lp-render): export resolveImages from module entry"
```

---

### Task 9: Fix `pageMode:'fit'` clipping tall lessons

**Files:**
- Modify: `lp-render/render/html-to-pdf.js:57-66` (the `fit` branch)
- Test: `lp-render/test/fit-tall.test.js`

**Interfaces:**
- Consumes: `htmlToPdf` from `../render/html-to-pdf`; `buildShell` from `../template/shell`.
- Produces: in `fit` mode, a **single** page sized to the content (no A4 pagination, no clipping), via an injected content-sized `@page` rule + `preferCSSPageSize: true`.

- [ ] **Step 1: Write the failing test**

```js
// lp-render/test/fit-tall.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { htmlToPdf, closeBrowser } = require('../render/html-to-pdf');
const { buildShell } = require('../template/shell');

function chromiumAvailable() {
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (fs.existsSync(p)) return true;
  }
  try { require('puppeteer').executablePath(); return true; } catch (_) { return false; }
}

test('fit mode renders content taller than A4 as a single un-clipped page', { skip: !chromiumAvailable() }, async () => {
  // ~2000px of content — well beyond one A4 page (842pt ≈ 1123px).
  const bodyHtml = Array.from({ length: 20 }, (_, i) =>
    `<section class="section"><div class="panel" style="height:90px">Block ${i}</div></section>`).join('');
  const html = buildShell({ headerHtml: '<div class="lp-header"><h1>Tall</h1></div>', bodyHtml, locale: 'en', title: 'Tall' });
  const buf = await htmlToPdf(html, { pageMode: 'fit' });
  await closeBrowser();
  const s = buf.toString('latin1');
  const pageObjs = (s.match(/\/Type\s*\/Page(?![s])/g) || []).length;
  assert.strictEqual(pageObjs, 1, 'should be exactly one page');
  const mb = s.match(/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/);
  assert.ok(mb && Number(mb[2]) > 842, `page height should exceed A4 (got ${mb && mb[2]})`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/fit-tall.test.js`
Expected: FAIL — with the current code the tall content paginates at A4 and `pageObjs` is `> 1` (the test asserts exactly 1). (If Chromium is unavailable the test skips — arrange to run it where Chromium exists.)

- [ ] **Step 3: Write minimal implementation**

In `lp-render/render/html-to-pdf.js`, replace the `fit` branch (the block starting `if (pageMode === 'fit') { const height = ...`, lines ~57-66) with:

```js
    if (pageMode === 'fit') {
      const height = Math.ceil(await page.evaluate(() => document.documentElement.scrollHeight));
      // Override the shell's `@page{size:A4}` with a single content-sized page so
      // Chromium does NOT paginate at A4 boundaries (which clipped tall lessons).
      await page.addStyleTag({ content: `@page{size:${FIT_WIDTH_PX}px ${height}px;margin:0}` });
      return await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        ...pdfOptions,
      });
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/fit-tall.test.js`
Expected: PASS (1 test) — one page, height > 842pt.

- [ ] **Step 5: Run the full suite to confirm no regression**

Run: `node --test lp-render/test/`
Expected: all tests pass (existing 45+ plus the new ones).

- [ ] **Step 6: Commit**

```bash
git add lp-render/render/html-to-pdf.js lp-render/test/fit-tall.test.js
git commit -m "fix(lp-render): fit mode no longer clips lessons taller than A4"
```

---

### Task 10: Demo fixture, README, and opt-in live smoke test

**Files:**
- Create: `lp-render/fixtures/lesson-picture-cards.en.json`
- Create: `lp-render/test/live-openverse.test.js` (opt-in)
- Modify: `lp-render/README.md`
- Test: `lp-render/test/fixture-picture-cards.test.js`

**Interfaces:**
- Consumes: `validateLesson`, `resolveImages`, `buildLessonPlanHtml` from the module.
- Produces: a committed sample lesson with a `picture_cards` section; docs for `resolveImages` + `picture_cards`; a network test that only runs under `LP_LIVE_IMAGE_TEST=1`.

- [ ] **Step 1: Write the failing test**

```js
// lp-render/test/fixture-picture-cards.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateLesson } = require('../schema');
const { resolveImages } = require('../images/resolve');
const { buildLessonPlanHtml } = require('../template/build');
const lesson = require('../fixtures/lesson-picture-cards.en.json');

test('sample picture_cards fixture is valid', () => {
  assert.strictEqual(validateLesson(lesson).ok, true);
});

test('sample fixture resolves and renders (icons offline, photos stubbed)', async () => {
  const { lesson: enriched, report } = await resolveImages(lesson, { searchImpl: async () =>
    ({ dataUri: 'data:image/jpeg;base64,QQ', title: 'T', creator: 'C', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' }) });
  assert.ok(report.length >= 1);
  const html = buildLessonPlanHtml(enriched, { locale: 'en' });
  assert.match(html, /<svg|data:image\/jpeg;base64,/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lp-render/test/fixture-picture-cards.test.js`
Expected: FAIL — `Cannot find module '../fixtures/lesson-picture-cards.en.json'`.

- [ ] **Step 3: Create the fixture**

`lp-render/fixtures/lesson-picture-cards.en.json`:

```json
{
  "meta": { "id": "pc-001", "subject": "Science", "grade": "One", "locale": "en",
    "title": "Things That Start With B", "subtitle": "Real photos + icons",
    "durationMin": 30, "classSize": 24, "type": "Vocabulary" },
  "sections": [
    { "type": "objectives", "time": "2 min",
      "items": [ { "text": "Students will name common objects and living things.", "tag": "Understand" } ] },
    { "type": "picture_cards", "title": "Look and name", "time": "10 min",
      "cards": [
        { "query": "apple", "kind": "auto", "label": "Apple" },
        { "query": "duck", "kind": "photo", "label": "Duck", "note": "a farm bird" },
        { "query": "cow", "kind": "photo", "label": "Cow", "note": "gives us milk" },
        { "query": "banana", "kind": "auto", "label": "Banana" }
      ] }
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lp-render/test/fixture-picture-cards.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the opt-in live smoke test**

`lp-render/test/live-openverse.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { searchImage } = require('../images/openverse');

// Opt-in only: hits the real Openverse API. Enable with LP_LIVE_IMAGE_TEST=1.
// Uses source=flickr because Wikimedia Commons is unreachable in the dev sandbox.
test('live: fetches a real CC photo from Openverse', { skip: process.env.LP_LIVE_IMAGE_TEST !== '1' }, async () => {
  const rec = await searchImage('cow farm', { source: 'flickr' });
  assert.ok(rec && rec.dataUri.startsWith('data:image/jpeg;base64,'));
  assert.ok(rec.license && rec.creator);
});
```

- [ ] **Step 6: Update the README**

In `lp-render/README.md`, add a section documenting the image layer. Insert after the "## API" block:

````markdown
## Dynamic images (icons + Openverse photos)

Resolve a lesson's image hints into inline SVG icons (library) or real Creative-Commons
photos (Openverse) **before** rendering — a pre-render, network-only step. The renderer
stays network-free.

```js
const { resolveImages, renderLessonPlanPdf } = require('./lp-render');

const { lesson, report } = await resolveImages(contentJson, { source: 'wikimedia', cache: r2Cache });
const pdf = await renderLessonPlanPdf(lesson);   // Buffer — no network
```

A `picture_cards` section carries the hints; each card resolves to an icon, a photo, or
nothing (never an irrelevant filler):

```jsonc
{ "type": "picture_cards", "title": "Look and name",
  "cards": [
    { "query": "apple", "kind": "auto",  "label": "Apple" },   // library icon if it exists, else photo, else blank
    { "query": "duck",  "kind": "photo", "label": "Duck" },    // force a real photo (falls back to icon → blank)
    { "query": "sun",   "kind": "icon",  "label": "Sun" }      // library icon only, else blank
  ] }
```

- **Source:** default `source: 'wikimedia'` (production). In this sandbox Wikimedia is
  DNS-blocked, so dev/tests pass `source: 'flickr'` (same code path).
- **Licensing:** only PD/CC0/CC-BY/CC-BY-SA accepted; attribution is embedded as a credits
  footer and kept per-image for audit.
- **Cache:** pass any `{ get, set }` cache via `opts.cache` (default: none; a filesystem and
  in-memory cache ship in `images/cache.js`; rumi injects an R2-backed one).
- **Offline-safe:** `resolveImages` never throws — a failed photo degrades to an icon, then
  to blank. See `docs/image-sourcing-guidelines.md`.
````

- [ ] **Step 7: Run the full suite**

Run: `node --test lp-render/test/`
Expected: all pass. Optionally verify live once: `LP_LIVE_IMAGE_TEST=1 node --test lp-render/test/live-openverse.test.js`.

- [ ] **Step 8: Commit**

```bash
git add lp-render/fixtures/lesson-picture-cards.en.json lp-render/test/live-openverse.test.js lp-render/test/fixture-picture-cards.test.js lp-render/README.md
git commit -m "docs(lp-render): picture_cards fixture, README, opt-in live test"
```

---

## Self-Review

**Spec coverage:**
- §Data flow (resolveImages → render) → Tasks 4, 8, 9. ✅
- §Schema `picture_cards` → Task 5 (+ fixture Task 10). ✅
- §Enrichment rules (icon/photo/auto/fallback/report) → Task 4. ✅
- §Openverse client (source, injectable fetch, license gate, min-side, byte checks) → Tasks 1, 3. ✅
- §Cache (interface + fs default) → Task 2 (+ used in Task 4). ✅
- §Renderer + attribution footer → Tasks 6, 7. ✅
- §Offline/fallback + logging → Task 4 (never-throws test) + Task 10 opt-in live test. ✅
- §fit-mode PDF fix → Task 9. ✅
- §rumi integration seam → documented in Task 10 README. ✅
- §Guardrails (no AI, relevance-or-blank, license-only) → Global Constraints + Tasks 1/3/4. ✅

**Placeholder scan:** No TBD/TODO; every code step contains real code. ✅

**Type consistency:** `record` shape `{ dataUri, title, creator, license, source, sourceUrl }` is produced by Task 3 and consumed identically in Task 4 (`attribution`) and rendered in Tasks 6/7. `_resolved` shape `{ mode, dataUri?, iconName?, attribution? }` is produced by Task 4 and consumed in Task 6. `fetchImpl(url,{binary,timeout,userAgent})→{statusCode,body}` consistent between Task 3 impl and tests. `cacheKey(source,license,query)` consistent Tasks 2/4. ✅
