const { test } = require('node:test');
const assert = require('node:assert');
const { renderTemplateHtml } = require('../src/template');
const { validateHtml } = require('../src/validateHtml');

test('renderTemplateHtml produces self-contained HTML for English', () => {
  const html = renderTemplateHtml({ subject: 'Science', grade: 3, language: 'English', topic: 'the water cycle' });
  assert.ok(validateHtml(html).ok, 'should pass the self-contained validator');
  assert.match(html, /Science — Grade 3/);
  assert.match(html, /the water cycle/);
  assert.match(html, /WARM-UP/);
});

test('renderTemplateHtml uses RTL + Nastaliq for Urdu', () => {
  const html = renderTemplateHtml({ subject: 'Math', grade: 1, language: 'Urdu', topic: 'counting' });
  assert.ok(validateHtml(html).ok);
  assert.match(html, /direction:rtl/);
  assert.match(html, /Noto Nastaliq Urdu/);
});

test('renderTemplateHtml uses Naskh for Sindhi and includes the topic', () => {
  const html = renderTemplateHtml({ subject: 'Science', grade: 2, language: 'Sindhi', topic: 'living things' });
  assert.ok(validateHtml(html).ok);
  assert.match(html, /Noto Naskh Arabic/);
  assert.match(html, /living things/);
});

test('renderTemplateHtml escapes angle brackets in the topic', () => {
  const html = renderTemplateHtml({ subject: 'Math', grade: 1, language: 'English', topic: 'a < b' });
  assert.ok(!html.includes('a < b'));
  assert.match(html, /a &lt; b/);
});
