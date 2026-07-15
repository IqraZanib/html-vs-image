const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const { fontFaceCss } = require('./fonts');

let counter = 0;

function injectFontCss(html) {
  const style = `<style id="bundled-fonts">\n${fontFaceCss()}\n</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, style + '</head>');
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + style);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + '<head>' + style + '</head>');
  return style + html;
}

async function renderHtml(html, outPath, opts = {}) {
  const injectFonts = opts.injectFonts !== false;
  const finalHtml = injectFonts ? injectFontCss(html) : html;
  const tmpPath = path.join(os.tmpdir(), `lp-${process.pid}-${counter++}.html`);
  fs.writeFileSync(tmpPath, finalHtml);

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 820, height: 1160, deviceScaleFactor: 2 });
    await page.goto('file://' + tmpPath, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const dims = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
    }));
    const overflowed = dims.width > dims.clientWidth + 2;
    await page.screenshot({ path: outPath, fullPage: true });
    return { pngPath: outPath, overflowed, dims };
  } finally {
    await browser.close();
    fs.unlinkSync(tmpPath);
  }
}

module.exports = { injectFontCss, renderHtml };
