'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildLessonPlanHtml } = require('../template/build');

const lesson = {
  meta: { id: '113087', subject: 'English', grade: 'One', locale: 'en',
          title: 'Descriptive Sentences', durationMin: 40, classSize: 23, type: 'Comprehension' },
  sections: [
    { type: 'objectives', time: '2 min', items: [{ text: 'Use 5 words', tag: 'Apply' }] },
    { type: 'assessment', time: '3 min', afl: { instruction: 'Thumbs?', items: [{ text: 'x', verdict: 'up' }] } },
  ],
};

test('build produces a full doc with header meta and all sections', () => {
  const html = buildLessonPlanHtml(lesson, { locale: 'en' });
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /Descriptive Sentences/);
  assert.match(html, /113087/); assert.match(html, /English/); assert.match(html, /23/);
  assert.match(html, /Use 5 words/);
  assert.match(html, /Thumbs\?/);
});

test('urdu build sets rtl and contains no raster/external images', () => {
  const ur = buildLessonPlanHtml({ ...lesson, meta: { ...lesson.meta, locale: 'ur' } }, {});
  assert.match(ur, /dir="rtl"/);
  assert.doesNotMatch(ur, /<img|data:image|file:\/\//);
});
