'use strict';
// Regenerates lp-render/template/icons-extra.js from assets/illustrations/*.svg.
// Extracts each SVG's viewBox + inner markup into a self-contained JS module the
// renderer requires at load time. Names already defined inline in
// lp-render/template/icons.js (BODY) are skipped so tuned versions stay canonical.
//
// Usage: node scripts/gen-icons-extra.js
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets', 'illustrations');
const OUT = path.join(ROOT, 'lp-render', 'template', 'icons-extra.js');

// Names already defined in lp-render/template/icons.js BODY (keep those canonical).
const EXISTING = new Set([
  'target', 'toolbox', 'rocket', 'lightbulb', 'pencil', 'checklist', 'ladder', 'board',
  'person', 'cake', 'family', 'heart', 'school', 'nametag', 'apple', 'star', 'thumbup', 'thumbdown',
]);

const out = {};
const skipped = [];
for (const file of fs.readdirSync(ASSETS).sort()) {
  if (!file.endsWith('.svg')) continue;
  const name = file.replace(/\.svg$/, '');
  if (EXISTING.has(name)) { skipped.push(name); continue; }
  const raw = fs.readFileSync(path.join(ASSETS, file), 'utf8');
  const vb = (raw.match(/viewBox="([^"]+)"/i) || [])[1];
  const inner = (raw.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>\s*$/i) || [])[1];
  if (!vb || inner == null) { console.error('SKIP (no viewBox/inner):', file); continue; }
  out[name] = { vb: vb.trim(), body: inner.trim() };
}

const header = "'use strict';\n"
  + '// GENERATED from assets/illustrations/*.svg — do not edit by hand.\n'
  + '// Regenerate: node scripts/gen-icons-extra.js\n'
  + '// Each entry is { vb: viewBox, body: inner SVG markup }; consumed by template/icons.js.\n'
  + 'module.exports = ';
fs.writeFileSync(OUT, header + JSON.stringify(out, null, 2) + ';\n');
console.log(`Wrote ${Object.keys(out).length} extra icons to ${path.relative(ROOT, OUT)}`);
console.log('Skipped (already inline):', skipped.join(', '));
