'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { validateLesson } = require('../schema');
const { buildLessonPlanHtml } = require('../template/build');

function load(f) { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', f), 'utf8')); }

test('en fixture is valid and renders key content', () => {
  const lesson = load('lesson-113087.en.json');
  assert.strictEqual(validateLesson(lesson).ok, true);
  const html = buildLessonPlanHtml(lesson, {});
  assert.match(html, /Descriptive Sentences/);
  assert.match(html, /My name is Ali\./);
  assert.match(html, /Thumbs/i);
});

test('ur fixture is valid, rtl, and free of raster/external images', () => {
  const lesson = load('lesson-113087.ur.json');
  assert.strictEqual(validateLesson(lesson).ok, true);
  const html = buildLessonPlanHtml(lesson, {});
  assert.match(html, /dir="rtl"/);
  assert.doesNotMatch(html, /<img|data:image|file:\/\/|https?:\/\/(?!www\.w3)/);
});
