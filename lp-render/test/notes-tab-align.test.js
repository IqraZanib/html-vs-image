'use strict';
// LAYOUT RULE: the ملاحظات tab must stay inside the teacher-notes strip.
//
// The strip is ::after and its tab is ::before on the same section, so neither can
// measure the other. Their heights were maintained separately and drifted: a later
// theme round trimmed the strip to 66px while the tab stayed at 72px, so the tab
// stood 8px above the strip's top edge and looked like it was floating. Both now
// derive from one custom property, and this test fails if they ever come apart again.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { THEME_CSS } = require('../decorative/theme');

function chromePath() {
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

test('the notes tab sits inside the notes strip, never above it', async (t) => {
  const exe = chromePath();
  if (!exe) return t.skip('no chromium available');
  const { chromium } = require('playwright-core');
  const regionCss = require('../decorative/regions/ye/theme').THEME_OVERRIDE_CSS;
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">`
    + `<style>${THEME_CSS}</style><style>${regionCss}</style></head><body>`
    + `<div class="section sec-stage-taqwim"><div class="s-head"><div class="s-tab">`
    + `<span class="s-title">التقويم والختام</span></div></div>`
    + `<div class="panel"><div class="ii-body"><div class="d-text">اطلب من التلميذ الإجابة شفهيًا.</div></div></div>`
    + `</div></body></html>`;
  const file = path.join(os.tmpdir(), `notes-tab-${process.pid}.html`);
  fs.writeFileSync(file, html);
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  try {
    for (const width of [700, 794, 900]) {
      const page = await browser.newPage();
      await page.setViewportSize({ width, height: 900 });
      await page.goto('file://' + file);
      const g = await page.evaluate(() => {
        const sec = document.querySelector('.section.sec-stage-taqwim');
        const panel = sec.querySelector('.panel');
        const num = (v) => parseFloat(v) || 0;
        const after = getComputedStyle(sec, '::after');
        const before = getComputedStyle(sec, '::before');
        const secB = sec.getBoundingClientRect(), panB = panel.getBoundingClientRect();
        // the strip is everything in the section below the panel (plus its margin)
        const stripTop = panB.bottom + num(after.marginTop);
        const stripBottom = secB.bottom;
        // the tab is positioned from the section's bottom edge
        const tabBottom = secB.bottom - num(before.bottom);
        const tabTop = tabBottom - num(before.height);
        return { stripTop, stripBottom, tabTop, tabBottom, tabHeight: num(before.height) };
      });
      assert.ok(g.tabHeight > 20, `the tab should be a real block, got ${g.tabHeight}px`);
      // The tab may sit flush with the strip or just inside it, never outside.
      assert.ok(g.tabTop >= g.stripTop - 0.5,
        `at ${width}px the tab rises ${(g.stripTop - g.tabTop).toFixed(1)}px above the strip's top`);
      assert.ok(g.tabBottom <= g.stripBottom + 0.5,
        `at ${width}px the tab hangs ${(g.tabBottom - g.stripBottom).toFixed(1)}px below the strip's bottom`);
      // and it must actually reach the strip: a tab far short of the edges reads as
      // floating, which is the complaint this rule exists for.
      const slackTop = g.tabTop - g.stripTop, slackBottom = g.stripBottom - g.tabBottom;
      assert.ok(slackTop <= 4 && slackBottom <= 4,
        `at ${width}px the tab is inset ${slackTop.toFixed(1)}px/${slackBottom.toFixed(1)}px — it should sit flush (within the 2px border)`);
      await page.close();
    }
  } finally {
    await browser.close();
    fs.rmSync(file, { force: true });
  }
});
