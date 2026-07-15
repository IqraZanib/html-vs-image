const { test } = require('node:test');
const assert = require('node:assert');
const { MODELS, costUsd } = require('../src/models');

test('MODELS contains the three benchmark models', () => {
  assert.ok(MODELS['claude-haiku-4-5']);
  assert.ok(MODELS['claude-sonnet-5']);
  assert.ok(MODELS['claude-opus-4-8']);
});

test('costUsd computes input+output cost per million tokens', () => {
  // haiku: $1/M in, $5/M out. 1_000_000 in + 200_000 out = 1.00 + 1.00 = 2.00
  assert.strictEqual(costUsd('claude-haiku-4-5', 1_000_000, 200_000), 2.0);
});

test('costUsd throws on unknown model', () => {
  assert.throws(() => costUsd('gpt-4', 1, 1), /unknown model/i);
});
