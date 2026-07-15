const fs = require('node:fs');
const path = require('node:path');

function resolveFont(pkg, pattern) {
  const dir = path.join(__dirname, '..', 'node_modules', pkg, 'files');
  const match = fs.readdirSync(dir).find((f) => pattern.test(f));
  if (!match) return null;
  return path.join(dir, match);
}

const FAMILIES = [
  { family: 'Noto Nastaliq Urdu', pkg: '@fontsource/noto-nastaliq-urdu', script: 'arabic' },
  { family: 'Noto Naskh Arabic', pkg: '@fontsource/noto-naskh-arabic', script: 'arabic' },
  { family: 'Noto Sans', pkg: '@fontsource/noto-sans', script: 'latin' },
];

const WEIGHTS = [400, 700];

// Flat list of { family, weight, path } for every (family, weight) whose
// woff2 file actually exists in node_modules.
const FONT_FACES = FAMILIES.flatMap(({ family, pkg, script }) =>
  WEIGHTS.map((weight) => ({
    family,
    weight,
    path: resolveFont(pkg, new RegExp(`${script}-${weight}-normal\\.woff2$`)),
  })).filter((f) => f.path)
);

// Backwards-compatible export: the 400-weight face per family.
const FONTS = FONT_FACES.filter((f) => f.weight === 400).map(({ family, path: p }) => ({ family, path: p }));

function fontFaceCss() {
  return FONT_FACES.map(
    (f) =>
      `@font-face{font-family:'${f.family}';src:url('file://${f.path}') format('woff2');font-weight:${f.weight};font-display:swap;}`
  ).join('\n');
}

module.exports = { FONTS, fontFaceCss };
