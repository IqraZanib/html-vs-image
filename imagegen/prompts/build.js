'use strict';
const { resolveRegion } = require('./regions');
const { characterSpec } = require('../characters');
const { pick } = require('./templates');

// Any text a generated image shows (e.g. diagram labels) must be in the lesson's own
// language, not English. Map the locale to a descriptor the image model understands,
// noting the script and direction where it matters. Unknown / English locales → no
// directive (the template's default English-label line applies).
const LANG_LABEL = {
  ar: 'Arabic (العربية), right-to-left Arabic script',
  ur: 'Urdu (اردو), right-to-left Nastaliq script',
  sd: 'Sindhi (سنڌي), right-to-left Arabic script',
  fa: 'Persian/Farsi (فارسی), right-to-left script',
  ps: 'Pashto (پښتو), right-to-left script',
  sw: 'Kiswahili',
  fr: 'French', es: 'Spanish', pt: 'Portuguese',
};
function langLabel(locale) { return LANG_LABEL[String(locale || '').toLowerCase()]; }

function resolvePrompt({ category, subject, block, region = 'pk', grade, locale } = {}) {
  const tmpl = pick(category, subject);
  if (!tmpl) throw new Error(`no prompt template for category "${category}"`);
  const reg = resolveRegion(region);
  const chars = characterSpec(block, region);
  return tmpl({ block, subject, grade, region: reg, chars, topic: (block && block.text), lang: langLabel(locale) });
}
module.exports = { resolvePrompt, langLabel };
