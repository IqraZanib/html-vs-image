#!/usr/bin/env node
'use strict';
// Generic, content-driven decorative lesson-plan image renderer.
//
// It works for ANY subject, grade, or language. It renders ONLY what the content
// JSON gives it — verbatim headings and words, never summarized, never invented
// (see lp-render/decorative/RULES.md, which THIS SCRIPT READS FIRST).
//
// Usage:
//   KIE_API_KEY=... node scripts/render-lp-image.js <content.json> [--out=path.png] [--fresh]
//
// Images named in the content are generated via kie.ai (cost-ascending model
// ladder), each checked by the vision quality gate against RULES.md → GATE_POLICY
// (correctness + human values). Rejected images are dropped; the model source is
// never shown. Generated images are cached to disk so re-renders spend no credits
// (pass --fresh to regenerate).
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { buildShell } = require('../lp-render/template/shell');
const { htmlToPdf, closeBrowser } = require('../lp-render');
const { THEME_CSS } = require('../lp-render/decorative/theme');
const { renderDecorativeLesson } = require('../lp-render/decorative/render');
const { ensureCast } = require('../lp-render/decorative/characters');
const { resolveSegmentImages } = require('../imagegen');
const { chromium } = require('../node_modules/playwright-core');

const ROOT = path.resolve(__dirname, '..');
const RULES_PATH = path.join(ROOT, 'lp-render/decorative/RULES.md');
const CACHE_DIR = path.join(ROOT, 'assets/generated/lp-images-cache');

function chromePath() {
  for (const c of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) if (fs.existsSync(c)) return c;
  try { return require('../node_modules/puppeteer').executablePath(); } catch (_) { return undefined; }
}
function download(url) {
  return new Promise((res, rej) => {
    https.get(url, (r) => {
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('download ' + r.statusCode)); }
      const chunks = []; r.on('data', (d) => chunks.push(d));
      r.on('end', () => { const b = Buffer.concat(chunks); const mime = b[0] === 0x89 && b[1] === 0x50 ? 'image/png' : b[0] === 0x47 ? 'image/gif' : 'image/jpeg'; res('data:' + mime + ';base64,' + b.toString('base64')); });
    }).on('error', rej);
  });
}
// STEP 0: the script ALWAYS reads its skills file first, wherever it runs from
// (RULES_PATH is resolved from __dirname, not the cwd). It is mandatory — if the
// skills are missing we refuse to render rather than silently drop the rules.
function readSkills() {
  if (!fs.existsSync(RULES_PATH)) {
    console.error(`Skills file missing: ${RULES_PATH}. Cannot render without the rules.`);
    process.exit(1);
  }
  const txt = fs.readFileSync(RULES_PATH, 'utf8');
  const titles = (txt.match(/^## R\d+ —.*$/gm) || []).map((l) => l.replace(/^##\s*/, ''))
    .sort((a, b) => parseInt(a.match(/R(\d+)/)[1], 10) - parseInt(b.match(/R(\d+)/)[1], 10));
  const m = txt.match(/## GATE_POLICY\s*([\s\S]*?)$/);
  const policy = m ? m[1].trim() : '';
  console.log(`Read ${titles.length} skills from RULES.md first — applying them:`);
  for (const t of titles) console.log(`   • ${t}`);
  return policy;
}
const CONCEPT_TO_BLOCK = { diagram: 'DIAGRAM', scene: 'HOOK_STORY', photo: 'HOOK_STORY' };

(async () => {
  const argv = process.argv.slice(2);
  const input = argv.find((a) => !a.startsWith('--'));
  const fresh = argv.includes('--fresh');
  const outArg = (argv.find((a) => a.startsWith('--out=')) || '').slice('--out='.length);
  if (!input || !fs.existsSync(input)) { console.error('Usage: node scripts/render-lp-image.js <content.json> [--out=path.png] [--fresh]'); process.exit(2); }

  const gatePolicy = readSkills();
  const content = JSON.parse(fs.readFileSync(input, 'utf8'));
  const meta = content.meta || {};
  const locale = meta.locale || 'en';
  const contentId = meta.id || path.basename(input).replace(/\.[^.]+$/, '');
  const wanted = content.images || [];

  // ---- images: reuse disk cache, generate only what's missing (RULES R4, R5, R6)
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cacheFile = path.join(CACHE_DIR, `${contentId}.json`);
  let cache = {};
  if (!fresh && fs.existsSync(cacheFile)) { try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch (_) { cache = {}; } }

  const toGen = wanted.filter((im) => !(cache[im.id] && cache[im.id].prompt === im.prompt && cache[im.id].dataUri));
  if (toGen.length) {
    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) { console.error(`Need KIE_API_KEY to generate ${toGen.length} image(s) (or run with all images cached).`); process.exit(1); }
    const segment = {
      subject: meta.subject || (meta.chips || []).map((c) => c.value).join(' '),
      grade: meta.grade || '', region: meta.region || 'pk',
      blocks: toGen.map((im) => ({ type: CONCEPT_TO_BLOCK[im.concept] || 'HOOK_STORY', text: im.prompt, characters: im.characters })),
    };
    const { images } = await resolveSegmentImages(segment, { apiKey, region: segment.region, gatePolicy });
    for (let i = 0; i < toGen.length; i++) {
      const im = toGen[i]; const got = images[i];
      if (got && got.asset && got.asset.url) {
        const dataUri = await download(got.asset.url);
        cache[im.id] = { dataUri, model: got.model, prompt: im.prompt, label: im.label, cover: im.concept !== 'diagram' };
        console.log(`  ✓ image "${im.id}" generated and passed the quality gate`);
      } else {
        cache[im.id] = { dataUri: null, prompt: im.prompt, label: im.label, reason: got && got.reason };
        console.log(`  ✗ image "${im.id}" dropped — no model passed the quality gate (${got && got.reason || 'n/a'})`);
      }
    }
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  } else {
    console.log('All images served from cache — no credits spent.');
  }

  // build id → resolved image map (only images that passed the gate)
  const imagesMap = {};
  for (const im of wanted) { const c = cache[im.id]; if (c && c.dataUri) imagesMap[im.id] = { dataUri: c.dataUri, label: im.label || c.label, cover: !!c.cover }; }

  // ---- reusable character cast (fallback visual for image-less sections, RULES R8)
  const cast = await ensureCast({ apiKey: process.env.KIE_API_KEY, gatePolicy });

  // ---- render (generic; content words verbatim)
  const { headerHtml, bodyHtml, headCss } = renderDecorativeLesson(content, imagesMap, cast);
  let html = buildShell({ headerHtml, bodyHtml, locale, title: meta.title || contentId });
  html = html.replace('</head>', `<style>${THEME_CSS}</style>${headCss ? `<style>${headCss}</style>` : ''}</head>`);

  const outPng = outArg || path.join(ROOT, 'assets/generated', `${contentId}.${locale}.png`);
  const outPdf = outPng.replace(/\.png$/i, '.pdf');
  fs.mkdirSync(path.dirname(outPng), { recursive: true });

  const pdf = await htmlToPdf(html, { pageMode: 'fit', pdfOptions: { printBackground: true } });
  fs.writeFileSync(outPdf, pdf);
  await closeBrowser();

  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.screenshot({ path: outPng, fullPage: true });
  await browser.close();

  console.log(`Wrote ${path.relative(ROOT, outPdf)} and ${path.relative(ROOT, outPng)} · locale=${locale}`);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
