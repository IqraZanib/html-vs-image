'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { fontFaceCss } = require('../fonts/load');

test('emits base64 @font-face for the three families', () => {
  const css = fontFaceCss();
  assert.match(css, /@font-face/);
  assert.match(css, /Noto Nastaliq Urdu/);
  assert.match(css, /Noto Naskh Arabic/);
  assert.match(css, /Noto Sans/);
  assert.match(css, /src:url\(data:font\/woff2;base64,/);
  assert.doesNotMatch(css, /file:\/\//, 'must not reference file:// paths');
});
