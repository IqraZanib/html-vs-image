'use strict';
const { esc } = require('../shell');
const { sectionShell } = require('./index');

module.exports = function objectives(section, _ctx) {
  const items = (section.items || []).map((it) => {
    const tag = it.tag ? `<span class="tag">${esc(it.tag)}</span>` : '';
    return `<li>${esc(it.text)}${tag}</li>`;
  }).join('');
  return sectionShell(section, 'target', `<div class="panel"><ul class="list">${items}</ul></div>`);
};
