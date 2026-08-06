'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { route, modelInput } = require('../route');

test('decorative_scene goes straight to nano-banana-2-lite (qwen2 fallback)', () => {
  const r = route('decorative_scene');
  assert.strictEqual(r.needsImage, true);
  assert.strictEqual(r.ladder[0], 'nano-banana-2-lite');
  assert.strictEqual(r.ladder[1], 'qwen2/text-to-image');
});

test('Latin-script labeled_diagram goes to seedream-v4 first (nano-banana-2 fallback)', () => {
  const r = route('labeled_diagram', 'en');
  assert.strictEqual(r.needsImage, true);
  assert.strictEqual(r.ladder[0], 'bytedance/seedream-v4-text-to-image');
  assert.strictEqual(r.ladder[1], 'nano-banana-2');
});

test('Kiswahili (Latin) diagram still routes like English', () => {
  assert.strictEqual(route('labeled_diagram', 'sw').ladder[0], 'bytedance/seedream-v4-text-to-image');
});

test('Arabic/Urdu (complex script) diagram goes to the strongest model FIRST', () => {
  for (const loc of ['ar', 'ur']) {
    const r = route('labeled_diagram', loc);
    assert.strictEqual(r.ladder[0], 'nano-banana-2', `${loc} should start at nano-banana-2`);
    assert.strictEqual(r.ladder[1], 'gpt-image-2-text-to-image');
  }
});

test('structured / icon / unknown route to no generation', () => {
  for (const c of ['structured', 'icon_or_motif', 'unknown']) {
    const r = route(c);
    assert.strictEqual(r.needsImage, false);
    assert.deepStrictEqual(r.ladder, []);
  }
});

test('modelInput merges the prompt with the model default params', () => {
  const inp = modelInput('nano-banana-2-lite', 'a warm scene');
  assert.strictEqual(inp.prompt, 'a warm scene');
  assert.strictEqual(inp.aspect_ratio, '4:3');
  const s = modelInput('bytedance/seedream-v4-text-to-image', 'x');
  assert.strictEqual(s.image_size, 'landscape_4_3');
});
