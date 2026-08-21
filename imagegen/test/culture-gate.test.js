'use strict';
// The gate exists because prompt wording alone did not hold: a Yemen lesson came back
// with a teacher in Western styling and nothing noticed.
const test = require('node:test');
const assert = require('node:assert');
const { checkCulture, cultureRulesFor } = require('../culture_gate');

const reply = (obj) => ({ statusCode: 200, body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(obj) } }] }) });

test('regions that declare rules are gated; ones that do not are not', () => {
  for (const r of ['ye', 'ke', 'tz', 'pk']) assert.ok(cultureRulesFor(r), `${r} should have culture rules`);
  assert.strictEqual(cultureRulesFor('zz'), null, 'an unknown region has no rules to enforce');
});

test('the Yemen rules name the things that actually went wrong', () => {
  const c = cultureRulesFor('ye');
  const all = c.require.concat(c.forbid).join(' ').toLowerCase();
  for (const needle of ['abaya', 'headscarf', 'western', 'cross']) {
    assert.ok(all.includes(needle), `Yemen rules should mention ${needle}`);
  }
});

test('a mismatched image fails in strict mode', async () => {
  const prev = process.env.LP_CULTURE_GATE; process.env.LP_CULTURE_GATE = 'strict';
  try {
    const r = await checkCulture({ apiKey: 'k', imageUrl: 'http://img/x.png', region: 'ye',
      fetchImpl: async () => reply({ pass: false, reason: 'teacher in a blazer, hair uncovered' }) });
    assert.strictEqual(r.pass, false);
    assert.strictEqual(r.checked, true);
    assert.match(r.reason, /blazer/);
  } finally { process.env.LP_CULTURE_GATE = prev; }
});

test('warn mode reports the mismatch but does not reject', async () => {
  const prev = process.env.LP_CULTURE_GATE; process.env.LP_CULTURE_GATE = 'warn';
  try {
    const r = await checkCulture({ apiKey: 'k', imageUrl: 'http://img/x.png', region: 'ye',
      fetchImpl: async () => reply({ pass: false, reason: 'Western dress' }) });
    assert.strictEqual(r.pass, true, 'warn mode must not reject');
    assert.strictEqual(r.rawPass, false, 'but the real verdict is still reported');
  } finally { process.env.LP_CULTURE_GATE = prev; }
});

test('an unverifiable check is reported as unchecked, never as a silent pass', async () => {
  const r = await checkCulture({ apiKey: 'k', imageUrl: 'http://img/x.png', region: 'ye',
    fetchImpl: async () => { throw new Error('network down'); } });
  assert.strictEqual(r.checked, false);
  assert.match(r.reason, /unavailable/);
});

test('off mode skips the call entirely', async () => {
  const prev = process.env.LP_CULTURE_GATE; process.env.LP_CULTURE_GATE = 'off';
  try {
    let called = false;
    const r = await checkCulture({ apiKey: 'k', imageUrl: 'x', region: 'ye', fetchImpl: async () => { called = true; return reply({ pass: true }); } });
    assert.strictEqual(called, false);
    assert.strictEqual(r.checked, false);
  } finally { process.env.LP_CULTURE_GATE = prev; }
});
