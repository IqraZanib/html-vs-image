'use strict';
const { esc } = require('../shell');
const { icon } = require('../icons');
const { sectionShell } = require('./index');

module.exports = function assessment(section, ctx) {
  const L = (ctx && ctx.labels) || require('../labels').resolveLabels('en');
  let afl = '';
  if (section.afl && Array.isArray(section.afl.items)) {
    const note = section.afl.instruction ? `<div class="afl-note">${esc(section.afl.instruction)}</div>` : '';
    const rows = section.afl.items.map((it) => {
      const up = it.verdict === 'up';
      const cls = up ? 'up' : 'down';
      const glyph = up ? icon('thumbup', 18) : icon('thumbdown', 18);
      return `<div class="grow ${cls}"><div class="t">${esc(it.text)}</div><div class="vb ${up ? 'u' : 'd'}">${glyph}</div></div>`;
    }).join('');
    afl = `${note}${rows}`;
  }
  const exit = section.exitTicket ? `<div class="note"><div class="nt">${esc(L.exitTicket)}</div><p>${esc(section.exitTicket)}</p></div>` : '';
  const hw = section.homework ? `<div class="note" style="background:var(--grape-soft);border-color:var(--grape-bd);border-inline-start-color:var(--grape)"><div class="nt" style="color:var(--grape)">${esc(L.homework)}</div><p>${esc(section.homework)}</p></div>` : '';
  return sectionShell(section, 'checklist', `<div class="panel">${afl}${exit}${hw}</div>`, ctx);
};
