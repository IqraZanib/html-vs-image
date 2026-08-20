'use strict';
// node --test lp-render/figures/validate.test.js
const test = require('node:test');
const assert = require('node:assert');
const { validateFigures, fractionsIn, toLatinDigits } = require('./validate');

const SOURCE = { sections: [{ body: 'اكتب الكسر ٢/٤ للشكل المظلل، ثم قارن مع ١/٢ وأربعة أجزاء متساوية' }] };
const artBrief = { id: 'a1', label: 'تقسيم التفاحة', prompt: 'Flat vector illustration of a classroom. The image contains ABSOLUTELY NO text, no letters, no numbers.' };

test('Eastern numerals are read as values', () => {
  assert.deepStrictEqual(fractionsIn('الكسر ٢/٤ هنا'), [[2, 4]]);
  assert.strictEqual(toLatinDigits('٣٥'), '35');
});

test('a fraction label that disagrees with the drawing fails', () => {
  const guide = { images: [artBrief], sections: [{ id: 'stage-arad', codeFigure: { kind: 'fraction-grid', shape: 'square', parts: 4, shaded: 2, label: '٣/٤' } }] };
  const r = validateFigures(guide, { source: SOURCE });
  assert.ok(!r.ok);
  assert.ok(r.findings.some((f) => f.code === 'label_mismatch'));
});

test('a correct fraction figure passes', () => {
  const guide = { images: [artBrief], sections: [{ id: 'stage-arad', codeFigure: { kind: 'fraction-grid', shape: 'square', parts: 4, shaded: 2, label: '٢/٤' } }] };
  assert.strictEqual(validateFigures(guide, { source: SOURCE }).ok, true);
});

test('a value absent from the source is flagged for review', () => {
  const guide = { images: [artBrief], sections: [{ id: 'stage-arad', codeFigure: { kind: 'expression', text: '٧/٩' } }] };
  const r = validateFigures(guide, { source: SOURCE });
  assert.ok(r.findings.some((f) => f.code === 'value_not_in_source'));
});

test('reversed board sides are caught (the ✓ side must be the source value)', () => {
  const guide = { images: [artBrief], sections: [{ id: 'errors', codeFigure: {
    kind: 'error-board', wrong: { kind: 'expression', text: '٢/٤' }, correct: { kind: 'expression', text: '٤/٢' },
    labelWrong: 'خطأ', labelCorrect: 'صواب' } }] };
  const r = validateFigures(guide, { source: SOURCE });
  assert.ok(r.findings.some((f) => f.code === 'board_reversed'), 'expected board_reversed');
});

test('identical board halves fail', () => {
  const same = { kind: 'compass', north: 'شمال', east: 'شرق', south: 'جنوب', west: 'غرب' };
  const guide = { images: [artBrief], sections: [{ id: 'errors', codeFigure: { kind: 'error-board', wrong: same, correct: { ...same }, labelWrong: 'أ', labelCorrect: 'ب' } }] };
  assert.ok(validateFigures(guide, {}).findings.some((f) => f.code === 'board_identical'));
});

test('in HYBRID mode, artwork that asks for labels fails the textless contract', () => {
  const guide = { images: [{ id: 'a2', label: 'x', prompt: 'a clean, labeled educational infographic diagram; label every part in Arabic' }], sections: [] };
  const r = validateFigures(guide, { mode: 'hybrid' });
  assert.ok(r.findings.some((f) => f.code === 'art_asks_labels'));
  assert.ok(r.findings.some((f) => f.code === 'art_not_textless'));
});

test('in LABELED mode, a label-asking brief is expected (no textless findings)', () => {
  const guide = { images: [{ id: 'a2', label: 'خط مستقيم', prompt: 'a clean, labeled educational diagram; label every part in Arabic' }], sections: [] };
  const r = validateFigures(guide, { mode: 'labeled' });
  assert.strictEqual(r.findings.some((f) => f.code === 'art_asks_labels' || f.code === 'art_not_textless'), false);
});

