'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildLessonPlanHtml } = require('../template/build');
const ur = require('../fixtures/lesson-113087.ur.json');

test('urdu output localizes chrome labels (no ASCII chrome leak)', () => {
  const html = buildLessonPlanHtml(ur, { locale: 'ur' });
  // header chips + sub-labels should be Urdu, not the English chrome words
  for (const eng of ['>ID<', '>Subject<', '>Grade<', 'Resources', 'Target words', 'Check for understanding']) {
    assert.ok(!html.includes(eng), `English chrome label leaked: ${eng}`);
  }
  assert.match(html, /مضمون/); // "Subject" chip in Urdu
  assert.match(html, /وسائل/); // "Resources" in Urdu
});
