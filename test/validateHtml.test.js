const { test } = require('node:test');
const assert = require('node:assert');
const { validateHtml } = require('../src/validateHtml');

const GOOD = '<!DOCTYPE html><html><head></head><body><h1>Hi</h1></body></html>';

test('accepts a self-contained document', () => {
  const r = validateHtml(GOOD);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.issues, []);
});

test('rejects missing DOCTYPE', () => {
  const r = validateHtml('<html><body>x</body></html>');
  assert.strictEqual(r.ok, false);
  assert.ok(r.issues.some((i) => /doctype/i.test(i)));
});

test('rejects external http(s) references', () => {
  const r = validateHtml('<!DOCTYPE html><html><body><img src="https://x.com/a.png"></body></html>');
  assert.strictEqual(r.ok, false);
  assert.ok(r.issues.some((i) => /external|http/i.test(i)));
});

test('rejects empty body', () => {
  const r = validateHtml('<!DOCTYPE html><html><head></head><body>   </body></html>');
  assert.strictEqual(r.ok, false);
  assert.ok(r.issues.some((i) => /empty|content/i.test(i)));
});
