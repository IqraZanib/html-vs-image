'use strict';
// One page per PART, printed by the browser — the ICT (NIETE) delivery format.
//
// ICT's approved design (operator sign-off 2026-09-24; NIETE-Rumi bot/vendor/lp-v9,
// lib/continuous.js): "keep it 2 pages, 1 page teaching, next page teacher support, dont mix
// it up". Each part is printed on ONE phone-width page whose height is that part's own measured
// height, so nothing is cut and nothing is padded. With no page to fill there is nothing to
// slice, so this prints the page straight from the browser (vector, selectable text), the way
// ICT's own renderer does, instead of cutting a screenshot into pages like png-to-pdf.js.
//
// A PART starts at every section the producer marked .lp-break-before (the lp_doc adapter marks
// the first support section) and ends with a footer: the lesson's locator on one line and
// "page N of M" under it, both in the lesson's own words (opts.footerText, opts.pageLabel).
//
// Only a region pack that declares PAGE_LAYOUT.onePagePerPart reaches this file (the ICT pack,
// today). Every other region's PDF is composed by png-to-pdf.js exactly as before.
const fs = require('node:fs');
const { chromium } = require('playwright-core');

function chromePath() {
  for (const c of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) if (fs.existsSync(c)) return c;
  try { const p = require('puppeteer').executablePath(); if (p && fs.existsSync(p)) return p; } catch (_) { /* fine */ }
  return undefined;
}

// Runs in the page. Rebuilds the body as one block per part (each a copy of the sheet holding
// only that part's sections, so every selector still matches exactly as on screen), adds each
// part's footer, and measures the parts. Returns the heights plus what the probe found.
const BUILD_PARTS = ({ W, footerText, pageLabel, dir }) => {
  const sheet = document.querySelector('.sheet');
  if (!sheet) return null;
  const secs = [...sheet.querySelectorAll(':scope > .body > .section')];
  const starts = secs.map((s, i) => (i > 0 && s.classList.contains('lp-break-before') ? i : -1)).filter((i) => i > 0);
  const bounds = [0, ...starts, secs.length];
  const n = bounds.length - 1;
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // What the probe reports, measured on the laid-out page BEFORE it is split: nothing may be
  // wider than the phone page, and no text may leave the card it belongs to.
  const overflow = [];
  const docW = document.documentElement.scrollWidth;
  if (docW > W + 1) overflow.push({ kind: 'page_wider_than_format', text: `${docW}px > ${W}px` });
  const outside = (a, b, pad) => a.left < b.left - pad || a.right > b.right + pad;
  sheet.querySelectorAll('.body > .section').forEach((sec) => {
    const sb = sec.getBoundingClientRect();
    sec.querySelectorAll('.d-text, .d-note, li, .d-img, .katex, svg, img').forEach((el) => {
      const eb = el.getBoundingClientRect();
      if (eb.width && outside(eb, sb, 1.5)) overflow.push({ kind: 'content_outside_card', text: (el.textContent || el.tagName).trim().slice(0, 28) });
    });
  });

  const pages = [];
  for (let k = 0; k < n; k++) {
    const copy = sheet.cloneNode(true);
    if (k > 0) copy.querySelectorAll(':scope > .lp-header').forEach((h) => h.remove());
    [...copy.querySelectorAll(':scope > .body > .section')].forEach((s, i) => { if (i < bounds[k] || i >= bounds[k + 1]) s.remove(); });
    const label = String(pageLabel || '{n} / {m}').replace('{n}', k + 1).replace('{m}', n);
    const foot = document.createElement('div');
    foot.className = 'lp-partfoot';
    foot.setAttribute('dir', dir === 'rtl' ? 'rtl' : 'ltr');
    foot.innerHTML = `<div class="pf-l">${esc(footerText)}</div><div class="pf-r">${esc(label)}</div>`;
    copy.appendChild(foot);
    const pg = document.createElement('div');
    pg.className = 'lp-pg';
    pg.setAttribute('data-part', String(k + 1));
    pg.appendChild(copy);
    pages.push(pg);
  }
  document.body.replaceChildren(...pages);
  const heights = pages.map((pg) => Math.ceil(pg.getBoundingClientRect().height) + 1);
  const css = heights.map((h, k) => `@page part${k + 1}{size:${W}px ${h}px;margin:0}`
    + `.lp-pg[data-part="${k + 1}"]{page:part${k + 1};height:${h}px}`).join('');
  const st = document.createElement('style');
  st.textContent = `html,body{margin:0;padding:0;width:${W}px}.lp-pg{width:${W}px;overflow:hidden;position:relative}${css}`;
  document.head.appendChild(st);
  return { heights, overflow };
};

async function htmlToPartPagesPdf(html, opts = {}) {
  const W = Number(opts.pageWidth) || 520;
  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'] });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: W, height: 2000 });
    // Screen styles, printed as they are laid out on screen: the page the teacher sees in the
    // preview is the page in the PDF.
    await page.emulateMedia({ media: 'screen' });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; });
    const got = await page.evaluate(BUILD_PARTS, { W, footerText: opts.footerText || '', pageLabel: opts.pageLabel || '', dir: opts.dir || 'ltr' });
    if (!got || !got.heights.length) throw new Error('no parts to print');
    if (typeof opts.onFindings === 'function') opts.onFindings(got.overflow);
    await page.evaluate(async () => { await document.fonts.ready; });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
    return { pdf, heights: got.heights };
  } finally { await browser.close(); }
}

module.exports = { htmlToPartPagesPdf, BUILD_PARTS };
