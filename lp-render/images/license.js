'use strict';
// Only Public Domain / CC0 / CC-BY / CC-BY-SA are usable (attribution logged).
// CC-BY-NC*, CC-BY-ND*, and anything unknown are rejected.
const ALLOWED = new Set(['pdm', 'cc0', 'by', 'by-sa']);

function isAllowedLicense(code) {
  return ALLOWED.has(String(code == null ? '' : code).trim().toLowerCase());
}

module.exports = { isAllowedLicense, ALLOWED_LICENSES: [...ALLOWED] };
