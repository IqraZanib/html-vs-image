'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { dryRun } = require('../cli');

const segment = {
  subject: 'English', grade: '1', region: 'pk',
  blocks: [
    { type: 'HOOK_STORY', text: 'Ali and Sara on the train', characters: [{ name: 'Ali' }, { name: 'Sara' }] },
    { type: 'BOARD_WORK', text: 'draw picture boxes' },
  ],
};

test('dryRun reports category + model + prompt per block, no network', () => {
  const rows = dryRun(segment);
  const hook = rows.find((r) => r.blockType === 'HOOK_STORY');
  const board = rows.find((r) => r.blockType === 'BOARD_WORK');
  assert.strictEqual(hook.category, 'decorative_scene');
  assert.strictEqual(hook.model, 'nano-banana-2-lite');
  assert.match(hook.prompt, /Ali/);
  assert.strictEqual(board.needsImage, false);
  assert.strictEqual(board.model, null);
});
