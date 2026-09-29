'use strict';
// ICT (NIETE) grades 6–12: the lp_doc adapter and the ict design pack.
//
// Fixtures: ICT's own sample lessons, copied unchanged from the curriculum-baked-lesson-plans
// skill (scripts/lp_html/samples, agent-skills-taleemabad 813bea9) — one English-medium grade 7
// science lesson, one Urdu-medium grade 9 chemistry lesson. Both are schema 2.0, so every test
// here also runs ICT's own 2.0 → 3.0 migration.
//
// What is proved:
//   • the adapter drops nothing ICT paints, and paints nothing ICT has decided not to
//   • ICT's placement rules (mistakes after Development, differentiation after the practice)
//   • the inputs ICT's renderer refuses are refused here too
//   • the two renderer additions (the cls hook, the split body) are inert for every other
//     producer — no other region can see them
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { buildGuideFromLpDoc } = require('../guide/from-lpdoc');
const { toV3 } = require('../guide/vendor/lp_doc_migrate');
const { renderDecorativeLesson } = require('../decorative/render');

const FIX = path.join(__dirname, '..', 'fixtures', 'ict');
const load = (f) => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
const G7 = () => load('g7_science_photosynthesis.lp.json');
const G9UR = () => load('g9_urdu_smoke.lp.json');
// What a reader sees of a string once the adapter's two notation changes are undone.
const visible = (s) => String(s).replace(/⁠/g, '').replace(/\$\\ce\{/g, '\\ce{').replace(/\}\$/g, '}');

test('ICT\'s own migration lifts a 2.0 lp_doc to 3.0 before anything is mapped', () => {
  const v3 = toV3(G7());
  assert.strictEqual(v3.schema_version, '3.0');
  assert.strictEqual(v3.__migrated_from, '2.0');
  assert.ok(!('warmup' in v3), 'the top-level warm-up moves into the Introduction');
  assert.ok(v3.sections.find((s) => s.id === 'introduction').warmup.items.length === 3);
  const { report } = buildGuideFromLpDoc(G7());
  assert.strictEqual(report.migratedFrom, '2.0');
});

test('the guide is an ict guide: region, header, and no images to buy', () => {
  const { guide } = buildGuideFromLpDoc(G7());
  assert.strictEqual(guide.meta.region, 'ict');
  assert.strictEqual(guide.meta.locale, 'en');
  assert.strictEqual(guide.meta.title, 'Photosynthesis');
  assert.strictEqual(guide.meta.subtitle, 'Grade 7 · General Science');
  assert.deepStrictEqual(guide.meta.chips.map((c) => c.value), ['Ch.1 · Plant Systems', 'p.11 · 40 min', 'GEN-6-8']);
  assert.deepStrictEqual(guide.images, [], 'an lp_doc declares no generated art — rendering it costs nothing');
  for (const s of guide.sections) assert.match(s.cls, /^ict( |$)/, `${s.id} must carry the ict class`);
});

test('page 1 follows ICT\'s order: outcome, resources, then the five sections with their hosts', () => {
  const { guide } = buildGuideFromLpDoc(G7());
  const ids = guide.sections.map((s) => s.id);
  assert.deepStrictEqual(ids.slice(0, 18), [
    'ict-outcome', 'ict-resources',
    'ict-warmup', 'ict-hook', 'ict-watch',                           // Introduction
    'ict-split', 'ict-chem', 'ict-keywords', 'ict-mistakes',         // Development (+ mistakes)
    'ict-worked', 'ict-faded', 'ict-practice', 'ict-supext', 'ict-diff', // Activity (+ differentiation)
    'ict-ask', 'ict-practice', 'ict-para',                           // Conclusion
    'ict-keypoints',                                                 // Home work
  ]);
  // every card of one stage carries that stage's heading, so the band is drawn once
  const dev = guide.sections.filter((s) => /ict-st-development/.test(s.cls));
  assert.ok(dev.every((s) => s.heading === 'Development' && s.time === '10 min'));
});

