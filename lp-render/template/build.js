'use strict';
const { buildShell, esc } = require('./shell');
const { getRenderer } = require('./sections');
const { resolveDirection } = require('./direction');
const { resolveLabels } = require('./labels');

function buildHeader(meta, labels) {
  const chips = [];
  if (meta.id) chips.push(`<span><b>${esc(labels.chips.id)}</b> ${esc(meta.id)}</span>`);
  if (meta.subject) chips.push(`<span><b>${esc(labels.chips.subject)}</b> ${esc(meta.subject)}</span>`);
  if (meta.grade) chips.push(`<span><b>${esc(labels.chips.grade)}</b> ${esc(meta.grade)}</span>`);
  if (meta.classSize) chips.push(`<span><b>${esc(labels.chips.class)}</b> ${esc(meta.classSize)}</span>`);
  if (meta.durationMin) chips.push(`<span><b>${esc(labels.chips.time)}</b> ${esc(meta.durationMin)} ${esc(labels.minUnit)}</span>`);
  if (meta.type) chips.push(`<span><b>${esc(labels.chips.type)}</b> ${esc(meta.type)}</span>`);
  const sub = meta.subtitle ? `<div class="sub">${esc(meta.subtitle)}</div>` : '';
  return `<div class="lp-header"><h1>${esc(meta.title)}</h1>${sub}<div class="meta">${chips.join('')}</div></div>`;
}

function buildLessonPlanHtml(lesson, opts = {}) {
  const meta = lesson.meta || {};
  const locale = opts.locale || meta.locale || 'en';
  const { dir } = resolveDirection(locale);
  const labels = resolveLabels(locale);
  const ctx = { locale, dir, labels };
  const headerHtml = buildHeader(meta, labels);
  const bodyHtml = (lesson.sections || []).map((s) => getRenderer(s.type)(s, ctx)).join('');
  return buildShell({ headerHtml, bodyHtml, locale, title: meta.title || 'Lesson Plan' });
}

module.exports = { buildLessonPlanHtml };
