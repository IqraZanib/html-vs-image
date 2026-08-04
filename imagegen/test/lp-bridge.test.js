'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveGenCards, collectGenCards } = require('../lp-bridge');

const lesson = () => ({
  meta: { subject: 'Science', grade: '5', region: 'pk', title: 't', locale: 'en' },
  sections: [
    { type: 'objectives', items: [{ text: 'x' }] },
    { type: 'picture_cards', cards: [
      { kind: 'gen', category: 'labeled_diagram', query: 'the breathing system with labels', label: 'Breathing system' },
      { kind: 'icon', query: 'apple' },
    ] },
  ],
});

test('collectGenCards finds only kind:gen cards', () => {
  const g = collectGenCards(lesson());
  assert.strictEqual(g.length, 1);
  assert.strictEqual(g[0].label, 'Breathing system');
});

test('resolveGenCards embeds a data URI on the gen card (stubbed generate + download)', async () => {
  const resolveImpl = async (segment) => {
    assert.strictEqual(segment.blocks[0].type, 'DIAGRAM'); // labeled_diagram → DIAGRAM block
    return { images: [{ blockType: 'DIAGRAM', asset: { url: 'http://img/breath.png', model: 'seedream-v4' } }], report: [] };
  };
  const downloadImpl = async () => ({ dataUri: 'data:image/png;base64,QUJD', bytes: 3 });
  const { lesson: out } = await resolveGenCards(lesson(), { apiKey: 'k', resolveImpl, downloadImpl });
  const card = out.sections[1].cards[0];
  assert.strictEqual(card._resolved.mode, 'photo');
  assert.match(card._resolved.dataUri, /^data:image\/png;base64,/);
  assert.strictEqual(card._resolved.attribution.creator, 'seedream-v4');
  // non-gen card left untouched
  assert.strictEqual(out.sections[1].cards[1]._resolved, undefined);
});

test('a gen card whose ladder/gate failed resolves to none (deterministic fallback)', async () => {
  const resolveImpl = async () => ({ images: [{ blockType: 'DIAGRAM', asset: null, reason: 'fallback' }], report: [] });
  const { lesson: out } = await resolveGenCards(lesson(), { apiKey: 'k', resolveImpl, downloadImpl: async () => ({ dataUri: 'x' }) });
  assert.deepStrictEqual(out.sections[1].cards[0]._resolved, { mode: 'none' });
});

test('input lesson is not mutated', async () => {
  const input = lesson();
  const resolveImpl = async () => ({ images: [{ asset: { url: 'http://x', model: 'm' } }], report: [] });
  await resolveGenCards(input, { apiKey: 'k', resolveImpl, downloadImpl: async () => ({ dataUri: 'd' }) });
  assert.strictEqual('_resolved' in input.sections[1].cards[0], false);
});
