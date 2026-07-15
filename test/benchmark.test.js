const { test } = require('node:test');
const assert = require('node:assert');
const { TEST_SET } = require('../src/testset');
const { runBenchmark, renderReport } = require('../src/benchmark');

test('TEST_SET covers Urdu and Sindhi across subjects', () => {
  const langs = new Set(TEST_SET.map((t) => t.language));
  assert.ok(langs.has('Urdu'));
  assert.ok(langs.has('Sindhi'));
  assert.ok(TEST_SET.length >= 6);
  for (const t of TEST_SET) {
    assert.ok(t.id && t.subject && t.language && t.topic);
  }
});

test('runBenchmark runs every model x item and records results', async () => {
  const fakeGenerate = async (input, opts) => ({
    pngPath: opts.outPath,
    metadata: { model: opts.model, tokensIn: 10, tokensOut: 20, latencyMs: 5, costUsd: 0.01, attempts: 1, overflowed: false, issues: [] },
  });
  const testSet = [{ id: 't1', subject: 'Math', grade: 1, language: 'Urdu', topic: 'x' }];
  const results = await runBenchmark({
    models: ['claude-haiku-4-5', 'claude-sonnet-5'],
    testSet,
    generate: fakeGenerate,
    fewShotHtml: '<html>a</html>',
    outDir: '/tmp',
  });
  assert.strictEqual(results.length, 2);
  assert.ok(results.every((r) => r.ok));
});

test('runBenchmark records failures without throwing', async () => {
  const fakeGenerate = async () => { throw new Error('boom'); };
  const results = await runBenchmark({
    models: ['claude-haiku-4-5'],
    testSet: [{ id: 't1', subject: 'Math', grade: 1, language: 'Urdu', topic: 'x' }],
    generate: fakeGenerate,
    fewShotHtml: '<html>a</html>',
    outDir: '/tmp',
  });
  assert.strictEqual(results[0].ok, false);
  assert.match(results[0].error, /boom/);
});

test('renderReport produces an HTML page with a table and images', () => {
  const html = renderReport([
    { model: 'claude-haiku-4-5', item: 't1', ok: true, pngPath: '/tmp/a.png', costUsd: 0.01, latencyMs: 5, attempts: 1 },
  ]);
  assert.match(html, /<table/);
  assert.match(html, /claude-haiku-4-5/);
  assert.match(html, /<img/);
});

test('renderReport shows the error text for failed rows', () => {
  const html = renderReport([
    { model: 'claude-haiku-4-5', item: 't1', ok: false, error: 'boom-xyz' },
  ]);
  assert.match(html, /Error \/ Notes/);
  assert.match(html, /boom-xyz/);
});
