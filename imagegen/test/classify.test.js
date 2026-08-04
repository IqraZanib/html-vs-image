'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { classifyBlock } = require('../classify');

const seg = (subject) => ({ subject });

test('HOOK_STORY → decorative_scene, needs an image', () => {
  const r = classifyBlock({ type: 'HOOK_STORY', text: 'Ali and Sara on a train' }, seg('English'));
  assert.strictEqual(r.category, 'decorative_scene');
  assert.strictEqual(r.needsImage, true);
});

test('structured blocks (board work, tables, exit ticket) → no AI image', () => {
  for (const t of ['BOARD_WORK', 'WORKED_EXAMPLE', 'EXIT_TICKET', 'JOURNEY', 'CFU', 'KEY_FACT', 'TEACHER_SAYS']) {
    const r = classifyBlock({ type: t }, seg('Maths'));
    assert.strictEqual(r.category, 'structured', `${t} should be structured`);
    assert.strictEqual(r.needsImage, false);
  }
});

test('realistic Science diagram → labeled_diagram, needs an image', () => {
  const r = classifyBlock({ type: 'DIAGRAM', text: 'water cycle' }, seg('Science'));
  assert.strictEqual(r.category, 'labeled_diagram');
  assert.strictEqual(r.needsImage, true);
});

test('a single object/motif → icon, no AI image', () => {
  const r = classifyBlock({ type: 'ICON', text: 'textbook' }, seg('English'));
  assert.strictEqual(r.category, 'icon_or_motif');
  assert.strictEqual(r.needsImage, false);
});

test('unrecognised block → unknown + a reason (never silently bucketed)', () => {
  const r = classifyBlock({ type: 'SOMETHING_NEW' }, seg('Maths'));
  assert.strictEqual(r.category, 'unknown');
  assert.strictEqual(r.needsImage, false);
  assert.match(r.reason, /unrecognised|unknown/i);
});
