'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildLessonPlanHtml } = require('../template/build');

const withPhoto = {
  meta: { title: 'x', locale: 'en' },
  sections: [{ type: 'picture_cards', cards: [
    { query: 'duck', label: 'Duck', _resolved: { mode: 'photo', dataUri: 'data:image/jpeg;base64,AA',
      attribution: { title: 'A Duck', creator: 'Jo', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' } } },
  ] }],
};

test('renders a credits footer when photos have attribution', () => {
  const html = buildLessonPlanHtml(withPhoto, { locale: 'en' });
  assert.match(html, /Photo credits/);
  assert.match(html, /A Duck/);
  assert.match(html, /Jo/);
  assert.match(html, /CC by 2\.0/);
});

test('no credits footer when there are no photos', () => {
  const noPhoto = { meta: { title: 'x', locale: 'en' }, sections: [{ type: 'objectives', items: [{ text: 'a' }] }] };
  const html = buildLessonPlanHtml(noPhoto, { locale: 'en' });
  assert.doesNotMatch(html, /Photo credits/);
});

test('dedups identical credits shared across two cards', () => {
  const attribution = { title: 'A Duck', creator: 'Jo', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' };
  const twoCards = {
    meta: { title: 'x', locale: 'en' },
    sections: [{ type: 'picture_cards', cards: [
      { query: 'duck', label: 'Duck', _resolved: { mode: 'photo', dataUri: 'data:image/jpeg;base64,AA', attribution } },
      { query: 'duck2', label: 'Duck2', _resolved: { mode: 'photo', dataUri: 'data:image/jpeg;base64,BB', attribution: { ...attribution } } },
    ] }],
  };
  const html = buildLessonPlanHtml(twoCards, { locale: 'en' });
  const count = (html.match(/A Duck/g) || []).length;
  assert.strictEqual(count, 1);
});
