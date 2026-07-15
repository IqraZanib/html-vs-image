const fs = require('node:fs');
const path = require('node:path');

function resolveFont(pkg, pattern) {
  const dir = path.join(__dirname, '..', 'node_modules', pkg, 'files');
  const match = fs.readdirSync(dir).find((f) => pattern.test(f));
  if (!match) throw new Error(`no font matching ${pattern} in ${dir}`);
  return path.join(dir, match);
}

const FONTS = [
  { family: 'Noto Nastaliq Urdu', path: resolveFont('@fontsource/noto-nastaliq-urdu', /arabic-400-normal\.woff2$/) },
  { family: 'Noto Naskh Arabic', path: resolveFont('@fontsource/noto-naskh-arabic', /arabic-400-normal\.woff2$/) },
  { family: 'Noto Sans', path: resolveFont('@fontsource/noto-sans', /latin-400-normal\.woff2$/) },
];

function fontFaceCss() {
  return FONTS.map(
    (f) =>
      `@font-face{font-family:'${f.family}';src:url('file://${f.path}') format('woff2');font-weight:400 700;font-display:swap;}`
  ).join('\n');
}

module.exports = { FONTS, fontFaceCss };