test('in LABELED mode, a wordless brief is flagged (the figure would carry no labels)', () => {
  const guide = { images: [{ id: 'a3', label: 'x', prompt: 'Flat vector illustration. ABSOLUTELY NO text of any kind.' }], sections: [] };
  const r = validateFigures(guide, { mode: 'labeled' });
  assert.ok(r.findings.some((f) => f.code === 'art_forbids_text_in_labeled_mode'));
});

test('small artwork is flagged as possibly soft at print size', () => {
  const guide = { images: [artBrief], sections: [] };
  const r = validateFigures(guide, { imageDims: { a1: { width: 512, height: 384 } } });
  assert.ok(r.findings.some((f) => f.code === 'art_low_res'));
});

test('a dangling image reference fails', () => {
  const guide = { images: [artBrief], sections: [{ id: 'stage-tamhid', image: 'nope' }] };
  assert.ok(validateFigures(guide, {}).findings.some((f) => f.code === 'dangling_image_ref'));
});

test('a comparison with no contrast fails', () => {
  const guide = { images: [artBrief], sections: [{ id: 'stage-arad', codeFigure: { kind: 'compare',
    items: [{ label: 'طويل', len: 0.6 }, { label: 'قصير', len: 0.6 }] } }] };
  assert.ok(validateFigures(guide, {}).findings.some((f) => f.code === 'compare_no_contrast'));
});

test('a count-set label that disagrees with the objects fails', () => {
  const guide = { images: [artBrief], sections: [{ id: 'stage-tatbiq', codeFigure: { kind: 'count-set', shape: 'triangle', total: 5, shaded: 2, label: '٢/٤' } }] };
  const r = validateFigures(guide, { source: SOURCE });
  assert.ok(r.findings.some((f) => f.code === 'label_mismatch'), 'expected label_mismatch');
});

test('a matching count-set label passes', () => {
  const guide = { images: [artBrief], sections: [{ id: 'stage-tatbiq', codeFigure: { kind: 'count-set', shape: 'triangle', total: 4, shaded: 2, label: '٢/٤' } }] };
  assert.strictEqual(validateFigures(guide, { source: SOURCE }).ok, true);
});

test('a process with a duplicated stage fails', () => {
  const guide = { images: [artBrief], sections: [{ id: 'stage-arad', codeFigure: { kind: 'process', layout: 'cycle',
    stages: [{ label: 'تبخر' }, { label: 'تكاثف' }, { label: 'تبخر' }] } }] };
  const r = validateFigures(guide, {});
  assert.ok(r.findings.some((f) => f.code === 'process_stage_duplicate'));
});

test('a process with too few stages fails', () => {
  const guide = { images: [artBrief], sections: [{ id: 'stage-arad', codeFigure: { kind: 'process',
    stages: [{ label: 'تبخر' }, { label: 'هطول' }] } }] };
  assert.ok(validateFigures(guide, {}).findings.some((f) => f.code === 'process_stage_count'));
});

test('a valid process against a matching source passes clean', () => {
  const source = { sections: [{ body: 'دورة الماء: تبخر ثم تكاثف ثم هطول ثم تجمع' }] };
  const guide = { meta: { locale: 'ar' }, images: [artBrief], sections: [{ id: 'stage-arad', codeFigure: { kind: 'process', layout: 'cycle',
    stages: [{ label: 'تبخر' }, { label: 'تكاثف' }, { label: 'هطول' }, { label: 'تجمع' }] } }] };
  const r = validateFigures(guide, { source });
  assert.strictEqual(r.fails, 0);
  assert.ok(!r.findings.some((f) => f.code === 'process_stage_not_in_source'));
});

test('a process whose stages are not in the source is flagged', () => {
  const source = { sections: [{ body: 'دورة الماء: تبخر ثم تكاثف' }] };
  const guide = { images: [artBrief], sections: [{ id: 'stage-arad', codeFigure: { kind: 'process',
    stages: [{ label: 'تبخر' }, { label: 'تكاثف' }, { label: 'انفجار' }] } }] };
  assert.ok(validateFigures(guide, { source }).findings.some((f) => f.code === 'process_stage_not_in_source'));
});
