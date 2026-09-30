#!/usr/bin/env node
'use strict';
// Render an ICT (NIETE) lp_doc to PDF with this repo's renderer, locally.
//
//   node scripts/render-lpdoc.js <lp_doc.json> [--lang en|ur] [--out <dir>]
//   npm run render:ict -- lp-render/fixtures/ict/niete_v9_gate_base.lp.json
//
// lp_doc -> ICT adapter (lp-render/guide/from-lpdoc.js) -> Guide -> renderLessonImage with the
// ict design pack -> PDF. No model is called and no image is generated: an lp_doc carries no
// generated art and the adapter draws its diagrams with ICT's own engine, so this costs nothing
// and needs no API key. Output goes to out/ict/ by default (git-ignored).
const fs = require('node:fs');
const path = require('node:path');
const { buildGuideFromLpDoc, isLpDoc } = require('../lp-render/guide/from-lpdoc');
const { renderLessonImage } = require('../lp-render/pipeline');

function parseArgs(argv) {
  const out = { src: null, lang: undefined, dir: path.join(__dirname, '..', 'out', 'ict') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--lang') out.lang = argv[++i];
    else if (argv[i] === '--out') out.dir = path.resolve(argv[++i]);
    else if (!out.src) out.src = argv[i];
  }
  return out;
}

(async () => {
  const { src, lang, dir } = parseArgs(process.argv.slice(2));
  if (!src) {
    console.error('usage: node scripts/render-lpdoc.js <lp_doc.json> [--lang en|ur] [--out <dir>]');
    process.exit(2);
  }
  const doc = JSON.parse(fs.readFileSync(src, 'utf8'));
  if (!isLpDoc(doc)) throw new Error(`${src} is not an ICT lp_doc (no sections[].blocks with provenance/page2)`);

  const { guide, report } = buildGuideFromLpDoc(doc, lang ? { lang } : {});
  const logs = [];
  const r = await renderLessonImage(guide, { apiKey: '', pdf: true, log: (m) => logs.push(m) });

  fs.mkdirSync(dir, { recursive: true });
  const base = path.join(dir, `${guide.meta.id || 'lesson'}.${report.lang}`);
  fs.writeFileSync(`${base}.pdf`, r.pdf);
  fs.writeFileSync(`${base}.png`, r.png);
  fs.writeFileSync(`${base}.guide.json`, JSON.stringify(guide, null, 2));
  fs.writeFileSync(`${base}.report.json`, JSON.stringify(report, null, 2));

  const pages = (r.pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(logs.join('\n'));
  console.log(`\n${guide.meta.title} (${report.lang}) -> ${base}.pdf`);
  console.log(`  pages ${pages} · diagrams ${guide.images.length} · images generated ${r.stats.generated} · overflow findings ${(r.overflow || []).length}`);
  for (const u of report.unrendered) console.log(`  not drawn yet: ${u.type}${u.spec ? ` (${u.spec})` : ''} — ${u.why}`);
  for (const w of report.warnings) console.log(`  warning: ${w}`);
  for (const n of report.notPrinted) console.log(`  not printed (ICT rule): ${n}`);
  process.exit(0);
})().catch((e) => { console.error('render-lpdoc failed:', e.message); process.exit(1); });
