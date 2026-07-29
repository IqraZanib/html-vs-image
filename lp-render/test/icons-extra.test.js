'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { icon, hasIcon, ICON_NAMES } = require('../template/icons');

test('extra illustration icons are available', () => {
  for (const n of ['cow', 'plant', 'teacher', 'sunny', 'banana', 'triangle', 'bus', 'fish']) {
    assert.ok(hasIcon(n), `missing extra icon ${n}`);
  }
  // 18 inline + 77 generated
  assert.ok(ICON_NAMES.length >= 90, `expected >=90 icons, got ${ICON_NAMES.length}`);
});

test('an extra icon renders with its own viewBox, at the requested size', () => {
  const s = icon('cow', 40);
  assert.match(s, /^<svg/);
  assert.match(s, /width="40"/);
  assert.match(s, /viewBox="0 0 200 200"/);
  assert.match(s, /<\/svg>$/);
});

test('inline BODY icons keep their 64x64 viewBox (not shadowed by extras)', () => {
  assert.match(icon('apple', 30), /viewBox="0 0 64 64"/);
  assert.match(icon('school', 30), /viewBox="0 0 64 64"/);
});

test('unknown icon still returns empty string', () => {
  assert.strictEqual(icon('definitely-not-an-icon'), '');
});
