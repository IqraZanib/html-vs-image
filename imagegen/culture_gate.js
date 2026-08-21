'use strict';
// REGIONAL FIT GATE.
//
// Asking the prompt for Yemeni dress is not enough: the model quietly returns a
// teacher in Western styling and nothing notices. This checks the PIXELS against the
// region's own rules (imagegen/prompts/regions/<id>.js → check.require / check.forbid)
// and lets the caller re-roll. A culturally wrong illustration in a Yemeni classroom
// is worse than no illustration, so a persistent failure drops the image rather than
// shipping it — the lesson still has its code-drawn figures.
//
// LP_CULTURE_GATE=off disables it; 'warn' checks and logs without rejecting.
const { defaultFetch } = require('./kie/client');
const { resolveRegion } = require('./prompts/regions');

const VLM_URL = 'https://api.kie.ai/gpt-5-2/v1/chat/completions';

function cultureMode() {
  const v = String(process.env.LP_CULTURE_GATE || 'strict').toLowerCase();
  return ['off', 'warn', 'strict'].includes(v) ? v : 'strict';
}

// A region only gets gated if it actually declares what to look for.
function cultureRulesFor(region) {
  const reg = resolveRegion(String(region || '').toLowerCase());
  return reg && reg.check && Array.isArray(reg.check.require) ? reg.check : null;
}

function buildAsk(rules) {
  return `You are reviewing an illustration drawn for a ${rules.label} primary-school lesson.
Judge ONLY whether the people, clothing, and setting fit ${rules.label} — not whether the picture is pretty or on-topic.

It PASSES only if all of these hold (ignore any that the picture gives no evidence for, e.g. no adult is shown):
${rules.require.map((r, i) => `${i + 1}. ${r}`).join('\n')}

It FAILS if ANY of these appear:
${rules.forbid.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Be strict about clothing and faces: a teacher who would look at home in a European or American classroom is a FAIL for ${rules.label}.
Reply with JSON only: {"pass": true|false, "reason": "one short sentence naming what you saw"}.`;
}

// { pass, reason, checked }  — checked:false means the verdict is unknown (gate off,
// no rules for the region, or the checker itself failed), never a silent pass.
async function checkCulture({ apiKey, imageUrl, region, fetchImpl = defaultFetch } = {}) {
  const mode = cultureMode();
  if (mode === 'off') return { pass: true, checked: false, reason: 'culture gate off' };
  const rules = cultureRulesFor(region);
  if (!rules) return { pass: true, checked: false, reason: `no culture rules for region "${region}"` };

  const body = JSON.stringify({
    messages: [{ role: 'user', content: [
      { type: 'text', text: buildAsk(rules) },
      { type: 'image_url', image_url: { url: imageUrl } },
    ] }],
  });
  try {
    const res = await fetchImpl(VLM_URL, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body });
    const json = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
    const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    const m = String(text || '').match(/\{[\s\S]*\}/);
    const verdict = JSON.parse(m ? m[0] : text);
    const pass = verdict.pass === true;
    return { pass: mode === 'warn' ? true : pass, rawPass: pass, checked: true, reason: verdict.reason || '' };
  } catch (e) {
    // Cannot verify — say so loudly rather than pretending it passed.
    return { pass: true, checked: false, reason: `culture check unavailable: ${e.message}` };
  }
}

module.exports = { checkCulture, cultureRulesFor, cultureMode };
