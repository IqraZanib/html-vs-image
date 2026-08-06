#!/usr/bin/env node
'use strict';
// Compare TWO images of the same content ("this version was like this — now it's
// like this"). Prints a match score and writes a side-by-side composite:
//   [ OLD | NEW | DIFF ]   — DIFF paints every changed pixel red on a faint ground.
//
//   node scripts/visual-diff.js <old.png> <new.png> [--out=diff.png]
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../node_modules/playwright-core');

function chromePath() {
  for (const c of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) if (fs.existsSync(c)) return c;
  try { return require('../node_modules/puppeteer').executablePath(); } catch (_) { return undefined; }
}

(async () => {
  const args = process.argv.slice(2);
  const files = args.filter((a) => !a.startsWith('--'));
  const out = (args.find((a) => a.startsWith('--out=')) || '').slice('--out='.length) || 'visual-diff.png';
  if (files.length !== 2 || !fs.existsSync(files[0]) || !fs.existsSync(files[1])) {
    console.error('Usage: node scripts/visual-diff.js <old.png> <new.png> [--out=diff.png]'); process.exit(2);
  }
  const a = 'data:image/png;base64,' + fs.readFileSync(files[0]).toString('base64');
  const b = 'data:image/png;base64,' + fs.readFileSync(files[1]).toString('base64');

  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const page = await browser.newPage();
  const res = await page.evaluate(({ srcA, srcB, tol, gap }) => new Promise((resolve) => {
    const ia = new Image(); const ib = new Image(); let loaded = 0;
    const done = () => {
      if (++loaded < 2) return;
      const w = Math.max(ia.width, ib.width); const h = Math.max(ia.height, ib.height);
      const imgData = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x; };
      const xa = imgData(ia); const xb = imgData(ib);
      const da = xa.getImageData(0, 0, w, h); const db = xb.getImageData(0, 0, w, h);
      const diff = document.createElement('canvas'); diff.width = w; diff.height = h; const xd = diff.getContext('2d');
      const od = xd.createImageData(w, h); let changed = 0;
      for (let i = 0; i < da.data.length; i += 4) {
        const dd = Math.abs(da.data[i] - db.data[i]) > tol || Math.abs(da.data[i + 1] - db.data[i + 1]) > tol || Math.abs(da.data[i + 2] - db.data[i + 2]) > tol;
        if (dd) { od.data[i] = 255; od.data[i + 1] = 40; od.data[i + 2] = 40; od.data[i + 3] = 255; changed++; }
        else { od.data[i] = 238; od.data[i + 1] = 241; od.data[i + 2] = 247; od.data[i + 3] = 255; }
      }
      xd.putImageData(od, 0, 0);
      // labels
      const label = (x, text, colour) => { g.fillStyle = colour; g.font = 'bold 22px system-ui,sans-serif'; g.fillText(text, x + 12, 30); };
      const cw = w * 3 + gap * 2; const cv = document.createElement('canvas'); cv.width = cw; cv.height = h + 40;
      const g = cv.getContext('2d'); g.fillStyle = '#f2f4f9'; g.fillRect(0, 0, cw, h + 40);
      g.drawImage(xa.canvas, 0, 40); g.drawImage(xb.canvas, w + gap, 40); g.drawImage(diff, (w + gap) * 2, 40);
      label(0, 'OLD', '#5a6472'); label(w + gap, 'NEW', '#5a6472'); label((w + gap) * 2, 'CHANGES (red)', '#c53b1c');
      resolve({ dataUrl: cv.toDataURL('image/png'), score: 100 * (1 - changed / (da.data.length / 4)), changed, total: da.data.length / 4, w, h });
    };
    ia.onload = done; ib.onload = done; ia.onerror = () => resolve(null); ib.onerror = () => resolve(null);
    ia.src = srcA; ib.src = srcB;
  }), { srcA: a, srcB: b, tol: 12, gap: 24 });
  await browser.close();
  if (!res) { console.error('could not load images'); process.exit(1); }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, Buffer.from(res.dataUrl.split(',')[1], 'base64'));
  console.log(`\n  OLD: ${files[0]}`);
  console.log(`  NEW: ${files[1]}`);
  console.log(`  match: ${res.score.toFixed(2)}%  (${res.changed.toLocaleString()} of ${res.total.toLocaleString()} px changed)`);
  console.log(`  composite [OLD | NEW | CHANGES] → ${out}\n`);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
