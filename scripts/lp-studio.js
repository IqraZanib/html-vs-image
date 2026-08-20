#!/usr/bin/env node
'use strict';
// LP Studio — a tiny local web interface for the lesson-plan pipeline.
// Two panels: paste a lesson content JSON on the left, get the rendered image on
// the right. The SAME code path runs behind it (lp-render/pipeline.js).
//
//   node scripts/lp-studio.js         # then open http://localhost:5178
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { renderLessonImage } = require('../lp-render/pipeline');
const { structureLesson } = require('../lp-render/structure');
const { condenseToGuide } = require('../lp-render/condense');
const { validateFigures } = require('../lp-render/figures/validate');

const ROOT = path.resolve(__dirname, '..');
// Load the kie.ai key from the git-ignored .env-api if it isn't already in the env.
if (!process.env.KIE_API_KEY) {
  try {
    const t = fs.readFileSync(path.join(ROOT, 'assets/generated/.env-api'), 'utf8');
    const line = t.split(/\r?\n/).find((l) => l.startsWith('KIE_API_KEY='));
    if (line) process.env.KIE_API_KEY = line.split('=').slice(1).join('=').trim();
  } catch (_) { /* no key file — store-only mode still works */ }
}

const PORT = process.env.PORT || 5178;
const PAGE = fs.readFileSync(path.join(__dirname, 'lp-studio.html'), 'utf8');
const SAMPLE_FILE = path.join(ROOT, 'assets/content/lesson-speed-demo.en.json');

function send(res, code, type, body) { res.writeHead(code, { 'Content-Type': type }); res.end(body); }

