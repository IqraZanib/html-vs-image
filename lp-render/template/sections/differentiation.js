'use strict';
const { esc } = require('../shell');
const { sectionShell } = require('./index');

module.exports = function differentiation(section, _ctx) {
  const s = section.struggling ? `<div class="diff s"><div class="subh">For struggling students</div><p>${esc(section.struggling)}</p></div>` : '';
  const a = section.advanced ? `<div class="diff a"><div class="subh">For advanced students</div><p>${esc(section.advanced)}</p></div>` : '';
  return sectionShell(section, 'ladder', `<div class="two">${s}${a}</div>`);
};
