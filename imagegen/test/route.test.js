'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { route, modelInput } = require('../route');

// SINGLE-MODEL POLICY (owner decision, 2026-08-18): every generated image comes from
// nano-banana-2-lite, whatever the content kind or the script. These tests used to
// assert the old cost ladder (seedream / qwen2 / nano-banana-2 escalations); they now
// guard against those escalations coming back, which is what would quietly raise the
// per-lesson cost again.
test('every image kind routes to the one model, with no fallback ladder', () => {
  for (const kind of ['decorative_scene', 'labeled_diagram']) {
    const r = route(kind);
    assert.strictEqual(r.needsImage, true, `${kind} should need an image`);
    assert.deepStrictEqual(r.ladder, ['nano-banana-2-lite'], `${kind} must not escalate`);
  }
});

test('the script no longer changes the model — that is the point of one model', () => {
  for (const loc of ['en', 'sw', 'ar', 'ur']) {
    assert.deepStrictEqual(route('labeled_diagram', loc).ladder, ['nano-banana-2-lite'],
      `${loc} should route to the single model`);
  }
});

test('LP_ART_MODEL overrides the model for artwork runs', () => {
  const prev = process.env.LP_ART_MODEL;
  process.env.LP_ART_MODEL = 'z-image';
  try {
    assert.deepStrictEqual(route('decorative_scene').ladder, ['z-image']);
    assert.deepStrictEqual(route('labeled_diagram', 'ar').ladder, ['z-image']);
  } finally {
    if (prev === undefined) delete process.env.LP_ART_MODEL; else process.env.LP_ART_MODEL = prev;
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
