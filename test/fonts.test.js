const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { FONTS, fontFaceCss } = require('../src/fonts');

test('FONTS resolves three families to existing woff2 files', () => {
  const families = FONTS.map((f) => f.family);
  assert.ok(families.includes('Noto Nastaliq Urdu'));
  assert.ok(families.includes('Noto Naskh Arabic'));
  assert.ok(families.includes('Noto Sans'));
  for (const f of FONTS) {
    assert.ok(fs.existsSync(f.path), `font file missing: ${f.path}`);
  }
});

test('fontFaceCss emits one @font-face per family with file:// URL', () => {
  const css = fontFaceCss();
  assert.match(css, /@font-face/);
  assert.match(css, /Noto Nastaliq Urdu/);
  assert.match(css, /file:\/\//);
});

test('fontFaceCss emits a 700 weight face for Noto Nastaliq Urdu', () => {
  const css = fontFaceCss();
  assert.match(css, /font-family:'Noto Nastaliq Urdu'[^}]*font-weight:700/);
});
