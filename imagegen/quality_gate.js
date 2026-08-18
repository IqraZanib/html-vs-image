'use strict';
const { defaultFetch } = require('./kie/client');

const VLM_URL = 'https://api.kie.ai/gpt-5-2/v1/chat/completions';

// Ask GPT-5.2 vision whether the generated image is CORRECT for teaching and
// safe against human values. Returns { pass, reason }; fails closed on any
// error. `policy` is extra reviewer guidance (read from RULES.md by the caller).
async function checkImage({ apiKey, imageUrl, expectation, policy = '', fetchImpl = defaultFetch } = {}) {
  // Research/debug knob: KIE_GATE_OFF=1 approves everything so a run shows each
  // model's RAW output (used for model bake-offs). Never set in production.
  if (process.env.KIE_GATE_OFF === '1') return { pass: true, reason: 'gate off (KIE_GATE_OFF=1)' };
  const ask = `You are a strict reviewer of teaching images for a school classroom.
The image is intended to show: ${expectation}
Approve (pass:true) ONLY if EVERY check passes:
1. Correctness — it accurately depicts the intended subject. Nothing is wrong, mislabeled, or anatomically/factually incorrect. Any text or labels in the image must be spelled correctly and point to the right part.
2. Teaching value — it is clear, relevant and genuinely useful for teaching this concept to students.
3. Human values — it contains NOTHING against human values: no violence, gore, weapons, blood, nudity or sexual content, hate/discriminatory symbols, harmful stereotypes, frightening imagery, substance use, or culturally/religiously offensive content. It is respectful, safe and inclusive.
${policy ? 'Additional policy from the rules file:\n' + policy + '\n' : ''}If you are uncertain about ANY check, fail. Reply with JSON only: {"pass": true|false, "reason": "one short sentence"}.`;
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
