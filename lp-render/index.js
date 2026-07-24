'use strict';
const { validateLesson } = require('./schema');
const { buildLessonPlanHtml } = require('./template/build');
const { htmlToPdf, closeBrowser } = require('./render/html-to-pdf');

async function renderLessonPlanPdf(lesson, opts = {}) {
  const { ok, errors } = validateLesson(lesson);
  if (!ok) throw new Error(`Invalid lesson: ${errors.join('; ')}`);
  const html = buildLessonPlanHtml(lesson, opts);
  return htmlToPdf(html, { pdfOptions: { format: 'A4', printBackground: true } });
}

module.exports = { renderLessonPlanPdf, buildLessonPlanHtml, validateLesson, htmlToPdf, closeBrowser };
