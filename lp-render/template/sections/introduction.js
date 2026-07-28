'use strict';
const { esc } = require('../shell');
const { icon, hasIcon } = require('../icons');
const { sectionShell } = require('./index');

module.exports = function introduction(section, ctx) {
  const greet = section.greeting ? `<div class="lead" style="color:#1f7fb8;margin-bottom:10px">${esc(section.greeting)}</div>` : '';
  const stories = (section.stories || []).map((s) => {
    const pic = s.icon && hasIcon(s.icon) ? `<div class="pic">${icon(s.icon, 40)}</div>` : '';
    const label = s.label ? `<b>${esc(s.label)}:</b> ` : '';
    return `<div class="story">${pic}<div class="bubble">${label}${esc(s.text)}</div></div>`;
  }).join('');
  return sectionShell(section, 'rocket', `<div class="panel">${greet}${stories}</div>`, ctx);
};
