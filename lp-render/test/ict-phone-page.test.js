'use strict';
// ICT's delivery format, as ICT prints it (NIETE-Rumi bot/vendor/lp-v9, v9.3 phone page + the v6
// two-page print the operator approved on 2026-09-24): a 520px page, the whole lesson on page 1
// and the teacher support on page 2, each page as tall as its part. And the components that
// print differently on that page: figures at ICT's own slot, answers in green, MCQ keys, the
// short-response card beside its own mark scheme.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { buildGuideFromLpDoc } = require('../guide/from-lpdoc');

const FX = path.join(__dirname, '..', 'fixtures', 'ict');
const load = (f) => JSON.parse(fs.readFileSync(path.join(FX, f), 'utf8'));
const NIETE = () => load('niete_v9_gate_base.lp.json');
const URDU = () => load('authored_PK_G10_URDU_CH1_AKHLAQ_E_NABVI_BULAND_KHWANI.lp.json');
const ENGLISH = () => load('authored_PK_G8_ENG_CH6_THE_BELLS_CLOSE_READING.lp.json');
const svgOf = (im) => Buffer.from(im.dataUri.split(',')[1], 'base64').toString('utf8');
const sizeOf = (svg) => { const m = /<svg\b[^>]*\swidth="([\d.]+)" height="([\d.]+)"/.exec(svg); return m && [Number(m[1]), Number(m[2])]; };

test('every figure is sized to ICT\'s own slot: never wider than the 455px column, never smaller than its labels allow', () => {
  const { requiredBox } = require('../guide/vendor/lp_diagrams/lib/svg');
  for (const doc of [NIETE(), URDU(), ENGLISH()]) {
    const { guide } = buildGuideFromLpDoc(doc);
    for (const im of guide.images) {
      const svg = svgOf(im);
      const [w, h] = sizeOf(svg);
      const box = requiredBox(svg, { minPx: 8.43, colPx: 455 });
      assert.ok(w <= 455, `${im.id} fits the column (${w}px)`);
      assert.strictEqual(w, Math.min(455, box.minWidthPx), `${im.id} is drawn at ICT's slot`);
      assert.ok(Math.abs(h - w * box.vbH / box.vbW) < 0.2, `${im.id} keeps its aspect`);
    }
  }
  // the hundred-square board plan prints compact, as ICT prints it (its --fig-h is 200px)
  const grid = sizeOf(svgOf(buildGuideFromLpDoc(NIETE()).guide.images[1]));
  assert.ok(grid[1] <= 200, `board plan ${grid[1]}px tall`);
});

test('a teaching figure wears ICT\'s badge in the lesson\'s language; the board plan wears none', () => {
  const en = buildGuideFromLpDoc(NIETE()).guide.images;
  assert.strictEqual(en[0].label, 'Geometry');
  assert.strictEqual(en[1].label, '', 'the support page\'s board plan: no badge, as in ICT');
  const ur = buildGuideFromLpDoc(URDU()).guide.images;
  assert.strictEqual(ur[0].label, 'مرحلہ وار خاکہ', 'a flow, labelled in Urdu from ICT\'s own table');
});

