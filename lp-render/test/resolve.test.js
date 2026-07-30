'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveImages } = require('../images/resolve');
const { MemoryImageCache, cacheKey } = require('../images/cache');

// 'apple' and 'duck' are real library icons; 'zzz_nope' is not.
const photoRec = { dataUri: 'data:image/jpeg;base64,AAAA', title: 'T', creator: 'C', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' };
const lesson = (cards) => ({ meta: { title: 'x', locale: 'en' }, sections: [{ type: 'picture_cards', cards }] });
const resolved = (out) => out.lesson.sections[0].cards.map((c) => c && c._resolved);

test('kind:icon uses a library icon, or blank when none matches', async () => {
  const out = await resolveImages(lesson([{ query: 'apple', kind: 'icon' }, { query: 'zzz_nope', kind: 'icon' }]),
    { searchImpl: async () => { throw new Error('must not fetch'); } });
  assert.deepStrictEqual(resolved(out)[0], { mode: 'icon', iconName: 'apple' });
  assert.deepStrictEqual(resolved(out)[1], { mode: 'none' });
});

test('kind:auto prefers a library icon without fetching', async () => {
  let called = false;
  const out = await resolveImages(lesson([{ query: 'apple', kind: 'auto' }]),
    { searchImpl: async () => { called = true; return photoRec; } });
  assert.deepStrictEqual(resolved(out)[0], { mode: 'icon', iconName: 'apple' });
  assert.strictEqual(called, false);
});

test('kind:auto with no icon fetches a photo', async () => {
  const out = await resolveImages(lesson([{ query: 'zzz_nope', kind: 'auto' }]),
    { searchImpl: async () => photoRec });
  const r = resolved(out)[0];
  assert.strictEqual(r.mode, 'photo');
  assert.strictEqual(r.dataUri, photoRec.dataUri);
  assert.deepStrictEqual(r.attribution, { title: 'T', creator: 'C', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' });
});

test('kind:photo forces a photo even when an icon exists', async () => {
  const out = await resolveImages(lesson([{ query: 'apple', kind: 'photo' }]),
    { searchImpl: async () => photoRec });
  assert.strictEqual(resolved(out)[0].mode, 'photo');
});

test('kind:photo falls back to an icon when the fetch returns nothing', async () => {
  const out = await resolveImages(lesson([{ query: 'apple', kind: 'photo' }]),
    { searchImpl: async () => null });
  assert.deepStrictEqual(resolved(out)[0], { mode: 'icon', iconName: 'apple' });
});

test('kind:photo with no photo and no icon is blank', async () => {
  const out = await resolveImages(lesson([{ query: 'zzz_nope', kind: 'photo' }]),
    { searchImpl: async () => null });
  assert.deepStrictEqual(resolved(out)[0], { mode: 'none' });
});

test('a cache hit skips the network', async () => {
  const cache = new MemoryImageCache();
  await cache.set(cacheKey('wikimedia', 'cc0,pdm,by,by-sa', 'zzz_nope'), photoRec);
  let called = false;
  const out = await resolveImages(lesson([{ query: 'zzz_nope', kind: 'photo' }]),
    { cache, searchImpl: async () => { called = true; return null; } });
  assert.strictEqual(resolved(out)[0].mode, 'photo');
  assert.strictEqual(called, false);
});

test('never throws when the fetch throws (offline) and reports each card', async () => {
  const input = lesson([{ query: 'zzz_nope', kind: 'photo' }]);
  const out = await resolveImages(input, { searchImpl: async () => { throw new Error('offline'); } });
  assert.deepStrictEqual(resolved(out)[0], { mode: 'none' });
  assert.strictEqual(out.report.length, 1);
  assert.strictEqual(out.report[0].query, 'zzz_nope');
  assert.strictEqual(out.report[0].used, 'none');
  // input untouched
  assert.strictEqual('_resolved' in input.sections[0].cards[0], false);
});

test('skips malformed (null) cards without throwing, still resolves valid ones', async () => {
  const out = await resolveImages(lesson([null, { query: 'apple', kind: 'icon' }]),
    { searchImpl: async () => { throw new Error('must not fetch'); } });
  assert.strictEqual(out.lesson.sections[0].cards[0], null);
  assert.deepStrictEqual(resolved(out)[1], { mode: 'icon', iconName: 'apple' });
  assert.strictEqual(out.report.length, 1);
});
