'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { getRenderer } = require('../template/sections');
const ctx = { locale: 'en', dir: 'ltr' };

test('introduction renders greeting + story bubbles with icons', () => {
  const html = getRenderer('introduction')({ type: 'introduction', time: '5 min',
    greeting: 'Good morning!', stories: [{ label: 'Story', text: 'Pinky went to school', icon: 'school' }] }, ctx);
  assert.match(html, /Good morning!/);
  assert.match(html, /Pinky went to school/);
  assert.match(html, /<svg/);
});

test('differentiation renders struggling + advanced', () => {
  const html = getRenderer('differentiation')({ type: 'differentiation',
    struggling: 'Give sentence starters', advanced: 'Use two words' }, ctx);
  assert.match(html, /Give sentence starters/);
  assert.match(html, /Use two words/);
});
