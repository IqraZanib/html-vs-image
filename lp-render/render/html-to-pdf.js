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
      // +2px guard: print layout can round a hair taller than the measured
      // scrollHeight, which would spill into a second (blank) page. The tiny
      // buffer keeps tall lessons on a single page with no visible gap.
      const height = Math.ceil(await page.evaluate(() => document.documentElement.scrollHeight)) + 2;
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
    if (pageMode === 'paged') {
      // Multi-page A4 with a "current / total" page-number band at the top of every
      // page. Sections use break-inside:avoid so they don't split across pages.
      //
      // The margin MUST also be set in CSS: Chromium gives an explicit `@page{margin}`
      // precedence over the pdf() `margin` option, and the shell already ships
      // `@page{margin:0}`. Without overriding it here, every continuation page prints
      // flush to the top edge and the page number overlaps the first section. We set
      // the same values in CSS (later rule wins the cascade) and on the API so the
      // header band and the content start line agree.
      const M = { top: '14mm', right: '0', bottom: '12mm', left: '0' };
      await page.addStyleTag({ content: `@page{size:A4;margin:${M.top} ${M.right} ${M.bottom} ${M.left}}` });
      const header = '<div style="width:100%;font-family:system-ui,sans-serif;font-size:9px;color:#9aa3b5;'
        + 'text-align:right;padding:4px 14px 0 0;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>';
      return await page.pdf({
        format: 'A4', printBackground: true,
        displayHeaderFooter: true, headerTemplate: header, footerTemplate: '<div></div>',
        ...pdfOptions,
        margin: { ...M, ...(pdfOptions.margin || {}) },
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
