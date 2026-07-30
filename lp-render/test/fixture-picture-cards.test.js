'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateLesson } = require('../schema');
const { resolveImages } = require('../images/resolve');
const { buildLessonPlanHtml } = require('../template/build');
const lesson = require('../fixtures/lesson-picture-cards.en.json');

test('sample picture_cards fixture is valid', () => {
  assert.strictEqual(validateLesson(lesson).ok, true);
});

test('sample fixture resolves and renders (icons offline, photos stubbed)', async () => {
  const { lesson: enriched, report } = await resolveImages(lesson, { searchImpl: async () =>
    ({ dataUri: 'data:image/jpeg;base64,QQ', title: 'T', creator: 'C', license: 'CC by 2.0', source: 'flickr', sourceUrl: 'http://l' }) });
  assert.ok(report.length >= 1);
  const html = buildLessonPlanHtml(enriched, { locale: 'en' });
  assert.match(html, /<svg|data:image\/jpeg;base64,/);
});
