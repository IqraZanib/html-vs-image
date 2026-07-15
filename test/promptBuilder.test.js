const { test } = require('node:test');
const assert = require('node:assert');
const { buildMessages } = require('../src/promptBuilder');

const input = { subject: 'Math', grade: 1, language: 'Urdu', topic: 'counting 1-10' };

test('system prompt states the hard constraints', () => {
  const { system } = buildMessages(input, '<html>anchor</html>');
  assert.match(system, /self-contained/i);
  assert.match(system, /A4/);
  assert.match(system, /Noto Nastaliq Urdu/);
  assert.match(system, /no external/i);
});

test('system prompt embeds the few-shot anchor', () => {
  const { system } = buildMessages(input, '<html>ANCHOR_MARKER</html>');
  assert.match(system, /ANCHOR_MARKER/);
});

test('user prompt carries the request fields', () => {
  const { user } = buildMessages(input, '<html>a</html>');
  assert.match(user, /Math/);
  assert.match(user, /Urdu/);
  assert.match(user, /counting 1-10/);
  assert.match(user, /grade 1/i);
});
