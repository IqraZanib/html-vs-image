'use strict';
const { esc } = require('../shell');
const { icon, hasIcon } = require('../icons');
const { sectionShell } = require('./index');

function wordWall(items) {
  if (!items || !items.length) return '';
  const cards = items.map((w) => {
    const disc = w.icon && hasIcon(w.icon) ? `<div class="disc">${icon(w.icon, 30)}</div>` : '';
    return `<div class="wcard">${disc}<div class="w">${esc(w.word)}</div><div class="m">${esc(w.meaning)}</div></div>`;
  }).join('');
  return `<div class="grid5">${cards}</div>`;
}

function formula(f) {
  if (!f || !Array.isArray(f.parts) || !f.parts.length) return '';
  const bits = [];
  f.parts.forEach((p, i) => {
    if (i > 0) bits.push('<div class="plus">+</div>');
    bits.push(`<div class="fb"><div class="l">${esc(p.label || '')}</div><div class="v">${esc(p.value || '')}</div></div>`);
  });
  return `<div class="formula">${bits.join('')}</div>`;
}

function steps(list) {
  return (list || []).map((s) =>
    `<div class="step"><div class="badge">${esc(s.label)}</div><div class="body">${esc(s.body)}</div></div>`
  ).join('');
}

function cfu(list, L) {
  if (!list || !list.length) return '';
  const cards = list.map((c) =>
    `<div class="qa"><div class="q">${esc(c.q)}</div><div class="a">${esc(c.a)}</div></div>`
  ).join('');
  return `<div class="subh" style="margin-top:14px">${esc(L.cfu)}</div><div class="qa3">${cards}</div>`;
}

module.exports = function explanation(section, ctx) {
  const L = (ctx && ctx.labels) || require('../labels').resolveLabels('en');
  const inner = `<div class="panel">${wordWall(section.wordWall)}${formula(section.formula)}` +
    `${steps(section.steps)}${cfu(section.cfu, L)}</div>`;
  return sectionShell(section, 'lightbulb', inner, ctx);
};
