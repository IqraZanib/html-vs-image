'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { splitIntoChunks } = require('../structure');

test('splits long text into bounded chunks at paragraph boundaries', () => {
  const para = 'x'.repeat(1000);
  const raw = Array(10).fill(para).join('\n\n'); // ~10k chars
  const chunks = splitIntoChunks(raw, 3000);
  assert.ok(chunks.length > 1, 'should produce several chunks');
  for (const c of chunks) assert.ok(c.length <= 3000, 'each chunk within the limit');
});

test('keeps short text as a single chunk', () => {
  assert.strictEqual(splitIntoChunks('a short lesson', 3000).length, 1);
});

test('hard-splits a single oversized paragraph', () => {
  const giant = 'y'.repeat(7000);
  const chunks = splitIntoChunks(giant, 2000);
  assert.ok(chunks.length >= 4, 'giant paragraph is broken up');
  for (const c of chunks) assert.ok(c.length <= 2000, 'each piece within the limit');
});
