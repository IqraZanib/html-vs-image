'use strict';
const { buildShell, esc } = require('./shell');
const { getRenderer } = require('./sections');
const { resolveDirection } = require('./direction');

function buildHeader(meta) {
  const chips = [];
  if (meta.id) chips.push(`<span><b>ID</b> ${esc(meta.id)}</span>`);
  if (meta.subject) chips.push(`<span><b>Subject</b> ${esc(meta.subject)}</span>`);
  if (meta.grade) chips.push(`<span><b>Grade</b> ${esc(meta.grade)}</span>`);
  if (meta.classSize) chips.push(`<span><b>Class</b> ${esc(meta.classSize)}</span>`);
  if (meta.durationMin) chips.push(`<span><b>Time</b> ${esc(meta.durationMin)} min</span>`);
  if (meta.type) chips.push(`<span><b>Type</b> ${esc(meta.type)}</span>`);
  const sub = meta.subtitle ? `<div class="sub">${esc(meta.subtitle)}</div>` : '';
  return `<div class="lp-header"><h1>${esc(meta.title)}</h1>${sub}<div class="meta">${chips.join('')}</div></div>`;
}

function buildLessonPlanHtml(lesson, opts = {}) {
  const meta = lesson.meta || {};
  const locale = opts.locale || meta.locale || 'en';
  const { dir } = resolveDirection(locale);
  const ctx = { locale, dir };
  const headerHtml = buildHeader(meta);
  const bodyHtml = (lesson.sections || []).map((s) => getRenderer(s.type)(s, ctx)).join('');
  return buildShell({ headerHtml, bodyHtml, locale, title: meta.title || 'Lesson Plan' });
}

module.exports = { buildLessonPlanHtml };
