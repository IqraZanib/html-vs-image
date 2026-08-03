#!/usr/bin/env node
'use strict';
// Generate a lesson-plan PDF from a lesson JSON file, using the lp-render module.
//
// Usage:
//   node scripts/render-lesson.js <lesson.json> [--locale=en|ur|sd|ar] [--a4] [--images [--source=wikimedia|flickr]] [--out=path.pdf]
//
// Examples:
//   node scripts/render-lesson.js lp-render/fixtures/lesson-113087.en.json
//   node scripts/render-lesson.js my-lesson.json --locale=ur --out=out/urdu.pdf
//   node scripts/render-lesson.js my-lesson.json --a4        # fixed A4 pages (default is content-fit, no blank space)
//   node scripts/render-lesson.js my-lesson.json --images    # resolve picture_cards via dataset icons + Openverse photos first
//   node scripts/render-lesson.js my-lesson.json --images --source=flickr   # dev/sandbox (Wikimedia is blocked there)
//
// --images runs the resolveImages pre-step so picture_cards `{query, kind}` hints become inline
// SVG icons (library) or real Creative-Commons photos (Openverse). Without it, picture_cards
// photos are skipped (only pre-resolved/icon content renders). Default source is `wikimedia`
// (production); pass --source=flickr for local/sandbox where Wikimedia Commons is unreachable.
const fs = require('node:fs');
const path = require('node:path');
const { renderLessonPlanPdf, resolveImages, validateLesson, closeBrowser } = require('../lp-render');

function parseArgs(argv) {
  const args = { _: [] };
  for (const a of argv) {
    if (a === '--a4') args.a4 = true;
    else if (a === '--images') args.images = true;
    else if (a.startsWith('--locale=')) args.locale = a.slice('--locale='.length);
    else if (a.startsWith('--source=')) args.source = a.slice('--source='.length);
    else if (a.startsWith('--out=')) args.out = a.slice('--out='.length);
    else args._.push(a);
  }
  return args;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const input = args._[0];
  if (!input) {
    console.error('Usage: node scripts/render-lesson.js <lesson.json> [--locale=en|ur|sd|ar] [--a4] [--images [--source=wikimedia|flickr]] [--out=path.pdf]');
    process.exit(2);
  }
  if (!fs.existsSync(input)) { console.error(`No such file: ${input}`); process.exit(2); }

  let lesson;
  try { lesson = JSON.parse(fs.readFileSync(input, 'utf8')); }
  catch (e) { console.error(`Invalid JSON in ${input}: ${e.message}`); process.exit(1); }

  const { ok, errors } = validateLesson(lesson);
  if (!ok) { console.error('Invalid lesson:\n - ' + errors.join('\n - ')); process.exit(1); }

  const locale = args.locale || (lesson.meta && lesson.meta.locale) || 'en';
  const opts = { locale };
  if (args.a4) opts.pageMode = 'a4';

  // Optional pre-step: resolve picture_cards image hints into dataset icons + Openverse photos.
  let lessonToRender = lesson;
  if (args.images) {
    const source = args.source || 'wikimedia';
    const { lesson: enriched, report } = await resolveImages(lesson, { source });
    lessonToRender = enriched;
    const tally = report.reduce((m, r) => { m[r.used] = (m[r.used] || 0) + 1; return m; }, {});
    console.log(`Resolved images (source=${source}): ${report.length} card(s) → ${JSON.stringify(tally)}`);
  }

  const pdf = await renderLessonPlanPdf(lessonToRender, opts);
  const out = args.out || input.replace(/\.json$/i, '') + `.${locale}.pdf`;
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, pdf);
  await closeBrowser();
  console.log(`Wrote ${out} — ${pdf.length} bytes · locale=${locale} · pageMode=${opts.pageMode || 'fit'}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
