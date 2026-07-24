'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { getRenderer } = require('../template/sections');
const ctx = { locale: 'en', dir: 'ltr' };

test('guided_practice renders task, samples, differentiation', () => {
  const html = getRenderer('guided_practice')({ type: 'guided_practice', time: '15 min',
    task: 'Write 5 sentences', samples: [{ text: 'My name is Ali.', icon: 'nametag' }],
    differentiation: { struggling: 'starters', advanced: 'two words' } }, ctx);
  assert.match(html, /Write 5 sentences/);
  assert.match(html, /My name is Ali\./);
  assert.match(html, /starters/); assert.match(html, /two words/);
});

test('assessment renders AFL up/down, exit ticket, homework', () => {
  const html = getRenderer('assessment')({ type: 'assessment', time: '3 min',
    afl: { instruction: 'Thumbs?', items: [
      { text: 'I eat my name.', verdict: 'down' }, { text: 'My family lives here.', verdict: 'up' } ] },
    exitTicket: 'Read one sentence aloud', homework: 'Draw your family' }, ctx);
  assert.match(html, /Thumbs\?/);
  assert.match(html, /I eat my name\./);
  assert.match(html, /grow down/); assert.match(html, /grow up/);
  assert.match(html, /Read one sentence aloud/);
  assert.match(html, /Draw your family/);
});