test('an answer prints green: its words bolded, its maths coloured, the text itself unchanged', () => {
  const { guide } = buildGuideFromLpDoc(NIETE());
  const wu = guide.sections.find((s) => s.id === 'ict-warmup');
  assert.match(wu.items[0].text, /→ \$\\color\{#1F7A4D\}\{26\}\$$/, 'a number answer');
  assert.match(wu.items[2].text, /→ \$\\displaystyle \\color\{#1F7A4D\}\{\\begin\{bmatrix\}/, 'a matrix answer, still at full height');
  const pr = guide.sections.find((s) => s.id === 'ict-practice');
  assert.match(pr.items[0].text, /\*\*Defined, because the inner orders match; the product is\*\* \$\\color\{#1F7A4D\}\{2\\times2\}\$\*\*\.\*\*$/);
  const katex = require('katex');
  for (const s of guide.sections) for (const it of s.items || []) {
    for (const m of String(it.text || '').matchAll(/\$([^$]+)\$/g)) {
      assert.doesNotThrow(() => katex.renderToString(m[1], { throwOnError: true }), m[1]);
    }
  }
});

test('the exam bank prints as ICT\'s cards: one MCQ card each with exactly one key, the SRQ beside its own mark scheme', () => {
  const { guide } = buildGuideFromLpDoc(NIETE());
  const ids = guide.sections.map((s) => s.id);
  const mcqs = guide.sections.filter((s) => s.id === 'ict-mcq');
  assert.strictEqual(mcqs.length, 2);
  for (const q of mcqs) {
    assert.strictEqual(q.type, 'split');
    const opts = q.left.find((x) => /ict-r-mcqopts/.test(x.cls));
    assert.strictEqual(opts.items.filter((o) => o.tag === '✓').length, 1, 'one key per question');
    assert.ok(opts.items.every((o) => /^\*\*[A-E]\.\*\* /.test(o.text)), 'each option carries its letter in bold');
  }
  assert.strictEqual(ids[ids.indexOf('ict-mcq') - 1], 'ict-grouplabel', 'the MCQs sit under their group label');
  assert.strictEqual(ids[ids.indexOf('ict-srq') + 1], 'ict-srqms', 'the mark scheme follows the question, as its own card');
  assert.ok(!guide.sections.find((s) => s.id === 'ict-srq').body.includes('Mark scheme'));
  const hw = guide.sections.find((s) => s.id === 'ict-hwkey');
  assert.match(hw.items[0].text, /^\*\*H1 · 1 marks\*\*\n/, 'the ref and marks head each homework row');
  assert.ok(hw.items.every((it) => !/→/.test(it.text)), 'the answer sits on its own line, no arrow');
});

test('only the ICT pack declares a page layout of its own', () => {
  const dir = path.join(__dirname, '..', 'decorative', 'regions');
  for (const r of fs.readdirSync(dir)) {
    const f = path.join(dir, r, 'theme.js');
    if (!fs.existsSync(f)) continue;
    const pack = require(f);
    if (r === 'ict') assert.deepStrictEqual(pack.PAGE_LAYOUT, { width: 520, onePagePerPart: true });
    else assert.strictEqual(pack.PAGE_LAYOUT, undefined, `${r} keeps the A4 composer`);
  }
});

// The rendered PDF: Chromium writes each page's MediaBox in the clear.
const mediaBoxes = (pdf) => [...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)]
  .map((m) => [Number(m[1]), Number(m[2])]);

for (const [name, doc, lang] of [['G9 Maths (English)', NIETE, 'en'], ['G10 Urdu', URDU, 'ur']]) {
  test(`${name} prints as ICT prints it: two phone-width pages, lesson then support, nothing outside its card`, { timeout: 120000 }, async () => {
    const { renderLessonImage } = require('../pipeline');
    const { guide } = buildGuideFromLpDoc(doc());
    const r = await renderLessonImage(guide, { apiKey: '', pdf: true });
    const boxes = mediaBoxes(r.pdf);
    assert.strictEqual(boxes.length, 2, 'page 1 the lesson, page 2 the teacher support');
    for (const [w] of boxes) assert.strictEqual(w, 390, '520px = 390pt wide');
    assert.ok(boxes[0][1] > boxes[1][1], 'the lesson is the longer part');
    assert.deepStrictEqual(r.overflow, [], 'no content outside its card, nothing wider than the page');
    assert.strictEqual(r.stats.generated, 0, 'nothing bought');
    assert.strictEqual(Buffer.from(r.png).readUInt32BE(16), 520, 'the preview is the phone page too');
    assert.ok(r.html.includes(`<html lang="${lang}" dir="${lang === 'ur' ? 'rtl' : 'ltr'}"`));
    assert.ok(!/katex-error|mjx-merror|data-mjx-error/.test(r.html), 'every formula parsed');
  });
}
