'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateLesson, SECTION_TYPES } = require('../schema');

test('valid minimal lesson passes', () => {
  const r = validateLesson({ meta: { id: '1', title: 'T', locale: 'en' }, sections: [] });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.errors, []);
});

test('missing meta fails with clear error', () => {
  const r = validateLesson({ sections: [] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('meta')));
});

test('missing meta.title and meta.locale fail', () => {
  const r = validateLesson({ meta: { id: '1' }, sections: [] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('meta.title')));
  assert.ok(r.errors.some((e) => e.includes('meta.locale')));
});

test('sections must be an array', () => {
  const r = validateLesson({ meta: { id: '1', title: 'T', locale: 'en' }, sections: {} });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('sections')));
});

test('a section without a type fails', () => {
  const r = validateLesson({ meta: { id: '1', title: 'T', locale: 'en' }, sections: [{}] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('sections[0].type')));
});

test('unknown locale fails', () => {
  const r = validateLesson({ meta: { id: '1', title: 'T', locale: 'xx' }, sections: [] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('locale')));
});

test('SECTION_TYPES includes the 5E-aligned set', () => {
  for (const t of ['objectives', 'materials', 'introduction', 'explanation',
                   'guided_practice', 'assessment', 'differentiation', 'generic']) {
    assert.ok(SECTION_TYPES.includes(t), `missing ${t}`);
  }
});
