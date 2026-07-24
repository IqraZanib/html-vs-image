'use strict';
const fs = require('node:fs');
const { chromium } = require('playwright-core');

let _browser = null;
let _launching = null;

// Resolve a Chromium executable. Honors env overrides (as rumi does), then
// common system paths, then a puppeteer-installed Chromium if present locally.
function resolveChromiumPath() {
  const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const candidates = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  try {
    const pptr = require('puppeteer');
    if (typeof pptr.executablePath === 'function') {
      const p = pptr.executablePath();
      if (p && fs.existsSync(p)) return p;
    }
  } catch (_) { /* puppeteer not installed — fine */ }
  return undefined; // let Playwright try its own default; may throw (handled by caller/skip)
}

async function getBrowser() {
  if (_browser) return _browser;
  if (_launching) return _launching;
  _launching = chromium.launch({
    headless: true,
    executablePath: resolveChromiumPath(),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
  }).then((b) => { _browser = b; _launching = null; return b; });
  return _launching;
}

const DEFAULT_PDF = { format: 'A4', printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' } };

async function htmlToPdf(html, options = {}) {
  const { timeout = 30000, pdfOptions = {} } = options;
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle', timeout });
    await page.evaluate(async () => { await document.fonts.ready; });
    const buf = await page.pdf({ ...DEFAULT_PDF, ...pdfOptions });
    return buf;
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (_browser) { await _browser.close(); _browser = null; }
}

for (const sig of ['exit', 'SIGINT', 'SIGTERM']) {
  process.on(sig, () => { if (_browser) { try { _browser.close(); } catch (_) {} } });
}

module.exports = { htmlToPdf, closeBrowser };
