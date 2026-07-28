'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { getRenderer } = require('../template/sections');
const ctx = { locale: 'en', dir: 'ltr' };

test('explanation renders word wall, formula, steps and cfu', () => {
  const html = getRenderer('explanation')({ type: 'explanation', time: '15 min',
    wordWall: [{ word: 'name', meaning: 'what people call you', icon: 'nametag' }],
    formula: { parts: [{ label: 'WHO', value: 'I' }, { label: 'ACTION', value: 'like' }] },
    steps: [{ label: 'Model', body: 'I like to paint.' }],
    cfu: [{ q: 'Which word = people you live with?', a: 'family' }] }, ctx);
  assert.match(html, /name/);
  assert.match(html, /what people call you/);
  assert.match(html, /WHO/); assert.match(html, />I</);
  assert.match(html, /I like to paint\./);
  assert.match(html, /family/);
});
