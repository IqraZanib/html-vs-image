'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildShell, esc } = require('../template/shell');

test('esc escapes html-significant characters', () => {
  assert.strictEqual(esc('a & <b> "c"'), 'a &amp; &lt;b&gt; &quot;c&quot;');
});

test('shell is a self-contained A4 doc with dir + fonts', () => {
  const html = buildShell({ headerHtml: '<h1>H</h1>', bodyHtml: '<p>B</p>', locale: 'ur', title: 'T' });
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /@font-face/);
  assert.match(html, /@page/);
  assert.match(html, /break-inside/);
  assert.ok(html.includes('<h1>H</h1>') && html.includes('<p>B</p>'));
  assert.doesNotMatch(html, /<img|data:image|file:\/\/|https?:\/\/(?!www\.w3)/);
});
