'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveRegion } = require('../prompts/regions');
const { characterSpec } = require('../characters');

test('resolveRegion returns pk context and falls back to default', () => {
  const pk = resolveRegion('pk');
  assert.strictEqual(pk.id, 'pk');
  assert.match(pk.dress, /shalwar|hijab|kameez/i);
  const fb = resolveRegion('does-not-exist');
  assert.strictEqual(fb.id, 'default');
});

test('characterSpec injects region dress into character appearance', () => {
  const block = { characters: [{ name: 'Sara', role: 'student, girl' }] };
  const spec = characterSpec(block, 'pk');
  assert.strictEqual(spec.characters[0].name, 'Sara');
  assert.match(spec.characters[0].appearance, /hijab|shalwar|kameez/i);
});

test('seed is stable for the same characters+region and differs across sets', () => {
  const a = characterSpec({ characters: [{ name: 'Ali' }, { name: 'Sara' }] }, 'pk').seed;
  const b = characterSpec({ characters: [{ name: 'Ali' }, { name: 'Sara' }] }, 'pk').seed;
  const c = characterSpec({ characters: [{ name: 'Bilal' }] }, 'pk').seed;
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
  assert.ok(Number.isInteger(a) && a >= 0);
});
