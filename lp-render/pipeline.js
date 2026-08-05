'use strict';
// Reusable lesson-plan image pipeline — the single code path behind both the CLI
// (scripts/render-lp-image.js) and the web interface (scripts/lp-studio.js).
//
//   content JSON -> read skills -> restore/generate images (shared store) ->
//   ensure character cast -> render HTML+CSS+SVG (KaTeX/MathJax) -> PDF + PNG
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { buildShell } = require('./template/shell');
const { htmlToPdf, closeBrowser } = require('./index');
const { THEME_CSS } = require('./decorative/theme');
const { renderDecorativeLesson } = require('./decorative/render');
const { ensureCast } = require('./decorative/characters');
const store = require('./store/assets');
const { resolveSegmentImages } = require('../imagegen');
const { chromium } = require('../node_modules/playwright-core');

const ROOT = path.resolve(__dirname, '..');
const RULES_PATH = path.join(__dirname, 'decorative', 'RULES.md');
const CONCEPT_TO_BLOCK = { diagram: 'DIAGRAM', scene: 'HOOK_STORY', photo: 'HOOK_STORY' };

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
// The pipeline ALWAYS reads its skills file first (mandatory), from an absolute path.
function readSkills(log) {
  if (!fs.existsSync(RULES_PATH)) throw new Error(`Skills file missing: ${RULES_PATH}`);
  const txt = fs.readFileSync(RULES_PATH, 'utf8');
  const titles = (txt.match(/^## R\d+ —.*$/gm) || []).map((l) => l.replace(/^##\s*/, ''))
    .sort((a, b) => parseInt(a.match(/R(\d+)/)[1], 10) - parseInt(b.match(/R(\d+)/)[1], 10));
  const policy = (txt.match(/## GATE_POLICY\s*([\s\S]*?)$/) || [])[1];
  log(`Read ${titles.length} skills from RULES.md first — applying them.`);
  return (policy || '').trim();
}
async function screenshot(html) {
  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; });
    return await page.screenshot({ fullPage: true });
  } finally { await browser.close(); }
}

// Render one lesson to { png, pdf } buffers. Content images are restored from the
// shared asset store when possible (no credits); anything new is generated, gated,
// and saved to the store for next time.
async function renderLessonImage(content, opts = {}) {
  const { apiKey = process.env.KIE_API_KEY, fresh = false, log = () => {} } = opts;
  const gatePolicy = readSkills(log);
  const meta = content.meta || {};
  const locale = meta.locale || 'en';
  const contentId = meta.id || 'lesson';
  const wanted = Array.isArray(content.images) ? content.images : [];
  const statsOut = { restored: 0, generated: 0, dropped: 0 };

  const imagesMap = {};
  const toGen = [];
  for (const im of wanted) {
    const key = store.keyFor(im.prompt);
    if (!fresh) {
      const hit = store.get(key);
      if (hit) { imagesMap[im.id] = { dataUri: hit.dataUri, label: im.label, cover: im.concept !== 'diagram' }; statsOut.restored++; log(`  ⤿ image "${im.id}" restored from store (no credits)`); continue; }
    }
    toGen.push({ im, key });
  }

  if (toGen.length) {
    if (!apiKey) throw new Error(`Need KIE_API_KEY to generate ${toGen.length} new image(s) (or seed the asset store first).`);
    const segment = {
      subject: meta.subject || (meta.chips || []).map((c) => c.value).join(' '),
      grade: meta.grade || '', region: meta.region || 'pk',
      blocks: toGen.map(({ im }) => ({ type: CONCEPT_TO_BLOCK[im.concept] || 'HOOK_STORY', text: im.prompt, characters: im.characters, model: im.model })),
    };
    const { images } = await resolveSegmentImages(segment, { apiKey, region: segment.region, gatePolicy });
    for (let i = 0; i < toGen.length; i++) {
      const { im, key } = toGen[i]; const got = images[i];
      if (got && got.asset && got.asset.url) {
        const dataUri = await download(got.asset.url);
        store.put(key, dataUri, { model: got.model, concept: im.concept, prompt: im.prompt });
        imagesMap[im.id] = { dataUri, label: im.label, cover: im.concept !== 'diagram' };
        statsOut.generated++; log(`  ✓ image "${im.id}" generated (${got.model}) → saved to store`);
      } else { statsOut.dropped++; log(`  ✗ image "${im.id}" dropped — no model passed the quality gate`); }
    }
  } else if (wanted.length) {
    log('All content images restored from the store — no credits spent.');
  }

  const cast = await ensureCast({ apiKey, gatePolicy });
  const { headerHtml, bodyHtml, headCss } = renderDecorativeLesson(content, imagesMap, cast);
  let html = buildShell({ headerHtml, bodyHtml, locale, title: meta.title || contentId });
  html = html.replace('</head>', `<style>${THEME_CSS}</style>${headCss ? `<style>${headCss}</style>` : ''}</head>`);

  const pdf = await htmlToPdf(html, { pageMode: 'fit', pdfOptions: { printBackground: true } });
  await closeBrowser();
  const png = await screenshot(html);
  return { png, pdf, html, contentId, locale, stats: statsOut };
}

module.exports = { renderLessonImage, ROOT };
