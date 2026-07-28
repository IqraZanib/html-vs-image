'use strict';

const SECTION_TYPES = [
  'objectives', 'materials', 'introduction', 'explore',
  'explanation', 'guided_practice', 'assessment', 'differentiation', 'generic',
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
      }
    });
  }
  return { ok: errors.length === 0, errors };
}

module.exports = { validateLesson, SECTION_TYPES, LOCALES };
