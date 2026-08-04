'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolvePrompt } = require('../prompts/build');

const block = { type: 'HOOK_STORY', text: 'Ali and Sara ride the ABC train',
  characters: [{ name: 'Ali', role: 'student, boy' }, { name: 'Sara', role: 'student, girl' }] };

test('decorative_scene prompt injects story, characters, region and a no-text directive', () => {
  const p = resolvePrompt({ category: 'decorative_scene', subject: 'English', block, region: 'pk', grade: '1' });
  assert.match(p, /Ali/);
  assert.match(p, /Sara/);
  assert.match(p, /hijab|shalwar|kameez/i);
  assert.match(p, /no text/i);
  assert.match(p, /illustration/i);
});

test('region swap changes the prompt (no hardcoded pk)', () => {
  const pk = resolvePrompt({ category: 'decorative_scene', subject: 'English', block, region: 'pk' });
  const df = resolvePrompt({ category: 'decorative_scene', subject: 'English', block, region: 'default' });
  assert.notStrictEqual(pk, df);
});

test('labeled_diagram prompt asks for legible labels', () => {
  const p = resolvePrompt({ category: 'labeled_diagram', subject: 'Science',
    block: { type: 'DIAGRAM', text: 'the water cycle with labels' }, region: 'pk', grade: '5' });
  assert.match(p, /label/i);
  assert.match(p, /diagram|infographic/i);
});

test('falls back to the category default template for an unknown subject', () => {
  const p = resolvePrompt({ category: 'decorative_scene', subject: 'Astrophysics', block, region: 'pk' });
  assert.match(p, /Ali/);
});
