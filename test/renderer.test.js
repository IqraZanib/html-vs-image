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
