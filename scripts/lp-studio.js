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
  if (req.method === 'POST' && req.url === '/render') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 5e6) req.destroy(); });
    req.on('end', async () => {
      const logs = []; const log = (m) => logs.push(m);
      try {
        const { content } = JSON.parse(body);
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
        const { png, pdf, stats, contentId, locale } = await renderLessonImage(parsed, { log, pdf: true }); // PNG preview + PDF download (final product)
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
        send(res, 200, 'application/json', JSON.stringify({
          ok: true,
          png: 'data:image/png;base64,' + png.toString('base64'),
          pdf: pdf ? 'data:application/pdf;base64,' + pdf.toString('base64') : null,
          logs, stats, structured,
        }));
      } catch (e) {
        send(res, 200, 'application/json', JSON.stringify({ ok: false, error: e.message, logs }));
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
