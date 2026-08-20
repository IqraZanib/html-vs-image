'use strict';
// LAYOUT RULE: a status icon must never sit on top of instructional text.
//
// The ✗/✓ badges on both misconception boards used to be positioned absolutely over
// the card, which hid the first word of an Arabic caption ("المكان يميز" rendered as
// "كان يميز"). They now occupy their own slot in the layout. This test measures the
// real boxes in a browser and fails if any badge intersects any text, so the rule
// survives future theme rounds instead of relying on someone spotting it in a PDF.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { THEME_CSS } = require('../decorative/theme');

function chromePath() {
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// A 1x1 transparent PNG stands in for the illustration: this test is about geometry.
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

function boardHtml(regionCss) {
  // Both board shapes: the code-drawn board (with and without mini-visuals) and the
  // twin image board. Captions are deliberately long enough to reach the badge.
  const codeHalf = (mark, cls, label, vis) => `<div class="cb-half ${cls}"><div class="cb-mark">${mark}</div>`
    + `<div class="cb-vis">${vis}</div><div class="cb-label">${label}</div></div>`;
  const expr = (t) => `<div class="cf-expr">${t}</div>`;
  const twinHalf = (mark, cls, label) => `<div class="tb-half ${cls}"><div class="tb-mark">${mark}</div>`
    + `<img src="${PIXEL}" alt=""><div class="tb-label">${label}</div></div>`;
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">`
    + `<style>${THEME_CSS}</style><style>${regionCss}</style></head><body>`
    + `<div class="section sec-errors"><div class="panel has-twin-board">`
    // label-only board — the shape that exposed the bug
    + `<div class="d-code-board">${codeHalf('✗', 'cb-wrong', 'تشابه الطول بينهما', '')}`
    + `<div class="cb-divider"></div>${codeHalf('✓', 'cb-correct', 'المكان يميز الجزأين', '')}</div>`
    // board with mini-visuals
    + `<div class="d-code-board">${codeHalf('✗', 'cb-wrong', 'بالتبخر', expr('تبخر'))}`
    + `<div class="cb-divider"></div>${codeHalf('✓', 'cb-correct', 'بالتكاثف', expr('تكاثف'))}</div>`
    // twin image board
    + `<div class="d-twin-board">${twinHalf('✗', 'tb-wrong', 'الجذور فوق التربة')}`
    + `<div class="tb-divider"></div>${twinHalf('✓', 'tb-correct', 'الجذور تحت التربة')}</div>`
    + `</div></div></body></html>`;
}

test('status icons never overlap text on the misconception boards (RTL)', async (t) => {
  const exe = chromePath();
  if (!exe) return t.skip('no chromium available');
  const { chromium } = require('playwright-core');
  const regionCss = require('../decorative/regions/ye/theme').THEME_OVERRIDE_CSS;
  const file = path.join(require('node:os').tmpdir(), `icon-overlap-${process.pid}.html`);
  fs.writeFileSync(file, boardHtml(regionCss));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  try {
    for (const width of [700, 794, 900]) {
      const page = await browser.newPage();
      await page.setViewportSize({ width, height: 900 });
      await page.goto('file://' + file);
      const r = await page.evaluate(() => {
        const over = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
        const collisions = [];
        const marks = document.querySelectorAll('.cb-mark, .tb-mark');
        for (const mark of marks) {
          const mb = mark.getBoundingClientRect();
          const half = mark.closest('.cb-half, .tb-half');
          for (const el of half.querySelectorAll('.cb-label, .tb-label, .cf-expr')) {
            const eb = el.getBoundingClientRect();
            if (eb.width && eb.height && over(mb, eb)) collisions.push(`${mark.textContent.trim()} over "${el.textContent.trim()}"`);
          }
        }
        return { count: marks.length, collisions };
      });
      assert.strictEqual(r.count, 6, 'expected six badges in the fixture');
      assert.deepStrictEqual(r.collisions, [], `at ${width}px the badge covers text: ${r.collisions.join('; ')}`);
      await page.close();
    }
  } finally {
    await browser.close();
    fs.rmSync(file, { force: true });
  }
});
