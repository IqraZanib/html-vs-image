'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { renderLessonPlanPdf, htmlToPdf, closeBrowser } = require('../index');
const en = require('../fixtures/lesson-113087.en.json');

// Skips cleanly when no Chromium is resolvable (same policy as render.smoke).
function isNoBrowser(e) {
  return /executable|Chromium|browserType|ENOENT/i.test(String(e && e.message));
}

// The tallest MediaBox height across all pages, in PDF points.
function tallestPageHeightPt(buf) {
  const heights = [];
  const re = /\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+[\d.]+\s+([\d.]+)\s*\]/g;
  let m;
  while ((m = re.exec(buf.toString('latin1')))) heights.push(parseFloat(m[1]));
  return heights.length ? Math.max(...heights) : 0;
}

test('renderLessonPlanPdf defaults to a single content-fit page (no empty space)', async (t) => {
  let buf;
  try {
    buf = await renderLessonPlanPdf(en, { locale: 'en' });
  } catch (e) {
    if (isNoBrowser(e)) { t.skip(`no Chromium: ${e.message}`); return; }
    throw e;
  } finally {
    await closeBrowser();
  }
  assert.strictEqual(buf.subarray(0, 5).toString('latin1'), '%PDF-');
  // A single content-tall page is much taller than one A4 page (842pt),
  // i.e. the content was not paginated into fixed pages with bottom gaps.
  const h = tallestPageHeightPt(buf);
  assert.ok(h > 842, `expected one content-tall page, got tallest height ${h}pt`);
});

test('pageMode "a4" still yields fixed A4 pages (rumi-compatible primitive)', async (t) => {
  let buf;
  try {
    buf = await htmlToPdf('<!DOCTYPE html><html><body><h1>Hi</h1></body></html>', { pageMode: 'a4' });
  } catch (e) {
    if (isNoBrowser(e)) { t.skip(`no Chromium: ${e.message}`); return; }
    throw e;
  } finally {
    await closeBrowser();
  }
  const h = tallestPageHeightPt(buf);
  // A4 portrait height is ~842pt; allow rounding.
  assert.ok(h > 700 && h < 900, `expected ~A4 page height, got ${h}pt`);
});
