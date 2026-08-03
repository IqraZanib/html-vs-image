'use strict';

const SECTION_TYPES = [
  'objectives', 'materials', 'introduction', 'explore',
  'explanation', 'picture_equation', 'picture_cards', 'place_value', 'guided_practice', 'assessment', 'differentiation', 'generic',
];

const LOCALES = ['en', 'ur', 'sd', 'ar'];

function validateLesson(lesson) {
  const errors = [];
  if (!lesson || typeof lesson !== 'object') {
    return { ok: false, errors: ['lesson must be an object'] };
  }
  const meta = lesson.meta;
  if (!meta || typeof meta !== 'object') {
    errors.push('meta is required and must be an object');
  } else {
    if (!meta.title) errors.push('meta.title is required');
    if (!meta.locale) errors.push('meta.locale is required');
    else if (!LOCALES.includes(meta.locale)) {
      errors.push(`meta.locale must be one of ${LOCALES.join(', ')} (got "${meta.locale}")`);
    }
  }
  if (!Array.isArray(lesson.sections)) {
    errors.push('sections must be an array');
  } else {
    lesson.sections.forEach((s, i) => {
      if (!s || typeof s !== 'object' || !s.type) {
        errors.push(`sections[${i}].type is required`);
        return;
      }
      if (s.type === 'picture_cards') {
        if (!Array.isArray(s.cards) || s.cards.length === 0) {
          errors.push(`sections[${i}].cards must be a non-empty array`);
        } else {
          s.cards.forEach((c, j) => {
            if (!c || typeof c !== 'object' || !c.query) {
              errors.push(`sections[${i}].cards[${j}].query is required`);
            }
          });
        }
      }
      if (s.type === 'place_value') {
        if (!Array.isArray(s.numbers) || s.numbers.length === 0) {
          errors.push(`sections[${i}].numbers must be a non-empty array`);
        } else {
          s.numbers.forEach((n, j) => {
            if (!n || typeof n !== 'object' || !Number.isFinite(Number(n.value))) {
              errors.push(`sections[${i}].numbers[${j}].value must be a number`);
            }
          });
        }
      }
    });
  }
  return { ok: errors.length === 0, errors };
}

module.exports = { validateLesson, SECTION_TYPES, LOCALES };
