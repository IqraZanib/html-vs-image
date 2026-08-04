'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { route, modelInput } = require('../route');

test('decorative_scene ladder starts at the cheapest (nano-banana-2-lite)', () => {
  const r = route('decorative_scene');
  assert.strictEqual(r.needsImage, true);
  assert.strictEqual(r.ladder[0], 'nano-banana-2-lite');
  assert.ok(r.ladder.includes('bytedance/seedream-v4-text-to-image'));
});

test('labeled_diagram ladder starts at seedream-v4', () => {
  const r = route('labeled_diagram');
  assert.strictEqual(r.needsImage, true);
  assert.strictEqual(r.ladder[0], 'bytedance/seedream-v4-text-to-image');
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
