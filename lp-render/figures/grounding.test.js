'use strict';
// A figure's labels must come from the lesson. The figure pass writes short
// imperatives, which is exactly where invention creeps in — one corpus lesson came
// back with «اذكر أسماء أسرتك» and friends that the source never says. This is the
// enforceable bar: a label has to share a real word (not a function word) with the
// guide's own text, allowing for ordinary Arabic morphology.
const test = require('node:test');
const assert = require('node:assert');
const { labelGrounded } = require('../condense');

const LESSON = 'افتح الصفحة ٣٢ وردد الأنشودة مع التلاميذ، ثم أشر إلى صور الأسرة وسمِّ الجذور والساق';

test('a paraphrase built from the lesson\'s own words is grounded', () => {
  for (const l of ['افتح الصفحة', 'ردد الأنشودة', 'سمِّ الجذور', 'أشر للصور']) {
    assert.strictEqual(labelGrounded(l, LESSON), true, `${l} should be grounded`);
  }
});

test('Arabic morphology still counts as the same word', () => {
  assert.strictEqual(labelGrounded('الصورة', LESSON), true, '«الصورة» should match «صور»');
  assert.strictEqual(labelGrounded('والساق', LESSON), true, '«والساق» should match «الساق»');
});

test('content the lesson never mentions is rejected', () => {
  for (const l of ['اذبح الخروف', 'ارسم المثلث', 'قس الحرارة']) {
    assert.strictEqual(labelGrounded(l, LESSON), false, `${l} should be rejected`);
  }
});

test('function words alone do not ground a label', () => {
  assert.strictEqual(labelGrounded('في مع من', LESSON), false);
  assert.strictEqual(labelGrounded('', LESSON), false);
});

test('a label of only short tokens cannot pass on them', () => {
  assert.strictEqual(labelGrounded('في', LESSON), false);
});
