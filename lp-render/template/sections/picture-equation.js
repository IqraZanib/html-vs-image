'use strict';
const { esc } = require('../shell');
const { icon, hasIcon } = require('../icons');
const { sectionShell } = require('./index');

const MAX_REPEAT = 20; // guard against absurd counts

function group(iconName, n) {
  const count = Math.max(0, Math.min(MAX_REPEAT, Number(n) || 0));
  const one = hasIcon(iconName) ? icon(iconName, 32) : '';
  return `<span class="eq-group">${one.repeat(count)}</span>`;
}

// Renders each equation as counted objects: [a icons] op [b icons] = [result icons],
// with the numeric sentence beneath. Great for concrete take-away/add-up visuals.
module.exports = function pictureEquation(section, ctx) {
  const eqs = (section.equations || []).map((e) => {
    const op = e.op === '+' ? '+' : '−'; // default to minus (−)
    const ic = e.icon && hasIcon(e.icon) ? e.icon : 'apple';
    const caption = `${Number(e.a) || 0} ${op} ${Number(e.b) || 0} = ${Number(e.result) || 0}`;
    return `<div class="eq">` +
      group(ic, e.a) +
      `<span class="eq-op">${op}</span>` +
      group(ic, e.b) +
      `<span class="eq-op">=</span>` +
      group(ic, e.result) +
      `</div>` +
      `<div class="eq-cap">${esc(caption)}</div>`;
  }).join('');
  return sectionShell(section, 'star', `<div class="panel">${eqs}</div>`, ctx);
};
