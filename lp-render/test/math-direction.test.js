'use strict';
// RENDERING RULE: an arithmetic expression inside an Arabic sentence must read
// left-to-right, while the sentence around it stays right-to-left.
//
// Arabic-Indic digits are strong right-to-left-neutral (AN) but the operators
// between them (÷ = +) are NEUTRAL, so the bidi algorithm resolves them from the
// surrounding paragraph. In an RTL paragraph that turns «١٦ ÷ ٤ = ٤» into
// «٤ = ٤ ÷ ١٦» — the digits keep their own order, the operators flip around them.
// A reviewer reported exactly this on a division exercise. richText() therefore
// wraps every run in <bdi class="ltr-math" dir="ltr"> and the theme gives that
// class `unicode-bidi:isolate-override`.
//
// Two things this test is careful about, both learned the hard way:
//   * `dir="ltr"` alone does NOT fix it, and neither does `unicode-bidi:isolate`.
//     Only `isolate-override` actually reorders. So asserting on the markup would
//     pass while the page still rendered backwards — we measure real glyph
//     positions instead.
//   * A Unicode isolate (U+2066/U+2069) INSIDE an isolate-override re-enables
//     normal bidi resolution and reverses the run again. Do not add one.
//
// The measurement sorts each run's characters by on-screen x and compares the
// result to the intended string. Controls prove the method can actually detect
// the fault before any verdict is trusted.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { THEME_CSS } = require('../decorative/theme');
const { THEME_OVERRIDE_CSS } = require('../decorative/regions/ye/theme');
const { richText, isolateMath } = require('../math/math');

function chromePath() {
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Every place an expression can appear in a guide: prose, a list item, a table
// cell, a card label, a caption, and an SVG code figure.
const CASES = [
  ['prose', 'يكتب التلميذ ١٦ ÷ ٤ = ٤ في دفتره.', '١٦÷٤=٤'],
  ['answer-key', 'الحل: ١٠ ÷ ٢ = ٥ ثم ٤ ÷ ٢ = ٢.', '١٠÷٢=٥'],
  ['check', 'تحقق: ٦ + ٨ = ١٤ صحيح.', '٦+٨=١٤'],
  ['no-spaces', 'اكتب ١٥÷٥=٣ بخط واضح.', '١٥÷٥=٣'],
  ['latin-digits', 'اكتب 12 ÷ 2 = 6 هنا.', '12÷2=6'],
  ['bare', '٩ + ٤ = ١٣', '٩+٤=١٣'],
];

function fixture() {
  const rows = CASES.map(([id, text]) => `<p id="c-${id}" class="d-text">${richText(text)}</p>`).join('');
  // SVG figures label their own geometry, so cover a <text> node too.
  const svg = `<svg class="cf-svg" viewBox="0 0 300 60" width="300" height="60">`
    + `<text id="c-svg" x="150" y="34" text-anchor="middle" font-size="16"`
    + ` direction="ltr" style="unicode-bidi:isolate-override">٢٠ ÷ ٥ = ٤</text></svg>`;
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">`
    + `<style>${THEME_CSS}</style><style>${THEME_OVERRIDE_CSS}</style>`
    + `<style>body{width:794px;font-size:17px}</style></head><body>`
    + `<div class="section"><div class="panel">${rows}${svg}`
    // controls: what the fault looks like when nothing protects the run
    + `<p id="ctl-unprotected" class="d-text">اكتب ١٦ ÷ ٤ = ٤ هنا.</p>`
    + `<p id="ctl-latin">ABCDE</p><p id="ctl-arabic">أبجد</p>`
    + `</div></div></body></html>`;
}

// Rebuild the string a reader's eye follows: top line first, then left to right.
// Runs in the browser, so it may not close over anything from this file.
function readOrder(sel) {
  const el = document.querySelector(sel);
  const nodes = []; let flat = '';
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) { nodes.push({ n, start: flat.length }); flat += n.nodeValue || ''; }
  const chars = [];
  for (let i = 0; i < flat.length; i++) {
    const ch = flat[i];
    if (!ch.trim()) continue;
    const rec = nodes.filter((z) => z.start <= i).pop();
    const rg = document.createRange();
    rg.setStart(rec.n, i - rec.start); rg.setEnd(rec.n, i - rec.start + 1);
    const b = rg.getBoundingClientRect();
    if (b.width) chars.push({ ch, x: b.left, y: Math.round(b.top / 6) });
  }
  chars.sort((p, q) => (p.y - q.y) || (p.x - q.x));
  return chars.map((c) => c.ch).join('');
}

test('inline arithmetic reads left-to-right inside an RTL sentence', async (t) => {
  const exe = chromePath();
  if (!exe) return t.skip('no chromium available');
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.setContent(fixture());
    await page.evaluate(async () => { await document.fonts.ready; });
    const read = async (sel) => page.evaluate(readOrder, sel);

    // The method must be able to see direction at all, and must be able to see
    // THIS fault. Without the negative control a broken fix reads as a pass.
    assert.strictEqual(await read('#ctl-latin'), 'ABCDE', 'method cannot see LTR text');
    assert.strictEqual(await read('#ctl-arabic'), 'دجبأ', 'method cannot see RTL text');
    const unprotected = await read('#ctl-unprotected');
    assert.ok(/٤=٤÷١٦/.test(unprotected.replace(/\s+/g, '')),
      `an unprotected run should reverse in RTL — got «${unprotected}». If this fails the`
      + ' browser has changed and the assertions below no longer prove anything.');

    for (const [id, , want] of CASES) {
      const seen = await read(`#c-${id}`);
      assert.ok(seen.includes(want), `${id}: expected «${want}» in reading order, got «${seen}»`);
    }
    const svg = await read('#c-svg');
    assert.strictEqual(svg, '٢٠÷٥=٤', `svg label reads «${svg}»`);
  } finally {
    await browser.close();
  }
});

test('every arithmetic run gets an ltr-math container', () => {
  // Cheap guard for the common regression: someone routes text around richText().
  for (const [, text, want] of CASES) {
    const html = isolateMath(text);
    assert.match(html, /<bdi class="ltr-math" dir="ltr">/, `no container for: ${text}`);
    const inside = [...html.matchAll(/<bdi class="ltr-math" dir="ltr">([^<]+)<\/bdi>/g)]
      .map((m) => m[1].replace(/\s+/g, ''));
    assert.ok(inside.includes(want), `container holds ${JSON.stringify(inside)}, not «${want}»`);
  }
});

test('ltr-math carries isolate-override, not plain isolate', () => {
  // `unicode-bidi:isolate` does not reorder. If the theme ever softens this to
  // `isolate`, the markup still looks right and the page renders backwards.
  const rule = THEME_OVERRIDE_CSS.match(/\.ltr-math\s*\{[^}]*\}/);
  assert.ok(rule, '.ltr-math rule missing from the Yemen pack');
  assert.match(rule[0], /unicode-bidi:\s*isolate-override/);
  assert.match(rule[0], /direction:\s*ltr/);
});

test('no Unicode isolates are injected around maths', () => {
  // U+2066 inside an isolate-override container re-enables bidi and re-reverses
  // the run. Measured, not theorised — keep them out.
  const html = isolateMath('يكتب التلميذ ١٦ ÷ ٤ = ٤.');
  assert.ok(!/[⁦⁧⁨⁩]/.test(html), 'isolate characters found in maths markup');
});