function handler(req, res) {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) return send(res, 200, 'text/html; charset=utf-8', PAGE);
  if (req.method === 'GET' && req.url === '/sample') {
    try { return send(res, 200, 'application/json', fs.readFileSync(SAMPLE_FILE, 'utf8')); }
    catch (_) { return send(res, 404, 'application/json', '{}'); }
  }
  if (req.method === 'GET' && req.url === '/regions') {
    // Region design packs on disk (decorative/regions/<code>/theme.js) — the picker
    // lists them automatically, so a new pack shows up with no Studio change.
    const dir = path.join(ROOT, 'lp-render/decorative/regions');
    let regions = [];
    try {
      regions = fs.readdirSync(dir).filter((r) => fs.existsSync(path.join(dir, r, 'theme.js'))).sort()
        .map((code) => {
          let name = code.toUpperCase();
          try {
            const themePath = require.resolve(path.join(dir, code, 'theme.js'));
            delete require.cache[themePath];
            name = require(themePath).REGION_NAME || name;
          } catch (_) { /* stub without name — code is fine */ }
          return { code, name };
        });
    } catch (_) { /* no regions dir — empty list */ }
    return send(res, 200, 'application/json', JSON.stringify({ regions }));
  }
  if (req.method === 'POST' && req.url === '/render') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 5e6) req.destroy(); });
    req.on('end', async () => {
      const logs = []; const log = (m) => logs.push(m);
      // Proxies and tunnels (Cloudflare et al) kill a response that stays silent for
      // ~100s, while structure+render+imagegen can take minutes. Send the headers now
      // and a whitespace heartbeat until the JSON is ready — leading whitespace is
      // valid JSON, so the client's res.json() parses exactly as before.
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const heartbeat = setInterval(() => { try { res.write(' '); } catch (_) { /* client gone */ } }, 15000);
      const finish = (obj) => { clearInterval(heartbeat); res.end(JSON.stringify(obj)); };
      try {
        const parsedBody = JSON.parse(body);
        const { content, region } = parsedBody;
        // Default ON — clients that predate the checkbox get the 2-page guide too.
        const guide2p = parsedBody.guide2p !== false;
        let parsed = null; let structured = null;
        // First, try to read the paste as a ready content JSON.
        if (typeof content !== 'string') parsed = content;
        else { try { parsed = JSON.parse(content); } catch (_) { parsed = null; } }
        // A usable content JSON MUST have a sections array. Anything else — raw
        // lesson text, or a JSON in some other shape (an API dump, a blob with the
        // lesson inside a text field) — is structured into the schema first.
        if (!parsed || !Array.isArray(parsed.sections)) {
          log('Input is not a lesson content JSON — structuring it into the schema first…');
          if (!process.env.KIE_API_KEY) throw new Error('Structuring needs a kie.ai key. Paste a content JSON (with a "sections" array), or start the server with KIE_API_KEY set.');
          const raw = typeof content === 'string' ? content : JSON.stringify(content);
          parsed = await structureLesson(raw, { apiKey: process.env.KIE_API_KEY });
          structured = JSON.stringify(parsed, null, 2);
          log('Structured the input into a content JSON (kept its own words).');
        }
        // Region override from the Studio picker: '' = auto (whatever the content
        // declares), 'default' = force the default theme, '<code>' = that design pack.
        if (region === 'default') { parsed.meta = { ...(parsed.meta || {}) }; delete parsed.meta.region; log('Region: forced default theme (picker).'); }
        else if (region) { parsed.meta = { ...(parsed.meta || {}), region }; log(`Region: "${region}" design pack (picker).`); }
        // 2-page guide (default ON): condense the full lesson into the design sets'
        // teacher-facing 12-role template before rendering. Content already in the
        // guide shape passes through untouched.
        const srcForValidation = parsed; // the structured lesson, before condensing
        let figureReport = null;
        const looksLikeGuide = Array.isArray(parsed.sections) && parsed.sections.some((x) => x && x.id === 'stage-tamhid');
        if (guide2p && !looksLikeGuide) {
          if (!process.env.KIE_API_KEY) throw new Error('The 2-page guide needs a kie.ai key for the condense step.');
          log('Condensing the full lesson into the 2-page guide template…');
          const keepRegion = parsed.meta && parsed.meta.region;
          parsed = await condenseToGuide(parsed, { apiKey: process.env.KIE_API_KEY, log });
          if (keepRegion) parsed.meta = { ...(parsed.meta || {}), region: keepRegion };
          // Coverage retry: the design set promises a figure on every stage card, but
          // condense rolls vary. Count the stages that actually got one and re-condense
          // (text only — no image credits spent yet) when the guide comes back bare.
          // Coverage: no fixed figure count — a lesson may be as visual as it needs.
          // Only a guide that comes back with essentially NO figures is re-condensed.
          const STAGES = ['stage-tamhid', 'stage-arad', 'stage-tatbiq', 'stage-taqwim'];
          const covered = (g) => STAGES.filter((id) => {
            const s = (g.sections || []).find((x) => x && x.id === id);
            return s && (s.image || s.codeFigure);
          }).length;
          for (let pass = 0; covered(parsed) < 2 && pass < 2; pass++) {
            log(`Only ${covered(parsed)}/4 stages carry a figure — re-condensing for a visual-first guide…`);
            parsed = await condenseToGuide(parsed, { apiKey: process.env.KIE_API_KEY, log,
              extra: 'VISUAL-FIRST: this guide came back nearly text-only. Give the stages that genuinely benefit a figure — a textless illustration ("image") or a "codeFigure" — and keep their prose to one or two short lines.' });
            if (keepRegion) parsed.meta = { ...(parsed.meta || {}), region: keepRegion };
          }
          // Accuracy net (§6/§7): validate the figure SPECS against the source lesson
          // before any image is generated, so wrong values surface as findings.
          figureReport = validateFigures(parsed, { source: srcForValidation, log });
          structured = JSON.stringify(parsed, null, 2);
        }
        let { png, pdf, stats, contentId, locale } = await renderLessonImage(parsed, { log, pdf: true }); // PNG preview + PDF download (final product)
        // Fit loop: the guide promises 2 pages — if the condensed lesson still paginates
        // longer, re-condense with escalating tightness (up to two retries: dense
        // lessons at large type sizes routinely survive a single pass).
        const pageCount = (buf) => ((buf || '').toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
        const TIGHTEN = [
          'The previous attempt was TOO LONG. Cut every word budget by a third; keep only the most essential sentence in each stage body. KEEP EVERY FIGURE — each stage that had an "image" or "codeFigure" must still have one; cut WORDS, never visuals.',
          'STILL TOO LONG. Halve every word budget: stage bodies ≤ 14 words (one imperative sentence), goal ≤ 14, errors sides ≤ 12, solutions items ≤ 12, homework ≤ 20, glossary values ≤ 5, multigrade lines ≤ 8. KEEP EVERY FIGURE — the figures carry the lesson, so never drop an "image" or "codeFigure" to save space; cut words only.',
        ];
        for (let pass = 0; guide2p && pdf && pageCount(pdf) > 2 && !looksLikeGuide && pass < TIGHTEN.length; pass++) {
          log(`Guide came out ${pageCount(pdf)} pages — re-condensing tighter (pass ${pass + 1})…`);
          const keepRegion2 = parsed.meta && parsed.meta.region;
          parsed = await condenseToGuide(parsed, { apiKey: process.env.KIE_API_KEY, log, extra: TIGHTEN[pass] });
          if (keepRegion2) parsed.meta = { ...(parsed.meta || {}), region: keepRegion2 };
          structured = JSON.stringify(parsed, null, 2);
          ({ png, pdf, stats, contentId, locale } = await renderLessonImage(parsed, { log, pdf: true }));
        }
        // A tightening pass can still come back light on figures; if the guide lost
        // them, restore coverage once more (text-only round trip, no image credits).
        if (guide2p && !looksLikeGuide) {
          const stages = ['stage-tamhid', 'stage-arad', 'stage-tatbiq', 'stage-taqwim'];
          const have = stages.filter((id) => { const s = (parsed.sections || []).find((x) => x && x.id === id); return s && (s.image || s.codeFigure); }).length;
          if (have === 0) log('  ⚠ the tightened guide has no stage figures — the design set expects figures on the stage cards');
        }
        // Keep every rendered lesson in the repo (pdf + png + the content JSON used).
        try {
          const dir = path.join(ROOT, 'assets/generated/lessons');
          fs.mkdirSync(dir, { recursive: true });
          const base = path.join(dir, `${contentId}.${locale || 'en'}`);
          if (pdf) fs.writeFileSync(`${base}.pdf`, pdf);
          fs.writeFileSync(`${base}.png`, png);
          fs.writeFileSync(`${base}.json`, JSON.stringify(parsed, null, 2));
          log(`Saved to assets/generated/lessons/${contentId}.${locale || 'en'}.{pdf,png,json}`);
        } catch (e) { log(`(could not save to repo: ${e.message})`); }
        // Second pass with the generated artwork's real dimensions (resolution check).
        if (figureReport) {
          try {
            const dims = {};
            for (const im of parsed.images || []) {
              const hit = require('../lp-render/store/assets').get(require('../lp-render/store/assets').keyFor(im.prompt));
              if (!hit) continue;
              const buf = Buffer.from(hit.dataUri.split(',')[1], 'base64');
              if (buf[0] === 0x89) dims[im.id] = { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
              else { // JPEG: walk the segments for SOFn
                for (let i = 2; i < buf.length - 9;) {
                  if (buf[i] !== 0xFF) { i++; continue; }
                  const m = buf[i + 1];
                  if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
                    dims[im.id] = { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) }; break;
                  }
                  i += 2 + buf.readUInt16BE(i + 2);
                }
              }
            }
            figureReport = validateFigures(parsed, { source: srcForValidation, imageDims: dims, log });
          } catch (e) { log(`  (resolution check skipped: ${e.message})`); }
        }
        finish({
          ok: true,
          figureReport,
          png: 'data:image/png;base64,' + png.toString('base64'),
          pdf: pdf ? 'data:application/pdf;base64,' + pdf.toString('base64') : null,
          logs, stats, structured,
        });
      } catch (e) {
        finish({ ok: false, error: e.message, logs });
      }
    });
    return;
  }
  send(res, 404, 'text/plain', 'not found');
}

// Start on PORT; if it's already in use, quietly try the next few ports instead of
// crashing with EADDRINUSE. Prints the URL it actually bound to.
function start(port, attemptsLeft) {
  const server = http.createServer(handler);
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.log(`Port ${port} is busy — trying ${port + 1}…`);
      start(port + 1, attemptsLeft - 1);
    } else {
      console.error(`Could not start LP Studio: ${e.message}`);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    console.log('\n  LP Studio — build: region-casts + robust-extraction + paginated-pdf (R1–R26)');
    console.log(`\n  LP Studio → http://localhost:${port}\n`);
    console.log(process.env.KIE_API_KEY ? '  (kie.ai key loaded — new images can be generated)' : '  (no kie.ai key — store-only: only already-stored images render)');
    console.log('  Press Ctrl+C to stop.\n');
  });
}
start(Number(PORT) || 5178, 12);
