'use strict';
const { esc } = require('../shell');
const { icon } = require('../icons');
const { SECTION_ACCENT } = require('../tokens');

// Shared coloured-header wrapper every renderer uses.
function sectionShell(section, iconName, innerHtml, ctx) {
  const accent = SECTION_ACCENT[section.type] || '--ink';
  const localizedTitle = ctx && ctx.labels ? ctx.labels.titles[section.type] : undefined;
  const title = esc(section.title || localizedTitle || defaultTitle(section.type));
  const time = section.time ? `<span class="time">${esc(section.time)}</span>` : '';
  return `<section class="section"><div class="sec-head">` +
    `<div class="sec-disc" style="background:var(${accent})">${icon(iconName, 22)}</div>` +
    `<div class="sec-title">${title}</div>${time}</div>${innerHtml}</section>`;
}

const DEFAULT_TITLES = {
  objectives: 'Objectives', materials: 'Resources & Support', introduction: 'Introduction',
  explore: 'Explore', explanation: 'Explanation & Teaching', picture_equation: 'See It — Picture Maths',
  guided_practice: 'Guided Practice',
  assessment: 'Assessment & Wrap-up', differentiation: 'Differentiation', generic: 'Section',
};
function defaultTitle(type) { return DEFAULT_TITLES[type] || 'Section'; }

// Export sectionShell/defaultTitle before requiring the child renderers below:
// each child does `require('./index')` for sectionShell, and since this module
// is still mid-execution (circular require), only what's been assigned to
// module.exports so far is visible to them.
module.exports = { sectionShell, defaultTitle };

const RENDERERS = {
  objectives: require('./objectives'),
  materials: require('./materials'),
  introduction: require('./introduction'),
  explanation: require('./explanation'),
  picture_equation: require('./picture-equation'),
  guided_practice: require('./guided-practice'),
  assessment: require('./assessment'),
  differentiation: require('./differentiation'),
  generic: require('./generic'),
};

function getRenderer(type) {
  return RENDERERS[type] || RENDERERS.generic;
}

module.exports.getRenderer = getRenderer;
module.exports.RENDERERS = RENDERERS;
