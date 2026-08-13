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

async function htmlToPixelPdf(html, opts = {}) {
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
        // A card that carries a figure (in-panel illustration or character) must never
        // be cut THROUGH the figure: inner boundaries are legal only BELOW the
        // figure's bottom edge. Cards without figures offer all inner boundaries.
        const fig = sec.querySelector('.d-inline-img, .char-fig');
        const figBottom = fig ? y(fig, 'bottom') : -Infinity;
        sec.querySelectorAll(
          '.d-bullets > li, .d-steps > .d-step, .d-rubric > .rrow, .d-imgrow, .d-qa, ' +
          '.d-math > .d-mrow, .d-fields, .d-note, .d-text, .d-chips, .d-summary .srow'
        ).forEach((item) => { const b = y(item, 'bottom'); if (b > figBottom + 6) cuts.push(b); });
      });
      const footer = document.querySelector('.lp-footer');
      if (footer) { cuts.push(y(footer, 'top')); cuts.push(y(footer, 'bottom')); }
      return { cuts, height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth,
        bg: getComputedStyle(document.body).backgroundColor || '#ffffff' };
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
    // Python composer unavailable (no pillow/img2pdf on this machine) — compose the
    // same slices with Chromium instead. Additive fallback: machines with the Python
    // libs keep the exact path above; only its failure reaches here.
    fs.rmSync(dir, { recursive: true, force: true });
    return composeWithChromium(shot, geom, opts);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// Node/Chromium composer: same contract as compose_pdf.py — slice the 2× screenshot
// into A4 pages cutting only at the supplied boundaries, page number on every page,
// top margin band, pages filled (a long section continues overleaf), no blank tail.
async function composeWithChromium(shotBuf, geom, opts = {}) {
  const PAGE_H = 1123; const TOP = 28; const BOT = 12;
  const usable = PAGE_H - TOP - BOT;
  const height = Math.ceil(geom.height);
  const cuts = [...new Set((geom.cuts || []).map((c) => Math.round(c)))].sort((a, b) => a - b)
    .filter((c) => c > 0 && c <= height + 1);
  const pages = [];
  let start = 0;
  while (start < height - 1) {
    const limit = start + usable;
    const within = cuts.filter((c) => c > start + 40 && c <= limit);
    let end = within.length ? within[within.length - 1] : Math.min(limit, height);
    if (height - end < 48) end = height; // absorb trailing padding — no phantom page
    pages.push([start, Math.min(end, height)]);
    start = end;
  }
  const b64 = shotBuf.toString('base64');
  // Page-number chrome is pack-driven: 'ar-bottom' prints the pilot-style
  // «الصفحة ن من م» at the bottom start edge; default keeps the classic top num.
  const arDigits = (v) => String(v).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
  const numFor = (i, n) => opts.pageStyle === 'ar-bottom'
    ? `<div class="num ar" dir="rtl">الصفحة ${arDigits(i + 1)} من ${arDigits(n)}</div>`
    : `<div class="num">${i + 1} / ${n}</div>`;
  const divs = pages.map(([s, e], i) =>
    `<div class="pg">${numFor(i, pages.length)}`
    + `<div class="clip" style="height:${e - s}px"><img src="data:image/png;base64,${b64}" style="top:${-s}px"></div></div>`).join('');
  const html = `<!doctype html><html><head><style>
  @page{size:794px 1123px;margin:0}
  html,body{margin:0;padding:0}
  .pg{width:794px;height:${PAGE_H - 2}px;box-sizing:border-box;position:relative;overflow:hidden;page-break-after:always;background:${geom.bg || '#fff'}}
  .pg:last-child{page-break-after:auto}
  .num{position:absolute;top:9px;inset-inline-end:16px;font:700 11px system-ui,sans-serif;color:#8a8f98;z-index:2}
  .num.ar{top:auto;bottom:11px;inset-inline-end:auto;left:22px;font:700 11.5px 'Noto Naskh Arabic',system-ui,sans-serif;color:#182448}
  .clip{position:relative;overflow:hidden;margin-top:${TOP}px;width:794px}
  .clip img{position:absolute;left:0;width:794px}
  </style></head><body>${divs}</body></html>`;
  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    return await page.pdf({ width: '794px', height: `${PAGE_H}px`, margin: { top: 0, bottom: 0, left: 0, right: 0 }, printBackground: true });
  } finally { await browser.close(); }
}

module.exports = { htmlToPixelPdf };
