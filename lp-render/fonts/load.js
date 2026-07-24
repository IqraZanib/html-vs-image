'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Resolve one woff2 file matching `pattern` inside a @fontsource package's files/ dir.
function resolveFont(pkg, pattern) {
  const dir = path.join(__dirname, '..', '..', 'node_modules', pkg, 'files');
  const match = fs.readdirSync(dir).find((f) => pattern.test(f));
  return match ? path.join(dir, match) : null;
}

const FAMILIES = [
  { family: 'Noto Nastaliq Urdu', pkg: '@fontsource/noto-nastaliq-urdu', script: 'arabic' },
  { family: 'Noto Naskh Arabic', pkg: '@fontsource/noto-naskh-arabic', script: 'arabic' },
  { family: 'Noto Sans', pkg: '@fontsource/noto-sans', script: 'latin' },
];
const WEIGHTS = [400, 700];

let _cache = null;

function fontFaceCss() {
  if (_cache) return _cache;
  const faces = [];
  for (const { family, pkg, script } of FAMILIES) {
    for (const weight of WEIGHTS) {
      const file = resolveFont(pkg, new RegExp(`${script}-${weight}-normal\\.woff2$`));
      if (!file) continue;
      const b64 = fs.readFileSync(file).toString('base64');
      faces.push(
        `@font-face{font-family:'${family}';font-weight:${weight};font-display:swap;` +
        `src:url(data:font/woff2;base64,${b64}) format('woff2');}`
      );
    }
  }
  _cache = faces.join('\n');
  return _cache;
}

module.exports = { fontFaceCss };
