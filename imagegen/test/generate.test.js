'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { generateImage } = require('../kie/generate');

test('builds model input from route config and returns the asset', async () => {
  let seen;
  const runImpl = async (args) => { seen = args; return { ok: true, url: 'http://img/x.png', creditsConsumed: 4, latencyMs: 10 }; };
  const r = await generateImage({ apiKey: 'k', model: 'nano-banana-2-lite', prompt: 'a warm scene', runImpl });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.url, 'http://img/x.png');
  assert.strictEqual(r.model, 'nano-banana-2-lite');
  assert.strictEqual(seen.input.prompt, 'a warm scene');
  assert.strictEqual(seen.input.aspect_ratio, '4:3');
});

test('propagates failure from the task run', async () => {
  const runImpl = async () => ({ ok: false, error: 'timeout' });
  const r = await generateImage({ apiKey: 'k', model: 'nano-banana-2-lite', prompt: 'x', runImpl });
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /timeout/);
});