test('nothing ICT paints from the teaching flow is dropped', () => {
  const doc = toV3(G7());
  const { guide } = buildGuideFromLpDoc(G7());
  const out = visible(JSON.stringify(guide));
  const PAINTED = new Set(['text', 'question', 'look_for', 'q', 'a', 'word', 'meaning', 'title', 'prompt',
    'result', 'answer', 'support', 'extension', 'caption', 'figure_label', 'legend', 'from']);
  const missing = [];
  const walk = (v, key) => {
    if (typeof v === 'string') {
      if ((PAINTED.has(key) || key === '[]') && v.trim() && !out.includes(JSON.stringify(v).slice(1, -1))) missing.push(`${key}: ${v.slice(0, 60)}`);
      return;
    }
    if (Array.isArray(v)) v.forEach((x) => walk(x, typeof x === 'string' && ['items', 'steps'].includes(key) ? '[]' : key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  for (const s of doc.sections) { walk(s.blocks, 'blocks'); if (s.warmup) walk(s.warmup, 'warmup'); }
  for (const m of doc.page2.mistakes) { walk(m.pupil_says, 'text'); walk(m.you_ask, 'text'); }
  assert.deepStrictEqual(missing, [], 'every painted lp_doc string reaches the guide verbatim');
});

test('what ICT has decided not to paint is not painted — and each omission is reported', () => {
  const { guide, report } = buildGuideFromLpDoc(G7());
  const out = JSON.stringify(guide);
  assert.ok(!out.includes('Blank 1 = stomata'), 'model answers are never painted (bd-ir1aq)');
  assert.ok(!guide.sections.some((s) => s.id === 'ict-mcq'), 'no FBISE exam bank on a grade 7 plan (bd-a8veu.18)');
  assert.ok(!out.includes('§1.8 Respiration'), 'next period is not painted (bd-a8veu.20)');
  const why = report.notPrinted.join('\n');
  assert.match(why, /model_answers/); assert.match(why, /exam_bank/); assert.match(why, /next_period/);
  // …but a grade 9 plan does carry its exam bank
  const g9 = buildGuideFromLpDoc(G9UR()).guide;
  assert.ok(g9.sections.some((s) => s.id === 'ict-mcq'), 'grade 9 prints the FBISE questions');
});

test('support pages are lettered in emission order, so an absent section consumes no letter', () => {
  const { guide } = buildGuideFromLpDoc(G7());
  const p2 = guide.sections.filter((s) => /ict-st-p2/.test(s.cls)).map((s) => [s.heading, (s.cls.match(/ict-p2-(\w)/) || [])[1]]);
  assert.deepStrictEqual(p2, [
    ['The board at the end of the lesson', 'a'],
    ['Homework, in full', 'b'],   // mistakes and differentiation live in the flow; exam bank not on grade 7
    ['Coaching corner', 'c'],
  ]);
});

test('the Urdu lesson gets ICT\'s Urdu labels and right-to-left arrows', () => {
  const { guide, report } = buildGuideFromLpDoc(G9UR());
  assert.strictEqual(guide.meta.locale, 'ur');
  assert.strictEqual(report.lang, 'ur');
  const intro = guide.sections.find((s) => s.id === 'ict-warmup');
  assert.strictEqual(intro.heading, 'تعارف');
  assert.ok(intro.items.every((it) => it.text.includes(' ← ')), 'answers point the way an Urdu line reads');
});

test('inline chemistry: a bare \\ce{} gets its dollars and a MathJax card; $…$ is left alone', () => {
  const { guide } = buildGuideFromLpDoc(G9UR());
  const mis = guide.sections.find((s) => s.id === 'ict-mistakes');
  assert.strictEqual(mis.engine, 'mathjax');
  assert.match(mis.items[0].text, /\$\\ce\{H2O\}\$/);
  assert.ok(!/\$\$\\ce/.test(JSON.stringify(guide)), 'never double-wrapped');
  const chem = guide.sections.find((s) => s.id === 'ict-chem');
  assert.strictEqual(chem.engine, 'mathjax');
  assert.strictEqual(chem.items[0].tex, '\\ce{C + O2 -> CO2}');
});

test('a plain "Label:" line stays plain — the renderer\'s auto-bold does not fire on lp_doc text', () => {
  const { guide } = buildGuideFromLpDoc(G7());
  const { bodyHtml } = renderDecorativeLesson(guide, {}, {});
  assert.ok(bodyHtml.includes('Draw the leaf and label four arrows:'), 'the homework line is there');
  assert.ok(!bodyHtml.includes('<b>Draw the leaf and label four arrows:</b>'), '…and not bolded');
  assert.ok(bodyHtml.includes('<b>Close the hook:</b>'), 'authored **bold** still renders bold');
});

test('the inputs ICT refuses are refused', () => {
  assert.throws(() => buildGuideFromLpDoc(null), /must be an object/);
  assert.throws(() => buildGuideFromLpDoc(G7(), { lang: 'ur' }), /no ur_overlay/,
    'an English lesson under Urdu headings is a page ICT never prints');
  assert.throws(() => buildGuideFromLpDoc(G7(), { lang: 'fr' }), /no ICT label pack/);
  const bad = G7(); bad.ur_overlay = { '/slo/text_verbatim': 'x' };
  assert.throws(() => buildGuideFromLpDoc(bad, { lang: 'ur' }), /ur_overlay invalid/,
    'the verbatim SLO may not be overlaid — ICT refuses the whole lesson (OVERLAY_INVALID)');
});

test('the split is ONE card with both columns inside it', () => {
  const { guide } = buildGuideFromLpDoc(G7());
  const { bodyHtml } = renderDecorativeLesson(guide, {}, {});
  const splits = bodyHtml.match(/class="d-split"/g) || [];
  assert.strictEqual(splits.length, 1);
  const i = bodyHtml.indexOf('class="d-split"');
  const card = bodyHtml.slice(bodyHtml.lastIndexOf('<section', i), bodyHtml.indexOf('</section>', i));
  assert.match(card, /d-sub ict-r-figure/); assert.match(card, /d-sub ict-r-keypoints/); assert.match(card, /d-sub ict-r-watch/);
  // the composer must treat it as a figure: no page cut may land inside either column
  const composer = fs.readFileSync(path.join(__dirname, '..', 'render', 'png-to-pdf.js'), 'utf8');
  assert.match(composer, /querySelector\('\.d-inline-img, \.char-fig, \.d-split'\)/);
});

test('the renderer additions are inert for every other producer', () => {
  // cls: a section without it renders exactly the class string it always did
  const plain = renderDecorativeLesson({ meta: { title: 't' }, sections: [{ id: 'x', type: 'text', heading: 'H', body: 'b' }] }, {}, {});
  assert.match(plain.bodyHtml, /<section class="section sec-x">/);
  // …and only the ICT adapter emits cls or split: no other guide producer mentions either
  const guideDir = path.join(__dirname, '..', 'guide');
  for (const f of ['from-markdown.js', 'profiles.js']) {
    const src = fs.readFileSync(path.join(guideDir, f), 'utf8');
    assert.ok(!/\bcls\s*:/.test(src) && !/type:\s*'split'/.test(src), `${f} must not emit cls or split`);
  }
  for (const f of ['structure.js', 'condense.js', 'adapter.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/\bcls\s*:/.test(src) && !/'split'/.test(src), `${f} must not emit cls or split`);
  }
});

test('the ict pack is a real pack: loads, no character cast, and its role rules are ict-scoped', () => {
  const pack = require('../decorative/regions/ict/theme');
  assert.strictEqual(pack.CHARACTER_CAST, false, 'ICT plans carry no decorative characters (and the cast is paid)');
  assert.ok(!('MAX_PAGES' in pack), 'page count follows the lesson');
  assert.ok(pack.THEME_OVERRIDE_CSS.length > 5000);
  // every role/stage rule names an ict class — none can land on a card another producer made
  const CARD = /\.(panel|d-note|d-bullets|d-lead|d-tag|d-col|d-duo|d-mrow|d-mlabel|d-text|cc-b|s-head|s-tab|s-ic|s-title|s-time)\b/;
  const parts = pack.THEME_OVERRIDE_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('}').map((r) => r.split('{')[0].trim()).filter(Boolean)
    .flatMap((sel) => sel.split(',').map((x) => x.trim()));
  const unscoped = parts.filter((part) => CARD.test(part) && !/ict/.test(part));
  assert.deepStrictEqual(unscoped, [], 'a card rule without an ict class would restyle any region\'s cards');
});

// A hand-built 3.0 document: the block types and section fields neither sample carries.
// The strings are placeholders; what is asserted is that each one is mapped and drawn.
const V3 = () => ({
  lesson_id: 'T_V3', schema_version: '3.0', lp_type: 'STEM-9-12', period_minutes: 40,
  provenance: { grade: 10, subject: 'Physics', medium: 'en', chapter: 'Ch.2', topic: 'Motion', printed_pages: '20-21' },
  slo: { code: 'P-10-A-01' }, fbise_slos: [{ code: 'P-10-A-01', status: 'Summative' }],
  sequence: { previous: 'Speed', this: 'Velocity', checkpoint: 'Quiz 1' },
  materials: ['Ball'],
  objectives: { outcome: 'You can tell speed from velocity.', by_the_end: 'Answer a 2-mark question.', items: [{ text: 'You can define velocity.' }] },
  sections: [
    { id: 'introduction', minutes: 5, blocks: [{ type: 'board', text: 'BOARD-TEXT' }] },
    { id: 'development', minutes: 15, textbook_page: '20', video: { url: 'https://x', title: 'VIDEO-TITLE' },
      blocks: [
        { type: 'table', title: 'TABLE-TITLE', columns: ['Quantity', 'Unit'], rows: [['speed', 'm/s'], ['short-row']] },
        { type: 'latex', tex: 'v = \\frac{d}{t}', caption: 'LATEX-CAPTION' },
        { type: 'diagram', spec: { type: 'graph', caption: 'DIAGRAM-CAPTION' } },
      ] },
    { id: 'activity', minutes: 10, blocks: [{ type: 'practice', mode: 'guided', items: [{ q: 'Q1', a: 'A1' }] }] },
    { id: 'conclusion', minutes: 8, blocks: [{ type: 'paragraph', text: 'P' }],
      checkpoint: { question: 'CHECKPOINT-Q', marks: 2, mark_scheme: ['MS-1'] },
      exit_ticket: [{ q: 'EXIT-Q', a: 'EXIT-A' }], reteach_rule: 'RETEACH-RULE' },
    { id: 'homework', minutes: 2, blocks: [{ type: 'paragraph', text: 'HW' }],
      homework: { items: [{ text: 'HW-ITEM', level: 'U', marks: 3, source: { page: '21', questions: 'Q4' } }] } },
  ],
  page2: {
    board_final: { draw_order: ['1. DRAW-1'], diagram: { type: 'graph', caption: 'BOARD-DIAGRAM' } },
    mistakes: [{ pupil_says: 'PUPIL-SAYS', you_ask: 'YOU-ASK' }],
    differentiation: { stuck: 'STUCK', barrier: 'BARRIER', early: 'EARLY' },
    exam_bank: {
      mcq: [{ q: 'MCQ-Q', options: ['o1', 'o2'], answer: 'B', distractor_codes: ['CODE-A'] }],
      srq: { q: 'SRQ-Q', marks: 2, mark_scheme: ['SRQ-MS'] },
      erq_skeleton: { q: 'ERQ-Q', marks_total: 6, parts: [{ heading: 'ERQ-PART', marks: 3, note: 'ERQ-NOTE' }] },
      how_marked: 'HOW-MARKED',
    },
    homework_key: [{ item: 'HWK-ITEM', answer: 'HWK-ANSWER', marks: 3 }],
    next_period: 'NEXT', not_going: 'NOT-GOING', coaching_lookfor: 'COACH', coaching_reflection: 'REFLECT',
  },
  one_screen: 'x',
});

test('all 16 block types and every 3.0 section field are mapped and drawn', () => {
  const { guide, report } = buildGuideFromLpDoc(V3());
  const { bodyHtml } = renderDecorativeLesson(guide, {}, {});
  for (const s of ['BOARD-TEXT', 'TABLE-TITLE', 'short-row', 'LATEX-CAPTION', 'DIAGRAM-CAPTION', 'VIDEO-TITLE',
    'Teaching from p.20', 'CHECKPOINT-Q', 'MS-1', 'EXIT-Q', 'EXIT-A', 'RETEACH-RULE', 'HW-ITEM', '(Q4, p.21)', '[U] 3m',
    'DRAW-1', 'BOARD-DIAGRAM', 'MCQ-Q', 'CODE-A', 'SRQ-Q', 'SRQ-MS', 'ERQ-Q', 'ERQ-PART', 'ERQ-NOTE', 'HOW-MARKED',
    'HWK-ITEM', 'HWK-ANSWER', 'COACH', 'REFLECT', 'Velocity', 'P-10-A-01']) {
    assert.ok(bodyHtml.includes(s), `"${s}" must be on the page`);
  }
  assert.ok(!bodyHtml.includes('1. DRAW-1'), 'ICT numbers the draw order itself — the author\'s "1." is stripped');
  assert.ok(/class="d-gtable"/.test(bodyHtml) && /katex/.test(bodyHtml), 'table and LaTeX are drawn as themselves');
  assert.strictEqual(guide.sections.find((s) => s.id === 'ict-table').rows[1].length, 2, 'a ragged row is padded, not dropped');
  assert.ok(!bodyHtml.includes('NOT-GOING'), 'not painted, as in ICT (bd-a8veu.20)');
  assert.deepStrictEqual(report.unrendered.filter((u) => u.type === 'diagram').length, 2, 'both diagrams reported, not silently blank');
  assert.ok(guide.meta.chips.some((c) => c.value === 'pp. 20-21 · 40 min'), 'a page range uses the plural locator');
  const hosts = guide.sections.map((s) => s.id);
  assert.ok(hosts.indexOf('ict-diff') > hosts.indexOf('ict-practice'), 'differentiation follows the section with the practice');
  assert.deepStrictEqual(report.warnings, []);
  // all sixteen types, counted across the three fixtures
  const types = new Set();
  const walk = (b) => { if (!b) return; types.add(b.type); (b.left || []).concat(b.right || []).forEach(walk); };
  for (const d of [toV3(G7()), toV3(G9UR()), V3()]) for (const s of d.sections) (s.blocks || []).forEach(walk);
  assert.deepStrictEqual([...types].sort(), ['ask', 'board', 'chem', 'diagram', 'faded_example', 'key_points', 'keywords',
    'latex', 'paragraph', 'practice', 'split', 'support_extension', 'table', 'textbook_figure', 'watch_out', 'worked_example']);
});
