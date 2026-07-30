'use strict';
const test = require('node:test');
const assert = require('node:assert');
const lp = require('../index');

test('exports resolveImages', () => {
  assert.strictEqual(typeof lp.resolveImages, 'function');
});

test('resolveImages output renders an embedded photo in the HTML', async () => {
  const lesson = { meta: { title: 't', locale: 'en' }, sections: [
    { type: 'picture_cards', cards: [{ query: 'zzz_nope', kind: 'photo', label: 'Thing' }] },
  ] };
  const { lesson: enriched } = await lp.resolveImages(lesson, {
    searchImpl: async () => ({ dataUri: 'data:image/jpeg;base64,ZZ', title: 'T', creator: 'C', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' }),
  });
  const html = lp.buildLessonPlanHtml(enriched, { locale: 'en' });
  assert.match(html, /data:image\/jpeg;base64,ZZ/);
  assert.match(html, /Photo credits/);
});
