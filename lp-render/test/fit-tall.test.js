'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { htmlToPdf, closeBrowser } = require('../render/html-to-pdf');
const { buildShell } = require('../template/shell');

function chromiumAvailable() {
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (fs.existsSync(p)) return true;
  }
  try { require('puppeteer').executablePath(); return true; } catch (_) { return false; }
}
function pdftoppmAvailable() {
  try { execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' }); return true; } catch (_) { return false; }
}
// Parse a binary P6 PPM into { w, h, data } where data is the RGB byte buffer.
function parsePPM(buf) {
  let p = 0;
  const tok = () => {
    while ([32, 10, 13, 9].includes(buf[p])) p++;
    const s = p;
    while (![32, 10, 13, 9].includes(buf[p])) p++;
    return buf.slice(s, p).toString();
  };
  const magic = tok(); const w = +tok(); const h = +tok(); tok(); p++; // maxval + single whitespace
  assert.strictEqual(magic, 'P6', 'expected a P6 PPM from pdftoppm');
  return { w, h, data: buf.slice(p) };
}

const skip = !(chromiumAvailable() && pdftoppmAvailable());

test('fit mode paints content taller than A4 all the way to the bottom (no clipping)', { skip }, async () => {
  // ~2.5x A4 tall: 26 stacked sections. Pre-fix, the fit branch clipped after ~1 A4.
  const bodyHtml = Array.from({ length: 26 }, (_, i) =>
    `<section class="section"><div class="panel" style="height:90px">Block ${i}</div></section>`).join('');
  const html = buildShell({ headerHtml: '<div class="lp-header"><h1>Tall</h1></div>', bodyHtml, locale: 'en', title: 'Tall' });
  const buf = await htmlToPdf(html, { pageMode: 'fit' });
  await closeBrowser();

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fittall-'));
  try {
    const pdfPath = path.join(dir, 'out.pdf');
    fs.writeFileSync(pdfPath, buf);
    // Rasterize the single page to one PPM at low DPI.
    execFileSync('pdftoppm', ['-r', '24', '-singlefile', pdfPath, path.join(dir, 'page')]);
    const { w, h, data } = parsePPM(fs.readFileSync(path.join(dir, 'page.ppm')));

    // The page must be a single tall page — well past one A4 (A4 ≈ 281px tall at r=24).
    assert.ok(h > 500, `expected a tall single page, got ${h}px at r=24`);

    // The bottom 15% band must contain rendered ink (the last blocks). Pre-fix it is blank.
    const startRow = Math.floor(h * 0.85);
    let dark = 0;
    for (let y = startRow; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 3;
        if (data[i] < 160 && data[i + 1] < 160 && data[i + 2] < 160) dark++;
      }
    }
    assert.ok(dark > 5, `bottom of the page is blank (dark=${dark}) — content was clipped (fit-mode A4 pagination bug)`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
