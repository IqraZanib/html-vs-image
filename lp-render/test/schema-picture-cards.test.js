'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateLesson, SECTION_TYPES } = require('../schema');

const base = (section) => ({ meta: { title: 't', locale: 'en' }, sections: [section] });

test('picture_cards is a known section type', () => {
  assert.ok(SECTION_TYPES.includes('picture_cards'));
});

test('valid picture_cards passes', () => {
  const { ok } = validateLesson(base({ type: 'picture_cards', cards: [{ query: 'duck', kind: 'photo' }] }));
  assert.strictEqual(ok, true);
});

test('picture_cards with empty cards fails', () => {
  const { ok, errors } = validateLesson(base({ type: 'picture_cards', cards: [] }));
  assert.strictEqual(ok, false);
  assert.ok(errors.some((e) => /cards/.test(e)));
});

test('picture_cards card missing query fails', () => {
  const { ok, errors } = validateLesson(base({ type: 'picture_cards', cards: [{ kind: 'photo' }] }));
  assert.strictEqual(ok, false);
  assert.ok(errors.some((e) => /query/.test(e)));
});
