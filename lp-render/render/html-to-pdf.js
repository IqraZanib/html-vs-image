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

// A4 width at 96dpi, used for the content-fit layout width.
const FIT_WIDTH_PX = 794;

// pageMode:
//   'a4'  (default) — fixed A4 pages; matches rumi's primitive exactly.
//   'fit'           — one page sized to the content, so the PDF has NO empty
//                     space anywhere (no fixed-page bottom gaps, no blank tail).
async function htmlToPdf(html, options = {}) {
  const { timeout = 30000, pdfOptions = {}, pageMode = 'a4' } = options;
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    if (pageMode === 'fit') {
      await page.setViewportSize({ width: FIT_WIDTH_PX, height: 1123 });
    }
    await page.setContent(html, { waitUntil: 'networkidle', timeout });
    await page.evaluate(async () => { await document.fonts.ready; });
    if (pageMode === 'fit') {
      const height = Math.ceil(await page.evaluate(() => document.documentElement.scrollHeight));
      // Override the shell's `@page{size:A4}` with a single content-sized page so
      // Chromium does NOT paginate at A4 boundaries (which clipped tall lessons).
      await page.addStyleTag({ content: `@page{size:${FIT_WIDTH_PX}px ${height}px;margin:0}` });
      return await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        ...pdfOptions,
      });
    }
    const merged = { ...DEFAULT_PDF, ...pdfOptions,
      margin: { ...DEFAULT_PDF.margin, ...(pdfOptions.margin || {}) } };
    return await page.pdf(merged);
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
