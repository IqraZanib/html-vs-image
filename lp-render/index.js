'use strict';
const { validateLesson } = require('./schema');
const { buildLessonPlanHtml } = require('./template/build');
const { htmlToPdf, closeBrowser } = require('./render/html-to-pdf');
const { resolveImages } = require('./images/resolve');

async function renderLessonPlanPdf(lesson, opts = {}) {
  const { ok, errors } = validateLesson(lesson);
  if (!ok) throw new Error(`Invalid lesson: ${errors.join('; ')}`);
  const html = buildLessonPlanHtml(lesson, opts);
  // Default to content-fit so the PDF has no empty space; callers can pass
  // pageMode: 'a4' for fixed A4 pages.
  return htmlToPdf(html, { pageMode: opts.pageMode || 'fit', pdfOptions: { printBackground: true } });
}

module.exports = { renderLessonPlanPdf, resolveImages, buildLessonPlanHtml, validateLesson, htmlToPdf, closeBrowser };
