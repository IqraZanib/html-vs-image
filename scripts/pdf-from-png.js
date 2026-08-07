#!/usr/bin/env node
'use strict';
// Pixel-perfect paginated PDF. The on-screen PNG already looks perfect, so instead of a
// second HTML→PDF pass (which can drift) we screenshot the page at 2x and slice THAT
// image into A4 pages — cutting ONLY at section boundaries so no section is ever split
// across a page. scripts/compose_pdf.py (pillow + img2pdf) does the slicing, the
// page-number band, and the lossless A4 assembly.
//
//   node scripts/pdf-from-png.js <content.json> <out.pdf>
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('../node_modules/playwright-core');
const { renderLessonImage } = require('../lp-render/pipeline');

const SCALE = 2;          // device pixel ratio → crisp text
const CSS_WIDTH = 794;    // A4 width @96dpi (matches the preview screenshot)

function chromePath() {
  for (const c of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) if (fs.existsSync(c)) return c;
  return undefined;
}
function apiKey() {
  try { const m = fs.readFileSync(path.resolve(__dirname, '../assets/generated/.env-api'), 'utf8').match(/KIE_API_KEY\s*=\s*([^\s#]+)/); return m ? m[1].trim() : process.env.KIE_API_KEY; }
  catch (_) { return process.env.KIE_API_KEY; }
}

(async () => {
  const [input, out] = process.argv.slice(2);
  if (!input || !out) { console.error('Usage: node scripts/pdf-from-png.js <content.json> <out.pdf>'); process.exit(2); }
  const content = JSON.parse(fs.readFileSync(input, 'utf8'));
  const { html } = await renderLessonImage(content, { apiKey: apiKey(), log: () => {}, pdf: false });

  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'] });
  const page = await browser.newPage({ deviceScaleFactor: SCALE });
  await page.setViewportSize({ width: CSS_WIDTH, height: 1123 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.ready; });

  // Safe cut points = the BOTTOM of the header and of every top-level section (+ footer).
  // A page may only end at one of these, so a section never splits across pages.
  const geom = await page.evaluate(() => {
    const y = (el, edge) => el.getBoundingClientRect()[edge] + window.scrollY;
    const cuts = [];
    const header = document.querySelector('.lp-header');
    if (header) cuts.push(y(header, 'bottom'));
    document.querySelectorAll('.body > .section').forEach((el) => cuts.push(y(el, 'bottom')));
    const footer = document.querySelector('.lp-footer');
    if (footer) { cuts.push(y(footer, 'top')); cuts.push(y(footer, 'bottom')); }
    return { cuts, height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth };
  });

  const shotPath = out.replace(/\.pdf$/i, '') + '.__full.png';
  await page.screenshot({ path: shotPath, fullPage: true });
  await browser.close();

  const metaPath = out.replace(/\.pdf$/i, '') + '.__geom.json';
  fs.writeFileSync(metaPath, JSON.stringify({ scale: SCALE, cssWidth: CSS_WIDTH, ...geom }));

  // Hand off to the Python composer (pillow + img2pdf).
  execFileSync('python3', [path.resolve(__dirname, 'compose_pdf.py'), shotPath, metaPath, out], { stdio: 'inherit' });
  fs.rmSync(shotPath, { force: true }); fs.rmSync(metaPath, { force: true });
  console.log(`\n  ✓ pixel-perfect PDF → ${out}`);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
