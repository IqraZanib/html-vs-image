'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { autoImages, autoImageCards } = require('../images/auto');

const lesson = (sections) => ({ meta: { title: 't', locale: 'en' }, sections });

test('detects concrete real-world concepts, ignores abstract words', () => {
  const l = lesson([
    { type: 'explanation', wordWall: [
      { word: 'cow', meaning: 'a farm animal' },
      { word: 'apple', meaning: 'a fruit' },
      { word: 'like', meaning: 'something that makes you happy' },
      { word: 'name', meaning: 'what people call you' },
    ] },
  ]);
  const cards = autoImageCards(l);
  const queries = cards.map((c) => c.query);
  assert.ok(queries.includes('cow'));
  assert.ok(queries.includes('apple'));
  assert.ok(!queries.includes('like'), 'abstract "like" must not be picked');
  assert.ok(!queries.includes('name'), 'abstract "name" must not be picked');
  cards.forEach((c) => { assert.strictEqual(c.kind, 'photo'); assert.match(c.label, /^[A-Z]/); });
});

test('matches plurals to the singular concept, dedupes', () => {
  const l = lesson([{ type: 'introduction', greeting: 'We saw cows and two cows near the trees and a tree.' }]);
  const cards = autoImageCards(l);
  const q = cards.map((c) => c.query);
  assert.deepStrictEqual([...new Set(q)], q, 'no duplicates');
  assert.ok(q.includes('cow'));
  assert.ok(q.includes('tree'));
});

test('caps the number of cards', () => {
  const l = lesson([{ type: 'explanation', wordWall:
    ['cow', 'goat', 'apple', 'banana', 'school', 'river', 'bus', 'tree'].map((w) => ({ word: w, meaning: w })) }]);
  const cards = autoImageCards(l, { max: 3 });
  assert.strictEqual(cards.length, 3);
});

test('word-boundary safe: does not match a concept inside another word', () => {
  const l = lesson([{ type: 'introduction', greeting: 'It was a sunny day and she was sensible.' }]);
  const cards = autoImageCards(l);
  assert.ok(!cards.some((c) => c.query === 'sun'), '"sun" must not match inside "sunny"');
});

test('autoImages inserts a picture_cards section after explanation, non-mutating', async () => {
  const input = lesson([
    { type: 'objectives', items: [{ text: 'x' }] },
    { type: 'explanation', wordWall: [{ word: 'cow', meaning: 'a farm animal' }] },
    { type: 'assessment' },
  ]);
  const { lesson: out, cards } = await autoImages(input);
  assert.ok(cards.length >= 1);
  const types = out.sections.map((s) => s.type);
  assert.deepStrictEqual(types, ['objectives', 'explanation', 'picture_cards', 'assessment']);
  // input untouched
  assert.strictEqual(input.sections.some((s) => s.type === 'picture_cards'), false);
});

test('no concepts → no picture_cards section added', async () => {
  const input = lesson([{ type: 'explanation', wordWall: [{ word: 'name', meaning: 'what people call you' }] }]);
  const { lesson: out, cards } = await autoImages(input);
  assert.strictEqual(cards.length, 0);
  assert.strictEqual(out.sections.some((s) => s.type === 'picture_cards'), false);
});

test('pluggable async classify overrides the heuristic', async () => {
  const input = lesson([{ type: 'explanation', wordWall: [{ word: 'name', meaning: 'x' }] }]);
  const classify = async () => [{ query: 'volcano', kind: 'photo', label: 'Volcano' }];
  const { lesson: out, cards } = await autoImages(input, { classify });
  assert.strictEqual(cards[0].query, 'volcano');
  assert.ok(out.sections.some((s) => s.type === 'picture_cards' && s.cards[0].query === 'volcano'));
});
