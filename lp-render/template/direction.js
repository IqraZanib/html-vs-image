'use strict';

const MAP = {
  en: { dir: 'ltr', fontFamily: `"Noto Sans", sans-serif` },
  ur: { dir: 'rtl', fontFamily: `"Noto Nastaliq Urdu", "Noto Naskh Arabic", serif` },
  sd: { dir: 'rtl', fontFamily: `"Noto Naskh Arabic", "Noto Nastaliq Urdu", serif` },
  ar: { dir: 'rtl', fontFamily: `"Noto Naskh Arabic", serif` },
};

function resolveDirection(locale) {
  return MAP[locale] || MAP.en;
}

module.exports = { resolveDirection };
