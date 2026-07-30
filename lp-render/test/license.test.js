'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { isAllowedLicense, ALLOWED_LICENSES } = require('../images/license');

test('accepts public-domain and permissive CC licenses', () => {
  for (const c of ['pdm', 'cc0', 'by', 'by-sa', 'BY', ' By-Sa ']) {
    assert.strictEqual(isAllowedLicense(c), true, `should accept ${c}`);
  }
});

test('rejects non-commercial, no-derivatives, empty, unknown', () => {
  for (const c of ['by-nc', 'by-nc-sa', 'by-nd', '', null, undefined, 'sampling+']) {
    assert.strictEqual(isAllowedLicense(c), false, `should reject ${c}`);
  }
});

test('exposes the allowed set', () => {
  assert.deepStrictEqual([...ALLOWED_LICENSES].sort(), ['by', 'by-sa', 'cc0', 'pdm']);
});
