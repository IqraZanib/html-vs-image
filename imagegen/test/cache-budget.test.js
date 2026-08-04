'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { cacheKey, MemoryAssetCache } = require('../cache');
const { BudgetGuard } = require('../budget');

test('cacheKey is stable and model/prompt/category sensitive', () => {
  const a = cacheKey('decorative_scene', 'a warm scene', 'nano-banana-2-lite');
  const b = cacheKey('decorative_scene', 'a warm scene', 'nano-banana-2-lite');
  const c = cacheKey('decorative_scene', 'a warm scene', 'nano-banana-2');
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
});

test('MemoryAssetCache round-trips and misses to null', async () => {
  const cache = new MemoryAssetCache();
  assert.strictEqual(await cache.get('k'), null);
  await cache.set('k', { url: 'x' });
  assert.deepStrictEqual(await cache.get('k'), { url: 'x' });
});

test('BudgetGuard tracks spend and throws before exceeding the ceiling', () => {
  const b = new BudgetGuard(10);
  b.spend(4);
  b.spend(5);
  assert.strictEqual(b.spent(), 9);
  assert.strictEqual(b.remaining(), 1);
  assert.throws(() => b.spend(3), /budget/i);
  assert.strictEqual(b.spent(), 9, 'a rejected spend is not counted');
});
