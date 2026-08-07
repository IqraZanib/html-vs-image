'use strict';
// Pixel-perfect paginated PDF: screenshot the rendered page at 2× (that's the "perfect"
// preview) and slice THAT image into A4 pages, cutting ONLY at section / list-item
// boundaries so nothing is split mid-item, with a "current / total" page-number band.
// Assembly is done by scripts/compose_pdf.py (Python: pillow + img2pdf).
//
// Used by the pipeline as the default deliverable PDF (RULES R30); throws if Chromium
// or the Python composer/libs are unavailable so the caller can fall back to the
// Chromium vector PDF.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright-core');

const SCALE = 2;        // device pixel ratio → crisp text
const CSS_WIDTH = 794;  // A4 width @96dpi (matches the preview screenshot)
const COMPOSER = path.resolve(__dirname, '../../scripts/compose_pdf.py');

function chromePath() {
  for (const c of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) if (fs.existsSync(c)) return c;
  try { const p = require('puppeteer').executablePath(); if (p && fs.existsSync(p)) return p; } catch (_) { /* fine */ }
  return undefined;
}

async function htmlToPixelPdf(html) {
  if (!fs.existsSync(COMPOSER)) throw new Error('compose_pdf.py not found');
  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'] });
  let shot; let geom;
  try {
    const page = await browser.newPage({ deviceScaleFactor: SCALE });
    await page.setViewportSize({ width: CSS_WIDTH, height: 1123 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; });
    // Page-break candidates: header/section bottoms + gaps between list items (so a long
    // list fills the page and continues overleaf, never cut through an item).
    geom = await page.evaluate(() => {
      const y = (el, edge) => el.getBoundingClientRect()[edge] + window.scrollY;
      const cuts = [];
      const header = document.querySelector('.lp-header');
      if (header) cuts.push(y(header, 'bottom'));
      document.querySelectorAll('.body > .section').forEach((sec) => {
        cuts.push(y(sec, 'bottom'));
        sec.querySelectorAll('.d-bullets > li, .d-steps > .d-step, .d-rubric > .rrow').forEach((item) => cuts.push(y(item, 'bottom')));
      });
      const footer = document.querySelector('.lp-footer');
      if (footer) { cuts.push(y(footer, 'top')); cuts.push(y(footer, 'bottom')); }
      return { cuts, height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth };
    });
    shot = await page.screenshot({ fullPage: true });
  } finally { await browser.close(); }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lppdf-'));
  const png = path.join(dir, 'full.png'); const gj = path.join(dir, 'geom.json'); const out = path.join(dir, 'out.pdf');
  fs.writeFileSync(png, shot);
  fs.writeFileSync(gj, JSON.stringify({ scale: SCALE, cssWidth: CSS_WIDTH, ...geom }));
  try {
    execFileSync('python3', [COMPOSER, png, gj, out], { stdio: ['ignore', 'ignore', 'pipe'] });
    return fs.readFileSync(out);
  } catch (e) {
    const detail = e.stderr ? e.stderr.toString().trim().split('\n').pop() : e.message;
    throw new Error(`PDF composer failed (need python3 + pillow + img2pdf): ${detail}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

module.exports = { htmlToPixelPdf };
