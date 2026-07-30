'use strict';
const { esc } = require('../shell');
const { icon } = require('../icons');
const { sectionShell } = require('./index');

function card(c) {
  const r = c && c._resolved;
  if (!r || r.mode === 'none') return '';
  const cap = `<div class="pc-cap"><div class="pc-lab">${esc(c.label || '')}</div>`
    + (c.note ? `<div class="pc-note">${esc(c.note)}</div>` : '') + '</div>';
  if (r.mode === 'photo') {
    return `<div class="pcard"><img src="${r.dataUri}" alt="${esc(c.label || '')}">${cap}</div>`;
  }
  if (r.mode === 'icon') {
    return `<div class="pcard icon"><div class="pc-ic">${icon(r.iconName, 56)}</div>${cap}</div>`;
  }
  return '';
}

module.exports = function pictureCards(section, ctx) {
  const cards = (section.cards || []).map(card).join('');
  return sectionShell(section, 'palette', `<div class="panel"><div class="pcards">${cards}</div></div>`, ctx);
};
