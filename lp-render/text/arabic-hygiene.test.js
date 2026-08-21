'use strict';
// Each case is a specific reviewer finding on a real Yemen lesson.
const test = require('node:test');
const assert = require('node:assert');
const { fixString, fixGuide } = require('./arabic-hygiene');

test('a female subject takes ت-, not ي-', () => {
  assert.strictEqual(fixString('وإيمان يحبني'), 'وإيمان تحبني');
  assert.strictEqual(fixString('سبأ يقرأ الكلمة'), 'سبأ تقرأ الكلمة');
  // a male subject is untouched
  assert.strictEqual(fixString('أحمد يحبني'), 'أحمد يحبني');
});

test('the eye-care wording is rewritten', () => {
  assert.match(fixString('اذكر عناية بالعين'), /اذكر طريقةً للعناية بالعين/);
  assert.match(fixString('يذكر عناية بها'), /يذكر طريقةً للعناية بها/);
});

test('letter names are spelled out', () => {
  assert.match(fixString('أميز بين ب ون وي'), /الباء والنون والياء/);
  assert.match(fixString('الخلط بين ب ون وي'), /الخلط بين الباء والنون والياء/);
});

test('the imperative is corrected', () => {
  assert.match(fixString('تل الآية واسأل'), /اتلُ الآية/);
  // not inside another word
  assert.strictEqual(fixString('يتلو الآية'), 'يتلو الآية');
});

test('the name takes the accusative after the verb', () => {
  assert.match(fixString('الذين حرّضوا ذو نواس'), /حرّضوا ذا نواس/);
});

test('the burglary sentence reads naturally', () => {
  assert.strictEqual(fixString('فعل اللصوص بالدكان السرقة والكسر'), 'سرق اللصوص الدكان وكسروا الباب');
});

test('the wudu naming is completed', () => {
  assert.match(fixString('النية وبسم الله ثم المضمضة'), /النية والتسمية ثم المضمضة/);
});

test('glossary definitions use the reviewed wording', () => {
  const guide = { sections: [{ id: 'glossary', items: [
    { label: 'المكعب', value: 'شكل له وجوه' },
    { label: 'المخروط', value: 'شكل مدبب' },
    { label: 'النمو', value: 'أن يكبر النبات' },
  ] }] };
  const { changes } = fixGuide(guide);
  const g = guide.sections[0].items;
  assert.strictEqual(g[0].value, 'له أوجه مربعة');
  assert.strictEqual(g[1].value, 'له قاعدة دائرية ورأس مدبب');
  assert.strictEqual(g[2].value, 'أن يكبر النبات', 'a term with no canonical wording is left alone');
  assert.ok(changes.length >= 2);
});

test('ids, prompts and machinery are never rewritten', () => {
  const guide = { images: [{ id: 'x', prompt: 'a Yemeni classroom, no text' }],
    sections: [{ id: 'stage-tamhid', codeFigure: { kind: 'steps', items: [{ label: 'إيمان يحبني' }] } }] };
  fixGuide(guide);
  assert.strictEqual(guide.images[0].prompt, 'a Yemeni classroom, no text');
  assert.strictEqual(guide.sections[0].id, 'stage-tamhid');
  assert.strictEqual(guide.sections[0].codeFigure.kind, 'steps');
  // but a visible label inside a figure IS corrected
  assert.strictEqual(guide.sections[0].codeFigure.items[0].label, 'إيمان تحبني');
});

test('a finding spread across a label and its caption is still fixed', () => {
  // The wudu sequence renders «النية» as the stage label and «وبسم الله» as its
  // caption, so no single-string rule can see the phrase the reviewer flagged.
  const guide = { sections: [{ id: 'stage-arad', codeFigure: { kind: 'process', stages: [
    { label: 'النية', caption: 'وبسم الله' },
    { label: 'المضمضة', caption: 'ثانيًا' },
  ] } }] };
  const { changes } = fixGuide(guide);
  assert.strictEqual(guide.sections[0].codeFigure.stages[0].caption, 'والتسمية');
  assert.strictEqual(guide.sections[0].codeFigure.stages[1].caption, 'ثانيًا', 'other stages untouched');
  assert.ok(changes.some((c) => c.rule === 'wudu_naming'));
});
