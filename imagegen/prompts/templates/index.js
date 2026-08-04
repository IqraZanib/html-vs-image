'use strict';
const S = require('../scaffold');

function charactersLine(spec) {
  if (!spec.characters.length) return '';
  return 'showing ' + spec.characters.map((c) => `${c.name} (${c.appearance})`).join(' and ');
}

// ctx = { block, subject, grade, region, chars, topic }  (chars = characterSpec output)
const TEMPLATES = {
  'decorative_scene.default': (ctx) => S.join([
    S.SCENE_STYLE,
    `Scene: ${ctx.block.text || ctx.topic || 'a friendly classroom scene'}`,
    charactersLine(ctx.chars),
    `set in ${ctx.region.setting}`,
    ctx.region.note,
    S.QUALITY,
    S.NEGATIVE_SCENE,
  ]),
  'labeled_diagram.default': (ctx) => S.join([
    S.DIAGRAM_STYLE,
    `Diagram of: ${ctx.block.text || ctx.topic}`,
    ctx.grade ? `for grade ${ctx.grade}` : '',
    'with clear, correctly-spelled text labels for each part',
    S.QUALITY,
    S.NEGATIVE_DIAGRAM,
  ]),
};

function pick(category, subject) {
  return TEMPLATES[`${category}.${subject}`] || TEMPLATES[`${category}.default`];
}
module.exports = { TEMPLATES, pick };
