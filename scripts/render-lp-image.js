#!/usr/bin/env node
'use strict';
// Generic, content-driven decorative lesson-plan image renderer (thin CLI over
// lp-render/pipeline.js). Works for ANY subject/grade/language; renders ONLY what
// the content JSON gives it (verbatim), reading lp-render/decorative/RULES.md first.
//
// Usage:
//   KIE_API_KEY=... node scripts/render-lp-image.js <content.json> [--out=path.png] [--fresh]
//
// Content images are restored from the shared asset store when possible (no
// credits); anything new is generated via kie.ai, quality-gated, and saved to the
// store for next time. --fresh forces regeneration.
const fs = require('node:fs');
const path = require('node:path');
const { renderLessonImage, ROOT } = require('../lp-render/pipeline');

(async () => {
  const argv = process.argv.slice(2);
  const input = argv.find((a) => !a.startsWith('--'));
  const fresh = argv.includes('--fresh');
  const outArg = (argv.find((a) => a.startsWith('--out=')) || '').slice('--out='.length);
  if (!input || !fs.existsSync(input)) { console.error('Usage: node scripts/render-lp-image.js <content.json> [--out=path.png] [--fresh]'); process.exit(2); }

  const content = JSON.parse(fs.readFileSync(input, 'utf8'));
  const { png, pdf, contentId, locale, stats } = await renderLessonImage(content, { apiKey: process.env.KIE_API_KEY, fresh, log: (m) => console.log(m) });

  const outPng = outArg || path.join(ROOT, 'assets/generated', `${contentId}.${locale}.png`);
  const outPdf = outPng.replace(/\.png$/i, '.pdf');
  fs.mkdirSync(path.dirname(outPng), { recursive: true });
  fs.writeFileSync(outPng, png);
  fs.writeFileSync(outPdf, pdf);
  console.log(`images: ${stats.restored} restored · ${stats.generated} generated · ${stats.dropped} dropped`);
  console.log(`Wrote ${path.relative(ROOT, outPdf)} and ${path.relative(ROOT, outPng)} · locale=${locale}`);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
