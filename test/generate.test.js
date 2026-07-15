const { test } = require('node:test');
const assert = require('node:assert');
const { generate } = require('../src/generate');

const baseOpts = (deps) => ({
  model: 'claude-haiku-4-5',
  fewShotHtml: '<html>anchor</html>',
  outPath: '/tmp/does-not-matter.png',
  maxRetries: 2,
  deps,
});
const input = { subject: 'Math', grade: 1, language: 'Urdu', topic: 'counting' };

test('happy path returns pngPath and metadata on first attempt', async () => {
  const deps = {
    llmGenerate: async () => ({ html: '<!DOCTYPE html><html><body>ok</body></html>', tokensIn: 10, tokensOut: 20, latencyMs: 5, costUsd: 0.1 }),
    validate: () => ({ ok: true, issues: [] }),
    render: async (html, outPath) => ({ pngPath: outPath, overflowed: false, dims: {} }),
  };
  const res = await generate(input, baseOpts(deps));
  assert.strictEqual(res.pngPath, '/tmp/does-not-matter.png');
  assert.strictEqual(res.metadata.attempts, 1);
  assert.strictEqual(res.metadata.costUsd, 0.1);
});

test('retries after a validation failure, then succeeds', async () => {
  let call = 0;
  const deps = {
    llmGenerate: async () => { call++; return { html: `attempt${call}`, tokensIn: 1, tokensOut: 1, latencyMs: 1, costUsd: 0 }; },
    validate: (html) => (html === 'attempt1' ? { ok: false, issues: ['missing DOCTYPE'] } : { ok: true, issues: [] }),
    render: async (html, outPath) => ({ pngPath: outPath, overflowed: false, dims: {} }),
  };
  const res = await generate(input, baseOpts(deps));
  assert.strictEqual(res.metadata.attempts, 2);
});

test('throws after exhausting retries', async () => {
  const deps = {
    llmGenerate: async () => ({ html: 'bad', tokensIn: 1, tokensOut: 1, latencyMs: 1, costUsd: 0 }),
    validate: () => ({ ok: false, issues: ['always bad'] }),
    render: async () => { throw new Error('should not render'); },
  };
  await assert.rejects(() => generate(input, baseOpts(deps)), /after retries/i);
});
