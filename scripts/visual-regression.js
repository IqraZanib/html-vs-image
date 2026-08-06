#!/usr/bin/env node
'use strict';
// Visual regression analysis for lesson-plan renders.
//
// Renders every fixture in tests/visual/fixtures/ (deterministically — images come
// from the shared store and the character cast is cached, so no model calls) and
// compares each PNG against a committed golden, pixel-for-pixel, producing a match
// score. The gate: if every fixture matches its golden by >= 95%, the layout is
// stable and it's safe to ask a human for feedback; otherwise a regression slipped
// in and must be fixed first.
//
//   node scripts/visual-regression.js            # compare against goldens, print scores
//   node scripts/visual-regression.js --update   # (re)write the goldens from current renders
const fs = require('node:fs');
const path = require('node:path');
const { renderLessonImage } = require('../lp-render/pipeline');
const { chromium } = require('../node_modules/playwright-core');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'tests/visual');
const FIX = path.join(DIR, 'fixtures');
const GOLD = path.join(DIR, 'golden');
const CUR = path.join(DIR, 'current');
const THRESHOLD = 95; // percent
const TOL = 12;        // per-channel tolerance (antialiasing noise)

function chromePath() {
  for (const c of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) if (fs.existsSync(c)) return c;
  try { return require('../node_modules/puppeteer').executablePath(); } catch (_) { return undefined; }
}

// Pixel-match two PNG buffers in a headless page via canvas; returns % matching.
async function pixelMatch(browser, aBuf, bBuf) {
  const page = await browser.newPage();
  try {
    const a = 'data:image/png;base64,' + aBuf.toString('base64');
    const b = 'data:image/png;base64,' + bBuf.toString('base64');
    return await page.evaluate((args) => new Promise((resolve) => {
      const srcA = args.a; const srcB = args.b; const tol = args.tol;
      const ia = new Image(); const ib = new Image(); let loaded = 0;
      const done = () => {
        if (++loaded < 2) return;
        const w = Math.max(ia.width, ib.width); const h = Math.max(ia.height, ib.height);
        const mk = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
        const da = mk(ia); const db = mk(ib); const n = da.length / 4; let diff = 0;
        for (let i = 0; i < da.length; i += 4) {
          if (Math.abs(da[i] - db[i]) > tol || Math.abs(da[i + 1] - db[i + 1]) > tol || Math.abs(da[i + 2] - db[i + 2]) > tol || Math.abs(da[i + 3] - db[i + 3]) > tol) diff++;
        }
        resolve(100 * (1 - diff / n));
      };
      ia.onload = done; ib.onload = done; ia.onerror = () => resolve(0); ib.onerror = () => resolve(0);
      ia.src = srcA; ib.src = srcB;
    }), { a, b, tol: TOL });
  } finally { await page.close(); }
}

(async () => {
  const update = process.argv.includes('--update');
  fs.mkdirSync(GOLD, { recursive: true }); fs.mkdirSync(CUR, { recursive: true });
  const fixtures = fs.readdirSync(FIX).filter((f) => f.endsWith('.json')).sort();
  if (!fixtures.length) { console.error('No fixtures in tests/visual/fixtures/'); process.exit(2); }

  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const rows = [];
  for (const f of fixtures) {
    const name = f.replace(/\.json$/, '');
    const content = JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
    let png;
    try { ({ png } = await renderLessonImage(content, { log: () => {}, pdf: false })); }
    catch (e) { rows.push({ name, score: 0, note: 'render failed: ' + e.message }); continue; }
    fs.writeFileSync(path.join(CUR, `${name}.png`), png);
    if (update) { fs.writeFileSync(path.join(GOLD, `${name}.png`), png); rows.push({ name, score: 100, note: 'golden written' }); continue; }
    const goldFile = path.join(GOLD, `${name}.png`);
    if (!fs.existsSync(goldFile)) { rows.push({ name, score: 0, note: 'no golden (run --update)' }); continue; }
    const score = await pixelMatch(browser, fs.readFileSync(goldFile), png);
    rows.push({ name, score, note: score >= THRESHOLD ? 'ok' : 'REGRESSION' });
  }
  await browser.close();

  console.log(`\nVisual regression — ${update ? 'updated goldens' : 'vs golden'} (threshold ${THRESHOLD}%)\n`);
  for (const r of rows) console.log(`  ${r.score.toFixed(2).padStart(6)}%  ${r.name.padEnd(20)} ${r.note}`);
  const worst = Math.min(...rows.map((r) => r.score));
  if (update) { console.log('\nGoldens updated.'); return; }
  if (worst >= THRESHOLD) console.log(`\n✅ PASS — all fixtures ≥ ${THRESHOLD}% (worst ${worst.toFixed(2)}%). Stable enough to ask for feedback.`);
  else { console.log(`\n❌ FAIL — a regression is present (worst ${worst.toFixed(2)}%). Fix before asking for feedback.`); process.exit(1); }
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
