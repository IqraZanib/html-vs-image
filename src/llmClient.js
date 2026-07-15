const { costUsd } = require('./models');

function extractHtml(text) {
  const s = String(text || '');
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : s).trim();
}

async function defaultCreateMessage({ model, system, user, maxTokens }) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();
  return client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
}

async function generateHtml({ model, system, user, createMessage, maxTokens = 16000 }) {
  const create = createMessage || defaultCreateMessage;
  const started = Date.now();
  const resp = await create({ model, system, user, maxTokens });
  const latencyMs = Date.now() - started;

  const text = (resp.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const html = extractHtml(text);
  const tokensIn = resp.usage ? resp.usage.input_tokens : 0;
  const tokensOut = resp.usage ? resp.usage.output_tokens : 0;
  return { html, tokensIn, tokensOut, latencyMs, costUsd: costUsd(model, tokensIn, tokensOut) };
}

module.exports = { extractHtml, generateHtml };
