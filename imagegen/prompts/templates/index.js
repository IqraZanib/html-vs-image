'use strict';
const S = require('../scaffold');

// Every illustration carries its region's art direction: setting, clothing, what an
// adult in the scene wears, and what would look out of place. Kept as one short line
// so a model with a hard prompt limit does not lose it to compaction.
function cultureLine(r) {
  if (!r) return '';
  return [r.setting ? `set in ${r.setting}` : '', r.dress ? `children dressed as ${r.dress}` : '', r.teacher || '']
    .filter(Boolean).join('; ');
}
function avoidLine(r) { return r && r.avoid ? r.avoid : ''; }

function charactersLine(spec) {
  if (!spec.characters.length) return '';
  return 'showing ' + spec.characters.map((c) => `${c.name} (${c.appearance})`).join(' and ');
}

// ctx = { block, subject, grade, region, chars, topic }  (chars = characterSpec output)
const TEMPLATES = {
  'decorative_scene.default': (ctx) => {
    const brief = ctx.block.text || ctx.topic || 'a friendly classroom scene';
    const textless = /no text|no letters|wordless/i.test(brief);
    return S.join([
      S.SCENE_STYLE,
      `Scene: ${brief}`,
      charactersLine(ctx.chars),
      cultureLine(ctx.region),
      ctx.region.note,
      S.QUALITY,
      textless ? S.NEGATIVE_TEXTLESS : S.NEGATIVE_SCENE,
      avoidLine(ctx.region),
    ]);
  },
  'labeled_diagram.default': (ctx) => {
    const brief = ctx.block.text || ctx.topic || '';
    // A brief that declares itself textless (hybrid figures — labels come from code)
    // must NOT be wrapped in label instructions, or the model writes text anyway.
    if (/no text|no letters|wordless/i.test(brief)) return S.join([
      S.DIAGRAM_STYLE_TEXTLESS,
      `Illustration of: ${brief}`,
      ctx.grade ? `for grade ${ctx.grade}` : '',
      cultureLine(ctx.region),
      S.QUALITY,
      S.NEGATIVE_TEXTLESS,
      avoidLine(ctx.region),
    ]);
    return S.join([
      S.DIAGRAM_STYLE,
      `Diagram of: ${brief}`,
      ctx.grade ? `for grade ${ctx.grade}` : '',
      ctx.lang
        ? `label every part with a short, correctly-spelled text label written in ${ctx.lang} — all in-image text must be in that language, never English`
        : 'with clear, correctly-spelled text labels for each part',
      S.QUALITY,
      S.NEGATIVE_DIAGRAM,
    ]);
  },
};

function pick(category, subject) {
  return TEMPLATES[`${category}.${subject}`] || TEMPLATES[`${category}.default`];
}
module.exports = { TEMPLATES, pick };
