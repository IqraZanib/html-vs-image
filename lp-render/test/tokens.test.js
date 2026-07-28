'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { tokensCss, SECTION_ACCENT } = require('../template/tokens');

test('tokensCss defines the core palette vars', () => {
  const css = tokensCss();
  for (const v of ['--paper', '--ink', '--coral', '--sky', '--sun', '--mint', '--grape']) {
    assert.ok(css.includes(v), `missing ${v}`);
  }
});
test('every 5E section type has an accent', () => {
  for (const t of ['objectives', 'materials', 'introduction', 'explanation',
                   'guided_practice', 'assessment', 'differentiation', 'generic']) {
    assert.ok(SECTION_ACCENT[t], `missing accent for ${t}`);
  }
});
