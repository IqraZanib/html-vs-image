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

const server = http.createServer((req, res) => {
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
        let parsed; let structured = null;
        if (typeof content !== 'string') {
          parsed = content;
        } else {
          try {
            parsed = JSON.parse(content);
          } catch (_) {
            // Not JSON — treat the paste as a raw lesson plan and structure it.
            log('Input is not JSON — treating it as a raw lesson plan and structuring it…');
            if (!process.env.KIE_API_KEY) throw new Error('Raw text needs a kie.ai key to auto-structure. Paste a content JSON instead, or start the server with KIE_API_KEY set.');
            parsed = await structureLesson(content, { apiKey: process.env.KIE_API_KEY });
            structured = JSON.stringify(parsed, null, 2);
            log('Structured the raw text into a content JSON (kept its own words).');
          }
        }
        const { png, stats } = await renderLessonImage(parsed, { log });
        send(res, 200, 'application/json', JSON.stringify({ ok: true, png: 'data:image/png;base64,' + png.toString('base64'), logs, stats, structured }));
      } catch (e) {
        send(res, 200, 'application/json', JSON.stringify({ ok: false, error: e.message, logs }));
      }
    });
    return;
  }
  send(res, 404, 'text/plain', 'not found');
});

server.listen(PORT, () => {
  console.log(`LP Studio → http://localhost:${PORT}`);
  console.log(process.env.KIE_API_KEY ? '(kie.ai key loaded — new images can be generated)' : '(no kie.ai key — store-only: only lessons whose images are already stored will render)');
});
