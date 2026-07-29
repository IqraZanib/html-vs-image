'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { getRenderer } = require('../template/sections');
const { SECTION_TYPES } = require('../schema');

const ctx = { locale: 'en', dir: 'ltr' };

test('picture_equation is a registered section type', () => {
  assert.ok(SECTION_TYPES.includes('picture_equation'));
});

test('renders a icons, an operator, b icons, =, and result icons', () => {
  const html = getRenderer('picture_equation')(
    { type: 'picture_equation', equations: [{ icon: 'apple', a: 5, op: '-', b: 2, result: 3 }] },
    ctx
  );
  // 5 + 2 + 3 = 10 apple SVGs total in the visual
  const svgCount = (html.match(/<svg/g) || []).length;
  // header disc icon (1) + 10 apples = 11 svgs
  assert.strictEqual(svgCount, 11, `expected 11 svgs, got ${svgCount}`);
  assert.match(html, /−/);            // minus sign present
  assert.match(html, /5 − 2 = 3/);    // numeric caption
});

test('caps absurd counts and defaults to apple + minus', () => {
  const html = getRenderer('picture_equation')(
    { type: 'picture_equation', equations: [{ a: 999, b: 1, result: 1 }] },
    ctx
  );
  const svgCount = (html.match(/<svg/g) || []).length;
  // header (1) + capped 20 + 1 + 1 = 23
  assert.strictEqual(svgCount, 23, `expected 23 svgs (20-cap), got ${svgCount}`);
  assert.match(html, /−/);
});
