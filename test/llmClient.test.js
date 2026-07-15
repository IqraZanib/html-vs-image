const { test } = require('node:test');
const assert = require('node:assert');
const { extractHtml, generateHtml } = require('../src/llmClient');

test('extractHtml strips ```html fences', () => {
  const out = extractHtml('Here you go:\n```html\n<!DOCTYPE html><html></html>\n```\nDone');
  assert.strictEqual(out, '<!DOCTYPE html><html></html>');
});

test('extractHtml returns trimmed raw html when no fences', () => {
  const out = extractHtml('  <!DOCTYPE html><html></html>  ');
  assert.strictEqual(out, '<!DOCTYPE html><html></html>');
});

test('generateHtml returns html + usage + cost via injected createMessage', async () => {
  const fakeCreate = async ({ model, system, user }) => {
    assert.strictEqual(model, 'claude-haiku-4-5');
    assert.ok(system.length > 0 && user.length > 0);
    return {
      content: [{ type: 'text', text: '```html\n<!DOCTYPE html><html><body>ok</body></html>\n```' }],
      usage: { input_tokens: 1_000_000, output_tokens: 200_000 },
    };
  };
  const res = await generateHtml({
    model: 'claude-haiku-4-5',
    system: 'sys',
    user: 'usr',
    createMessage: fakeCreate,
  });
  assert.match(res.html, /<!DOCTYPE html>/);
  assert.strictEqual(res.tokensIn, 1_000_000);
  assert.strictEqual(res.tokensOut, 200_000);
  assert.strictEqual(res.costUsd, 2.0); // haiku: 1.00 + 1.00
  assert.ok(typeof res.latencyMs === 'number');
});
