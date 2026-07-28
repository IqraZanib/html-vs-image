'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { getRenderer } = require('../template/sections');

const ctx = { locale: 'en', dir: 'ltr' };

test('objectives renders items and tag', () => {
  const html = getRenderer('objectives')({ type: 'objectives', time: '2 min',
    items: [{ text: 'Use 5 words', tag: 'Apply' }] }, ctx);
  assert.match(html, /Use 5 words/);
  assert.match(html, /Apply/);
  assert.match(html, /2 min/);
});

test('materials renders resources, target words, note', () => {
  const html = getRenderer('materials')({ type: 'materials',
    resources: ['Whiteboard'], targetWords: ['name', 'age'],
    note: { title: 'Tip', body: 'Use gestures' } }, ctx);
  assert.match(html, /Whiteboard/);
  assert.match(html, /name/); assert.match(html, /age/);
  assert.match(html, /Use gestures/);
});

test('unknown type falls back to generic', () => {
  const r = getRenderer('totally-unknown');
  const html = r({ type: 'totally-unknown', title: 'X', body: 'hi', items: ['a'] }, ctx);
  assert.match(html, /hi/); assert.match(html, />a</);
});
