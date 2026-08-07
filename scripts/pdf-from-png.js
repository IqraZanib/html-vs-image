#!/usr/bin/env node
'use strict';
// Thin CLI: render a content JSON to the pixel-perfect paginated PDF (the same path the
// pipeline uses by default — see lp-render/render/png-to-pdf.js + compose_pdf.py).
//
//   node scripts/pdf-from-png.js <content.json> <out.pdf>
const fs = require('node:fs');
const path = require('node:path');
const { renderLessonImage } = require('../lp-render/pipeline');
const { htmlToPixelPdf } = require('../lp-render/render/png-to-pdf');

function apiKey() {
  try { const m = fs.readFileSync(path.resolve(__dirname, '../assets/generated/.env-api'), 'utf8').match(/KIE_API_KEY\s*=\s*([^\s#]+)/); return m ? m[1].trim() : process.env.KIE_API_KEY; }
  catch (_) { return process.env.KIE_API_KEY; }
}

(async () => {
  const [input, out] = process.argv.slice(2);
  if (!input || !out) { console.error('Usage: node scripts/pdf-from-png.js <content.json> <out.pdf>'); process.exit(2); }
  const content = JSON.parse(fs.readFileSync(input, 'utf8'));
  const { html } = await renderLessonImage(content, { apiKey: apiKey(), log: () => {}, pdf: false });
  const pdf = await htmlToPixelPdf(html);
  fs.writeFileSync(out, pdf);
  console.log(`  ✓ pixel-perfect PDF → ${out}`);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
