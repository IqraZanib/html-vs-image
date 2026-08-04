'use strict';
const { defaultFetch } = require('./kie/client');

const VLM_URL = 'https://api.kie.ai/gpt-5-2/v1/chat/completions';

// Ask GPT-5.2 vision whether the generated image meets the expectation and is
// classroom-appropriate. Returns { pass, reason }; fails closed on any error.
async function checkImage({ apiKey, imageUrl, expectation, fetchImpl = defaultFetch } = {}) {
  const ask = `This image is meant to be: ${expectation}. It must be relevant, warm, and appropriate for a primary-school classroom. Reply with JSON only: {"pass": true|false, "reason": "one short sentence"}.`;
  const body = JSON.stringify({
    messages: [{ role: 'user', content: [
      { type: 'text', text: ask },
      { type: 'image_url', image_url: { url: imageUrl } },
    ] }],
  });
  try {
    const res = await fetchImpl(VLM_URL, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body });
    const json = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
    const text = json.choices && json.choices[0] && json.choices[0].message.content;
    const m = String(text || '').match(/\{[\s\S]*\}/);
    const verdict = JSON.parse(m ? m[0] : text);
    return { pass: verdict.pass === true, reason: verdict.reason || '' };
  } catch (e) {
    return { pass: false, reason: `gate error: ${e.message}` };
  }
}

module.exports = { checkImage };
