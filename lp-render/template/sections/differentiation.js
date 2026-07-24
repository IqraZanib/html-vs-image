'use strict';
const { esc } = require('../shell');
const { sectionShell } = require('./index');

module.exports = function differentiation(section, ctx) {
  const L = (ctx && ctx.labels) || require('../labels').resolveLabels('en');
  const s = section.struggling ? `<div class="diff s"><div class="subh">${esc(L.struggling)}</div><p>${esc(section.struggling)}</p></div>` : '';
  const a = section.advanced ? `<div class="diff a"><div class="subh">${esc(L.advanced)}</div><p>${esc(section.advanced)}</p></div>` : '';
  return sectionShell(section, 'ladder', `<div class="two">${s}${a}</div>`, ctx);
};
