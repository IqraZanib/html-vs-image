'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { splitIntoChunks, extractLessonText } = require('../structure');

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

test('extracts the lesson text from an API-response JSON, dropping metadata', () => {
  const lesson = '## Weekly Pacing\n\nLearning Objectives: ' + 'add numbers and count objects carefully. '.repeat(20);
  const blob = JSON.stringify({ model: 'gemma-4-31b-it-q4', via: 'rumi-prod', base_url: 'http://127.0.0.1:8000/v1', usage: { completion_tokens: 3415 }, results: [{ grade: 1, subject: 'Maths', text: lesson }] });
  const out = extractLessonText(blob);
  assert.ok(out.includes('Weekly Pacing') && out.includes('Learning Objectives'), 'keeps the lesson');
  assert.ok(!out.includes('gemma-4-31b') && !out.includes('completion_tokens'), 'drops the metadata');
});

test('leaves plain text and real content JSON unchanged', () => {
  assert.strictEqual(extractLessonText('Just a plain lesson.'), 'Just a plain lesson.');
  const schema = JSON.stringify({ meta: {}, sections: [{ heading: 'H', type: 'text', body: 'b' }] });
  assert.strictEqual(extractLessonText(schema), schema);
});
