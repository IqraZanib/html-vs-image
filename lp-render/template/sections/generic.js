'use strict';
const { esc } = require('../shell');
const { sectionShell } = require('./index');

module.exports = function generic(section, ctx) {
  const items = Array.isArray(section.items) && section.items.length
    ? `<ul class="list">${section.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const body = section.body ? `<p class="lead">${esc(section.body)}</p>` : '';
  return sectionShell(section, 'lightbulb', `<div class="panel">${body}${items}</div>`, ctx);
};
