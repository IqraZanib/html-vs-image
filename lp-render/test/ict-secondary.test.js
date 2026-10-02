'use strict';
// ICT grades 6–12 lessons in NIETE's approved design — ICT's own production page (v9.3 phone page,
// printed as two parts; the approved Grade 9 English, Grade 7 Mathematics and Grade 6 Urdu
// references, 2026-10-02). Real ICT lp_docs go through the adapter (guide/from-lpdoc.js) to the
// page (regions/ict/secondary.js) and are printed one page per part (render/part-pages-pdf.js).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { buildGuideFromLpDoc } = require('../guide/from-lpdoc');
const { composeSecondary } = require('../decorative/regions/ict/secondary');
const { pacingBar, subjectKind } = require('../decorative/regions/ict/secondary-art');

const FX = path.join(__dirname, '..', 'fixtures', 'ict');
const load = (f) => JSON.parse(fs.readFileSync(path.join(FX, f), 'utf8'));
const LESSONS = [
  ['G6 Islamiat (Urdu)', 'authored_PK_G6_ISLAMIAT_CH4_MASHAWARAT.lp.json'],
  ['G7 General Science', 'authored_PK_G7_GSCI_CH1_PHOTOSYNTHESIS.lp.json'],
  ['G8 English', 'authored_PK_G8_ENG_CH6_THE_BELLS_CLOSE_READING.lp.json'],
  ['G9 Mathematics (ICT gate lesson)', 'niete_v9_gate_base.lp.json'],
  ['G9 Physics', 'authored_PK_G9_PHYS_CH2_MOTION_UNDER_GRAVITY.lp.json'],
  ['G10 Urdu', 'authored_PK_G10_URDU_CH1_AKHLAQ_E_NABVI_BULAND_KHWANI.lp.json'],
  ['G11 Chemistry', 'authored_PK_G11_CHEM_CH4_MOLE_RATIO.lp.json'],
];
// images as the pipeline hands them over: ICT's diagrams, drawn by its own engine, by id
const imagesOf = (guide) => Object.fromEntries((guide.images || []).map((im) => [im.id, { dataUri: im.dataUri, label: im.label }]));
const compose = (f) => { const { guide } = buildGuideFromLpDoc(load(f)); return { guide, out: composeSecondary(guide, imagesOf(guide)) }; };
const words = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<annotation[\s\S]*?<\/annotation>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const norm = (s) => String(s).replace(/⁠/g, '').replace(/\*\*/g, '').replace(/[✗✓⚠📺🧰⏱🔑]️?/gu, ' ').replace(/\s+/g, ' ').trim();

// every string of every card, with the card it came from
function strings(sec, out = []) {
  for (const k of ['body', 'label', 'lead', 'heading', 'time']) if (sec[k]) out.push([sec.id, sec[k]]);
  for (const it of sec.items || []) for (const k of ['text', 'tag', 'q', 'a']) if (it[k]) out.push([sec.id, it[k]]);
  for (const b of [...(sec.left || []), ...(sec.right || [])]) strings({ ...b, id: sec.id }, out);
  return out;
}

test('every card ICT prints reaches the page, word for word (seven real lessons, grades 6–11, four subjects in two languages)', () => {
  for (const [name, f] of LESSONS) {
    const { guide, out } = compose(f);
    const page = norm(words(out.bodyHtml));
    assert.deepStrictEqual(out.counts.unknown, [], `${name}: every card has a layout`);
    let checked = 0;
    for (const [id, s] of guide.sections.flatMap((sec) => strings(sec))) {
      // maths is drawn by KaTeX; the words around it must be on the page as written
      for (const raw of String(s).split(/\$[^$]+\$/)) {
        // a label's parts may print as separate chips (the outcome code is a pill), so each part is checked
        for (const ln of raw.split('\n').flatMap((l) => l.split(' · '))) {
          const piece = norm(ln.replace(/^\s*(?:\d+\.|[-•])\s+/, ''));
          if (piece.replace(/[\s.,;:—–()→←·|-]/g, '').length < 3) continue;
          checked += 1;
          assert.ok(page.includes(piece), `${name}: «${piece.slice(0, 60)}» (${id}) is on the page`);
        }
      }
    }
    assert.ok(checked > 60, `${name}: ${checked} strings checked`);
  }
});

test('the page is the approved one: two parts, the lesson then the teacher support, stage bars in ICT\'s order', () => {
  const { out } = compose('niete_v9_gate_base.lp.json');
  const h = out.bodyHtml;
  assert.deepStrictEqual(out.pageLayout, { width: 520, parts: true });
  assert.strictEqual((h.match(/<section class="spart"/g) || []).length, 2, 'two parts');
  const [p1, p2] = h.split('<section class="spart"').slice(1);
  assert.ok(/class="shero"/.test(p1) && !/class="shero"/.test(p2), 'the title card opens part 1');
  assert.ok(/Teacher support · not for the board/.test(p2) && !/Teacher support · not for the board/.test(p1), 'part 2 is the teacher support');
  assert.deepStrictEqual([...p1.matchAll(/class="sbar sb-(\w+)"/g)].map((m) => m[1]), ['introduction', 'development', 'activity', 'conclusion', 'homework']);
  assert.deepStrictEqual([...p2.matchAll(/<span class="sgl">(\w)<\/span>/g)].map((m) => m[1]), ['A', 'B', 'C', 'D'], 'the support groups lettered A–D');
  assert.strictEqual((p1.match(/<span class="sbi"><svg/g) || []).length, 5, 'a picture on every stage bar');
  assert.ok(/Support pages follow/.test(p1), 'part 1 ends by saying the support follows');
  assert.ok(/Record up to 40 minutes of this lesson/.test(p2) && !/03\d{2}\s?\d{7}/.test(words(h)), 'the coaching steps print; the number does not, until that is decided');
});

