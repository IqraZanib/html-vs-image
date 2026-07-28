'use strict';
const test = require('node:test');
const assert = require('node:assert');
const api = require('../index');

test('exposes the public surface', () => {
  for (const fn of ['renderLessonPlanPdf', 'buildLessonPlanHtml', 'validateLesson', 'htmlToPdf', 'closeBrowser']) {
    assert.strictEqual(typeof api[fn], 'function', `missing ${fn}`);
  }
});

test('renderLessonPlanPdf throws a clear error on invalid input (before touching a browser)', async () => {
  await assert.rejects(
    () => api.renderLessonPlanPdf({ sections: [] }),
    (err) => /meta/.test(err.message)
  );
});
