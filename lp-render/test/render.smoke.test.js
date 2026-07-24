'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { htmlToPdf, closeBrowser } = require('../render/html-to-pdf');

// Skips when no Chromium is resolvable (e.g. CI without a browser).
test('htmlToPdf yields a %PDF- buffer', async (t) => {
  let buf;
  try {
    buf = await htmlToPdf('<!DOCTYPE html><html><body><h1>Hi</h1></body></html>');
  } catch (e) {
    if (/executable|Chromium|browserType|ENOENT/i.test(String(e.message))) {
      t.skip(`no Chromium available: ${e.message}`);
      return;
    }
    throw e;
  } finally {
    await closeBrowser();
  }
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 1000);
  assert.strictEqual(buf.subarray(0, 5).toString('latin1'), '%PDF-');
});
