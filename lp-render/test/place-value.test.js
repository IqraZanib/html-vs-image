'use strict';
const test = require('node:test');
const assert = require('node:assert');
const placeValue = require('../template/sections/place-value');
const { validateLesson } = require('../schema');
const { resolveLabels } = require('../template/labels');

const ctx = { locale: 'en', dir: 'ltr', labels: resolveLabels('en') };
const count = (s, re) => (s.match(re) || []).length;

test('draws the right number of base-ten blocks for each place', () => {
  const html = placeValue({ type: 'place_value', numbers: [{ value: 342, columns: ['H', 'T', 'O'] }] }, ctx);
  assert.strictEqual(count(html, /fill="#3b82f6"/g), 3, '3 hundred flats');
  assert.strictEqual(count(html, /fill="#f5c518"/g), 4, '4 ten rods');
  assert.strictEqual(count(html, /fill="#ef4444"/g), 2, '2 ones cubes');
  // digits shown under columns
  assert.match(html, /class="pv-d">3</);
  assert.match(html, /class="pv-d">4</);
  assert.match(html, /class="pv-d">2</);
});

test('supports a two-column (Tens/Ones) table and captions', () => {
  const html = placeValue({ type: 'place_value', numbers: [{ value: 45, columns: ['T', 'O'], caption: 'Forty-five' }] }, ctx);
  assert.strictEqual(count(html, /fill="#3b82f6"/g), 0, 'no hundreds column');
  assert.strictEqual(count(html, /fill="#f5c518"/g), 4);
  assert.strictEqual(count(html, /fill="#ef4444"/g), 5);
  assert.match(html, /Forty-five/);
  assert.doesNotMatch(html, /Hundreds/);
});

test('a zero digit renders a "0" placeholder, not blocks', () => {
  const html = placeValue({ type: 'place_value', numbers: [{ value: 602, columns: ['H', 'T', 'O'] }] }, ctx);
  assert.strictEqual(count(html, /fill="#3b82f6"/g), 6);
  assert.strictEqual(count(html, /fill="#f5c518"/g), 0, 'zero tens');
  assert.match(html, /pv-empty">0</);
});

test('discs style renders one disc per unit across 7 columns with an expanded-form equation', () => {
  const html = placeValue({ type: 'place_value', style: 'discs',
    numbers: [{ value: 5234678, columns: ['M', 'HTh', 'TTh', 'Th', 'H', 'T', 'O'] }] }, ctx);
  // total discs = sum of digits 5+2+3+4+6+7+8 = 35
  assert.strictEqual(count(html, /class="pv-disc"/g), 35);
  assert.match(html, /Millions/);
  assert.match(html, /Hundred Thousands/);
  // expanded-form equation, non-zero terms with commas, ending in the standard form
  assert.match(html, /5,000,000 \+ 200,000 \+ 30,000 \+ 4,000 \+ 600 \+ 70 \+ 8 = <b>5,234,678<\/b>/);
});

test('discs expanded form skips zero places but the disc column shows a 0 placeholder', () => {
  const html = placeValue({ type: 'place_value', style: 'discs',
    numbers: [{ value: 7000000, columns: ['M', 'HTh', 'TTh', 'Th', 'H', 'T', 'O'] }] }, ctx);
  assert.strictEqual(count(html, /class="pv-disc"/g), 7, '7 discs in the Millions column, none elsewhere');
  assert.match(html, /7,000,000 = <b>7,000,000<\/b>/);
  assert.ok(count(html, /pv-empty">0</g) >= 1, 'zero columns show a 0 placeholder');
});

test('schema accepts a valid place_value section and rejects an empty/invalid one', () => {
  const base = (section) => ({ meta: { title: 't', locale: 'en' }, sections: [section] });
  assert.strictEqual(validateLesson(base({ type: 'place_value', numbers: [{ value: 123 }] })).ok, true);
  assert.strictEqual(validateLesson(base({ type: 'place_value', numbers: [] })).ok, false);
  assert.strictEqual(validateLesson(base({ type: 'place_value', numbers: [{ caption: 'x' }] })).ok, false);
});
