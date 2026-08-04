'use strict';
const { resolveRegion } = require('./regions');
const { characterSpec } = require('../characters');
const { pick } = require('./templates');

function resolvePrompt({ category, subject, block, region = 'pk', grade } = {}) {
  const tmpl = pick(category, subject);
  if (!tmpl) throw new Error(`no prompt template for category "${category}"`);
  const reg = resolveRegion(region);
  const chars = characterSpec(block, region);
  return tmpl({ block, subject, grade, region: reg, chars, topic: (block && block.text) });
}
module.exports = { resolvePrompt };
