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

function collectCredits(lesson) {
  const out = [];
  for (const s of (lesson.sections || [])) {
    if (!s || s.type !== 'picture_cards' || !Array.isArray(s.cards)) continue;
    for (const c of s.cards) {
      const a = c && c._resolved && c._resolved.mode === 'photo' && c._resolved.attribution;
      if (a) out.push(a);
    }
  }
  return out;
}

function creditsFooter(lesson, labels) {
  const credits = collectCredits(lesson);
  if (!credits.length) return '';
  const items = credits.map((a) =>
    `${esc(a.title || '')} — ${esc(a.creator || 'unknown')} — ${esc(a.license || '')} (${esc(a.source || '')})`
  ).join('  ·  ');
  return `<div class="credits" style="font-size:10px;color:#9aa3b5;line-height:1.6;`
    + `border-top:1px solid #e5e9f0;padding-top:10px;margin-top:18px">`
    + `<b>${esc(labels.photoCredits)}:</b> ${items}</div>`;
}

function buildLessonPlanHtml(lesson, opts = {}) {
  const meta = lesson.meta || {};
  const locale = opts.locale || meta.locale || 'en';
  const { dir } = resolveDirection(locale);
  const labels = resolveLabels(locale);
  const ctx = { locale, dir, labels };
  const headerHtml = buildHeader(meta, labels);
  const sectionsHtml = (lesson.sections || []).map((s) => getRenderer(s.type)(s, ctx)).join('');
  const bodyHtml = sectionsHtml + creditsFooter(lesson, labels);
  return buildShell({ headerHtml, bodyHtml, locale, title: meta.title || 'Lesson Plan' });
}

module.exports = { buildLessonPlanHtml };
