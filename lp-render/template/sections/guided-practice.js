'use strict';
const { esc } = require('../shell');
const { icon, hasIcon } = require('../icons');
const { sectionShell } = require('./index');

module.exports = function guidedPractice(section, _ctx) {
  const task = section.task ? `<p class="lead">${esc(section.task)}</p>` : '';
  const note = section.note ? `<div class="note"><div class="nt">Teacher note</div><p>${esc(section.note)}</p></div>` : '';
  const samples = (section.samples || []).length
    ? `<div class="grid5" style="margin-top:12px">` + section.samples.map((s) => {
        const top = s.icon && hasIcon(s.icon) ? `<div class="top">${icon(s.icon, 30)}</div>` : '<div class="top"></div>';
        return `<div class="scard">${top}<div class="s">${esc(s.text)}</div></div>`;
      }).join('') + `</div>` : '';
  const d = section.differentiation || {};
  const diff = (d.struggling || d.advanced)
    ? `<div class="two" style="margin-top:12px">` +
      (d.struggling ? `<div class="diff s"><div class="subh">For struggling students</div><p>${esc(d.struggling)}</p></div>` : '') +
      (d.advanced ? `<div class="diff a"><div class="subh">For advanced students</div><p>${esc(d.advanced)}</p></div>` : '') +
      `</div>` : '';
  return sectionShell(section, 'pencil', `<div class="panel">${task}${note}${samples}${diff}</div>`);
};
