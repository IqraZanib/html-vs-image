'use strict';
// ICT Grades 1–5 lessons in NIETE's approved phone-page design (lp_html v8.1; the Grade 1 English,
// Grade 1 Maths and Grade 2 Urdu references, 2026-10-01): one column, 520 px, on tall 520×2000
// pages; laid out by the ict pack's primary.js from an "ict-primary-lesson" file
// (guide/from-primary.js), with pictures drawn in code (primary-art.js), and flowed onto pages by
// render/phone-pages-pdf.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { buildGuideFromPrimary, isPrimaryLesson, printedTexts } = require('../guide/from-primary');
const { composePrimary } = require('../decorative/regions/ict/primary');
const art = require('../decorative/regions/ict/primary-art');

const FX = path.join(__dirname, '..', 'fixtures', 'ict-primary');
const load = (f) => JSON.parse(fs.readFileSync(path.join(FX, f), 'utf8'));
const MATHS = () => load('g1_ch9_Maths_seg1.lesson.json');
const ENGLISH = () => load('g1_ch10_English_seg1.lesson.json');
const URDU = () => load('g2_ch10_Urdu_seg2.lesson.json');
const ALL = [['Maths', MATHS], ['English', ENGLISH], ['Urdu', URDU]];
const compose = (doc) => composePrimary(buildGuideFromPrimary(doc).guide);
// the page's words, as a reader sees them: tags off, entities decoded, spaces collapsed
const words = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
// a source string as the page prints it: a pause mark becomes a chip (its number stays), a blank a line
const asPrinted = (s) => String(s).replace(/⏸/g, ' ').replace(/_{3,}/g, ' ').replace(/\s+/g, ' ').trim();

test('the three approved lessons are valid Grades 1–5 lesson files', () => {
  for (const [name, doc] of ALL) {
    assert.ok(isPrimaryLesson(doc()), name);
    const { guide, report } = buildGuideFromPrimary(doc());
    assert.strictEqual(guide.meta.region, 'ict');
    assert.strictEqual(guide.layout.kind, 'ict-primary');
    assert.deepStrictEqual(guide.images, [], `${name}: nothing to buy`);
    assert.deepStrictEqual(report.stages, ['opening', 'explanation', 'we_do', 'you_do', 'check', 'homework']);
    assert.ok(report.pictures >= 4, `${name}: ${report.pictures} pictures`);
  }
});

test('a lesson the page cannot lay out is refused, not printed with parts missing', () => {
  const bad = MATHS(); bad.stages[0].blocks.push({ type: 'poem', lines: ['x'] });
  assert.throws(() => buildGuideFromPrimary(bad), /no layout for block type "poem"/);
  const pic = MATHS(); pic.board[0].visual = { type: 'volcano' };
  assert.throws(() => buildGuideFromPrimary(pic), /no drawing for picture type "volcano"/);
  const time = MATHS(); time.hero_visual = { type: 'clock', time: 'nine' };
  assert.throws(() => buildGuideFromPrimary(time), /not h:mm/);
  const order = MATHS(); order.stages.reverse();
  assert.throws(() => buildGuideFromPrimary(order), /out of order/);
});

