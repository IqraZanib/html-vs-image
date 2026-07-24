'use strict';
const { esc } = require('../shell');
const { sectionShell } = require('./index');

module.exports = function materials(section, _ctx) {
  const res = (section.resources || []).map((t) => `<li>${esc(t)}</li>`).join('');
  const words = (section.targetWords || []).length
    ? `<div class="subh" style="margin-top:10px">Target words</div>` +
      `<ul class="list"><li>${section.targetWords.map(esc).join(' · ')}</li></ul>` : '';
  const note = section.note
    ? `<div class="note"><div class="nt">${esc(section.note.title || 'Teacher note')}</div>` +
      `<p>${esc(section.note.body)}</p></div>` : '';
  const inner = `<div class="panel"><div class="subh">Resources</div>` +
    `<ul class="list">${res}</ul>${words}${note}</div>`;
  return sectionShell(section, 'toolbox', inner);
};
