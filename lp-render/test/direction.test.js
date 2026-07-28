'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveDirection } = require('../template/direction');

test('english is ltr with Noto Sans', () => {
  assert.deepStrictEqual(resolveDirection('en'), { dir: 'ltr', fontFamily: `"Noto Sans", sans-serif` });
});
test('urdu is rtl with Nastaliq', () => {
  const r = resolveDirection('ur');
  assert.strictEqual(r.dir, 'rtl');
  assert.match(r.fontFamily, /Noto Nastaliq Urdu/);
});
test('sindhi is rtl with Naskh', () => {
  const r = resolveDirection('sd');
  assert.strictEqual(r.dir, 'rtl');
  assert.match(r.fontFamily, /Noto Naskh Arabic/);
});
test('unknown locale falls back to ltr Noto Sans', () => {
  assert.deepStrictEqual(resolveDirection('zz'), { dir: 'ltr', fontFamily: `"Noto Sans", sans-serif` });
});