test('nothing the lesson says is dropped: every text prints on the page', () => {
  for (const [name, doc] of ALL) {
    const lesson = doc();
    const page = words(compose(lesson).bodyHtml);
    for (const s of printedTexts(lesson)) {
      // the page may wrap a teacher line in quotes and break a long paragraph between sentences
      for (const piece of asPrinted(s).split(/(?<=[.!?۔؟])\s+(?=[A-Z0-9"“‘'(؀-ۿ])/)) {
        // a read-aloud line's speaker is the name on its speech bubble ("Pinky: “…”" → Pinky “…”)
        const bubble = piece.replace(/^([^:“"]{1,40}):\s*(?=[“"])/, '$1 ');
        assert.ok(page.includes(piece.trim()) || page.includes(bubble.trim()), `${name}: «${piece.slice(0, 60)}» is on the page`);
      }
    }
  }
});

test('the approved pages\' print defects are fixed', () => {
  const m = words(compose(MATHS()).bodyHtml);
  assert.ok(m.includes('I am reading the analogue clock on p.222.'), 'the teacher line split at "p." is one line');
  assert.ok(!/model_solution/.test(m), 'no leaked key');
  assert.ok(!/\|-{3,}|-{4,}\s*hour hand/.test(m), 'no text-drawn clock');
  const e = compose(ENGLISH()).bodyHtml;
  assert.ok(!/model_solution/.test(e) && /Sample answer/.test(e), 'sample answers are named as such');
  assert.ok(!/\[TITLE \+ PICTURE/.test(words(e)), 'the board sketch note is a drawing, not text');
  const u = compose(URDU()).bodyHtml;
  assert.ok(!/avatar/.test(u), 'no internal word');
  assert.ok(/<table class="q-track"/.test(u) && !/\|جوڑی کا نام\|/.test(words(u)), 'the fluency tracker is a real table');
  assert.ok(/<div class="q-story" dir="rtl">/.test(u) && /←/.test(u) && !/q-story[^>]*>[^]*?→/.test(u.split('q-story')[1].split('</div>')[0]), 'the story map reads right to left with arrows that point that way');
  assert.ok(!/03\d{2}\s?\d{7}/.test(words(u) + words(e) + m), 'the coaching number is not printed yet');
});

test('Urdu: the page reads right to left in its own labels; an English-only line reads left to right', () => {
  const u = compose(URDU()).bodyHtml;
  assert.ok(u.startsWith('<div class="ictq" lang="ur" dir="rtl"'));
  for (const l of ['تختۂ سیاہ پر لکھیے', 'کلیدی الفاظ', 'تدریسی نتیجہ', 'اختتامی پرچی', 'کوچنگ کارنر', 'صفحہ {n} از {m}']) assert.ok(u.includes(l), l);
  assert.ok(/<div class="q-half" dir="ltr">.*Halfway check/.test(u), 'the English halfway note is left to right');
  assert.ok(/dir="rtl">Echo-Reading سہارا/.test(u), 'a line that starts with an English word still starts on the right');
  assert.ok(/<span class="q-pz"><i><\/i><i><\/i><b>۲<\/b><\/span>/.test(u), 'the pause sign ⏸۲ is drawn with its number');
  const e = compose(ENGLISH()).bodyHtml;
  assert.ok(e.startsWith('<div class="ictq" lang="en" dir="ltr"') && /Write on the board/.test(e));
});

test('the clocks are drawn at the lesson\'s own time: short thick hour hand, long thin minute hand', () => {
  const hands = (svgText) => [...svgText.matchAll(/<line x1="100" y1="100" x2="([\d.-]+)" y2="([\d.-]+)" stroke="(#[0-9A-F]+)" stroke-width="([\d.]+)"/gi)]
    .map((m) => ({ x: +m[1] - 100, y: +m[2] - 100, color: m[3], w: +m[4] }));
  const at = (t) => { const [h, mn] = hands(art.draw({ type: 'clock', time: t })); return { h, mn }; };
  const nine = at('9:00');
  assert.ok(nine.h.x < -30 && Math.abs(nine.h.y) < 1, 'at 9:00 the hour hand points to 9');
  assert.ok(Math.abs(nine.mn.x) < 1 && nine.mn.y < -60, 'and the minute hand to 12');
  assert.ok(Math.hypot(nine.h.x, nine.h.y) < Math.hypot(nine.mn.x, nine.mn.y) && nine.h.w > nine.mn.w, 'hour hand shorter and thicker');
  const eleven = at('11:00');
  assert.ok(eleven.h.x < 0 && eleven.h.y < 0 && Math.abs(Math.atan2(eleven.h.x, -eleven.h.y) * 180 / Math.PI + 30) < 0.5, 'at 11:00 the hour hand points to 11');
  const six = at('6:00');
  assert.ok(Math.abs(six.h.x) < 1 && six.h.y > 30, 'at 6:00 the hour hand points to 6');
  assert.throws(() => art.draw({ type: 'clock', time: '25:00' }), /not a time/);
  const pair = art.draw({ type: 'clock_pair', time: '9:00', digital: '09:00', digital_label: 'Hours | Minutes' });
  assert.ok(/>09:00</.test(pair) && />Hours</.test(pair) && />Minutes</.test(pair), 'the digital clock shows the lesson\'s digits and labels');
});

test('the letter pictures show the lesson\'s own sounds and word', () => {
  const b = art.draw({ type: 'blender', parts: ['s', 'u', 'nn', 'y'], word: 'sunny' });
  for (const t of ['>s<', '>u<', '>nn<', '>y<', '>sunny<']) assert.ok(b.includes(t), t);
  const steps = art.draw({ type: 'blend_steps', steps: [['s', 'u', 'su'], ['su', 'nn', 'sun'], ['sun', 'y', 'sunny']] });
  for (const t of ['>su<', '>sun<', '>sunny<']) assert.ok(steps.includes(t), `step ${t}`);
  assert.ok(!steps.includes('>sunn<'), 'the steps are the lesson\'s, not the letters joined');
  const list = art.draw({ type: 'blender_list', words: [['gr', 'ou', 'nd'], ['c', 'are']] });
  for (const t of ['>gr<', '>ou<', '>nd<', '>c<', '>are<']) assert.ok(list.includes(t), t);
  assert.ok(!/<image\b|data:image\/(png|jpe?g)/.test(b + steps + list), 'drawn, not pictures');
});

test('only the Grades 1–5 page names its own page layout; everything else in the ict pack is as before', () => {
  const pack = require('../decorative/regions/ict/theme');
  assert.deepStrictEqual(pack.PAGE_LAYOUT, { width: 896, height: 1200, fixedPages: true }, 'grades 6–12 keep their fixed pages');
  const c = pack.COMPOSE(buildGuideFromPrimary(MATHS()).guide, {});
  assert.deepStrictEqual(c.pageLayout, { width: 520, height: 2000, flow: true });
  assert.strictEqual(pack.COMPOSE({ sections: [] }, {}), null);
  assert.ok(!/\.ictp\b/.test(c.headCss) && /\.ictq\b/.test(c.headCss), 'its style sits under .ictq only');
});

// ── the page printer ─────────────────────────────────────────────────────────────────────
const mediaBoxes = (pdf) => [...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map((m) => [Number(m[1]), Number(m[2])]);

test('the phone printer: a block moves whole with its heading, a list divides, a stage continues under its own bar', { timeout: 120000 }, async () => {
  const { htmlToPhonePagesPdf } = require('../render/phone-pages-pdf');
  const blk = (stage, inner, attrs = '') => `<div class="q-blk" data-stage="${stage}" ${attrs}>${inner}</div>`;
  const box = (t, h) => `<div style="height:${h}px;background:#eee">${t}</div>`;
  const css = '<style>body{margin:0}.qpg{width:400px;height:600px;display:flex;flex-direction:column;padding:10px 10px 0;box-sizing:border-box;overflow:hidden}'
    + '.q-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:10px}.q-foot{flex:none;height:30px}.q-run{height:20px}.q-chrome[hidden]{display:none}</style>';
  const html = `<!doctype html><html><head>${css}</head><body><div class="ictq" data-pno="page {n} of {m}" data-cont="continued"><div class="q-src">`
    + blk('a', '<div class="q-bar"><span class="q-bar-name">A</span><span class="q-bar-end">5 min</span></div>', 'data-bar data-keep')
    + blk('a', box('one', 300)) + blk('a', '<div>HEADING</div>', 'data-keep') + blk('a', box('two', 200))
    + blk('b', '<div class="q-bar"><span class="q-bar-name">B</span></div>', 'data-bar data-keep')
    + blk('b', `<div><div data-first-only>LIST HEAD</div><div class="units">${Array.from({ length: 16 }, (_, i) => `<div data-units style="height:60px">item ${i + 1}</div>`).join('')}</div></div>`, 'data-split')
    + '</div><div class="q-chrome" hidden><div class="q-run">run</div><footer class="q-foot"><div>foot</div><div class="q-pno"></div></footer></div></div></body></html>';
  const r = await htmlToPhonePagesPdf(html, { pageWidth: 400, pageHeight: 600 });
  const pages = r.html.split('<section class="qpg"').slice(1);
  assert.ok(!pages[0].includes('HEADING') && pages[1].includes('HEADING') && /HEADING[\s\S]*two/.test(pages[1]), 'the heading moved with what it heads');
  assert.ok(pages[1].includes('q-bar cont') && pages[1].includes('continued'), 'stage A continues under its own bar');
  const items = pages.map((p) => (p.match(/item \d+/g) || []).length);
  assert.strictEqual(items.reduce((a, b) => a + b, 0), 16, 'the list divided, nothing lost');
  assert.ok(items.filter((n) => n).length >= 2, 'over more than one page');
  assert.strictEqual((r.html.match(/LIST HEAD/g) || []).length, 1, 'its heading printed once');
  assert.ok(/page 1 of \d/.test(pages[0]) && !pages[0].includes('>run<') && pages[1].includes('>run<'), 'page numbers; the running head from page 2');
  assert.deepStrictEqual(r.overflow, []);
  assert.ok(mediaBoxes(r.pdf).every(([w, h]) => Math.abs(w - 300) < 0.5 && Math.abs(h - 450) < 0.5), 'every page is the fixed size (400×600 px)');
});

for (const [name, doc, lang] of [['Grade 1 Maths', MATHS, 'en'], ['Grade 2 Urdu', URDU, 'ur']]) {
  test(`${name} prints in the approved phone design: 390×1500 pt pages, nothing outside its page, nothing bought`, { timeout: 120000 }, async () => {
    const { renderLessonImage } = require('../pipeline');
    const { guide } = buildGuideFromPrimary(doc());
    const logs = [];
    const r = await renderLessonImage(guide, { apiKey: '', pdf: true, log: (m) => logs.push(m) });
    const boxes = mediaBoxes(r.pdf);
    assert.ok(boxes.length >= 5 && boxes.length <= 8, `${boxes.length} pages`);
    for (const [w, h] of boxes) { assert.ok(Math.abs(w - 390) < 0.5 && Math.abs(h - 1500) < 0.5, `${w}×${h}`); }
    assert.deepStrictEqual(r.overflow, [], 'nothing leaves its page or runs past its foot');
    assert.strictEqual(r.stats.generated, 0, 'nothing bought');
    assert.ok(!/<img\b/.test(r.html), 'no raster pictures: every picture is SVG drawn in code');
    assert.ok(r.html.includes(`<div class="ictq" lang="${lang}"`) && r.html.includes('class="qpg"'), 'the .html is the paginated pages');
    const stages = logs.filter((l) => /▭ page/.test(l)).map((l) => l.replace(/.*: /, '')).join('+').split('+');
    assert.deepStrictEqual([...new Set(stages)], ['start', 'opening', 'explanation', 'we_do', 'you_do', 'check', 'homework', 'close'], 'the stages in order');
    const total = boxes.length;
    assert.ok(r.html.includes(lang === 'ur' ? `صفحہ 1 از ${total}` : `page 1 of ${total}`), 'page N of M');
  });
}
