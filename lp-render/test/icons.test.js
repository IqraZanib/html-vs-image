'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { icon, hasIcon, ICON_NAMES } = require('../template/icons');

test('known icon returns sized svg markup', () => {
  const s = icon('school', 30);
  assert.match(s, /^<svg/);
  assert.match(s, /width="30"/);
  assert.match(s, /<\/svg>$/);
});
test('unknown icon returns empty string', () => {
  assert.strictEqual(icon('does-not-exist'), '');
});
test('library covers section-type + item icons', () => {
  for (const n of ['target', 'toolbox', 'rocket', 'lightbulb', 'pencil', 'checklist', 'ladder',
                   'person', 'cake', 'family', 'heart', 'school', 'apple', 'thumbup', 'thumbdown']) {
    assert.ok(hasIcon(n), `missing icon ${n}`);
  }
  assert.ok(Array.isArray(ICON_NAMES) && ICON_NAMES.length >= 15);
});