test('Urdu lessons read right to left in their own labels, as the approved Urdu page does', () => {
  const { out } = compose('authored_PK_G10_URDU_CH1_AKHLAQ_E_NABVI_BULAND_KHWANI.lp.json');
  const h = out.bodyHtml;
  assert.ok(h.startsWith('<div class="icts" lang="ur" dir="rtl"'));
  for (const l of ['تعارف', 'تدریس', 'سرگرمی', 'اختتام', 'گھر کا کام', 'کوچنگ کارنر', 'صفحہ {n} از {m}']) assert.ok(h.includes(l), l);
  assert.ok(/اس سبق کی چالیس منٹ تک کی ریکارڈنگ بنائیے/.test(h), 'the coaching steps in Urdu');
});

test('the pacing bar is the lesson\'s own pacing line, or nothing', () => {
  const st = ['introduction', 'development', 'activity', 'conclusion', 'homework'];
  const bar = pacingBar('⏱ **Pacing** 10 + 12 + 12 + 4 + 2 = 40 min', st);
  assert.ok(/aria-label="pacing 10 \+ 12 \+ 12 \+ 4 \+ 2 = 40 minutes"/.test(bar));
  assert.strictEqual((bar.match(/<rect /g) || []).length, 5, 'one segment per stage');
  assert.strictEqual(pacingBar('10 + 12 + 12 + 4 + 2 = 41 min', st), '', 'numbers that do not add up draw nothing');
  assert.strictEqual(pacingBar('10 + 30 = 40 min', st), '', 'one number per stage, or nothing');
  assert.strictEqual((pacingBar('10 + 15 + 10 + 5 + 0 = 40 منٹ', st).match(/<rect /g) || []).length, 4, 'a 0-minute stage takes no room');
});

test('each subject gets its own title picture, chosen by the subject only', () => {
  assert.strictEqual(subjectKind('Mathematics'), 'maths');
  assert.strictEqual(subjectKind('Urdu'), 'urdu');
  assert.strictEqual(subjectKind('General Science'), 'science');
  assert.strictEqual(subjectKind('Chemistry'), 'chemistry');
  assert.strictEqual(subjectKind('Islamiat'), 'islamiat');
  assert.strictEqual(subjectKind('Something new'), 'general');
});

test('isolation: grades 6–12 and Grades 1–5 each get their own page, and share no style', () => {
  const pack = require('../decorative/regions/ict/theme');
  const g612 = buildGuideFromLpDoc(load('niete_v9_gate_base.lp.json')).guide;
  const a = pack.COMPOSE(g612, imagesOf(g612));
  assert.ok(a.bodyHtml.startsWith('<div class="icts"') && /\.icts\b/.test(a.headCss) && !/\.ictq\b/.test(a.headCss));
  const { buildGuideFromPrimary } = require('../guide/from-primary');
  const g15 = buildGuideFromPrimary(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'ict-primary', 'g1_ch9_Maths_seg1.lesson.json'), 'utf8'))).guide;
  const b = pack.COMPOSE(g15, {});
  assert.ok(b.bodyHtml.startsWith('<div class="ictq"') && !/\.icts\b/.test(b.headCss));
  assert.deepStrictEqual(b.pageLayout, { width: 520, height: 2000, flow: true }, 'Grades 1–5 keep their own pages');
  for (const f of ['primary.js', 'primary-art.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'decorative', 'regions', 'ict', f), 'utf8');
    assert.ok(!/secondary/.test(src), `${f} does not reach into the grades 6–12 page`);
  }
  for (const f of ['secondary.js', 'secondary-art.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'decorative', 'regions', 'ict', f), 'utf8');
    assert.ok(!/require\([^)]*primary/.test(src), `${f} does not import the Grades 1–5 page`);
  }
});

// ── printed ───────────────────────────────────────────────────────────────────────────────
const mediaBoxes = (pdf) => [...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
for (const [name, f, lang] of [['G9 Mathematics', 'niete_v9_gate_base.lp.json', 'en'], ['G10 Urdu', 'authored_PK_G10_URDU_CH1_AKHLAQ_E_NABVI_BULAND_KHWANI.lp.json', 'ur']]) {
  test(`${name} prints as the approved design does: two 390 pt pages, each as tall as its part, nothing outside, nothing bought`, { timeout: 180000 }, async () => {
    const { renderLessonImage } = require('../pipeline');
    const { guide } = buildGuideFromLpDoc(load(f));
    const r = await renderLessonImage(guide, { apiKey: '', pdf: true, log: () => {} });
    const boxes = mediaBoxes(r.pdf);
    assert.strictEqual(boxes.length, 2, 'two pages');
    for (const [w, h] of boxes) { assert.ok(Math.abs(w - 390) < 0.5, `width ${w}`); assert.ok(h > 500, `height ${h}`); }
    assert.ok(boxes[0][1] > boxes[1][1], 'the lesson is the longer part');
    assert.deepStrictEqual(r.overflow, [], 'nothing leaves its page');
    assert.strictEqual(r.stats.generated, 0, 'no picture generated');
    assert.ok(![...r.html.matchAll(/<img [^>]*src="([^"]{0,30})/g)].some((m) => !/^data:image\/svg\+xml/.test(m[1])), 'every picture is SVG');
    assert.ok(r.html.includes(`<div class="icts" lang="${lang}"`) && /page 1 of 2|صفحہ 1 از 2/.test(r.html), 'the .html is the printed pages, numbered');
    assert.ok(!/katex-error|mjx-merror|data-mjx-error/.test(r.html), 'every formula parsed');
  });
}
