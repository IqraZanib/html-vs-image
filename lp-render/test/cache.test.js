'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cacheKey, FsImageCache, MemoryImageCache } = require('../images/cache');

test('cacheKey normalizes source, license and query', () => {
  assert.strictEqual(cacheKey('wikimedia', 'cc0,by', '  Duck  Bird '), 'wikimedia:cc0,by:duck bird');
});

test('MemoryImageCache round-trips and misses to null', async () => {
  const c = new MemoryImageCache();
  assert.strictEqual(await c.get('k'), null);
  await c.set('k', { dataUri: 'x' });
  assert.deepStrictEqual(await c.get('k'), { dataUri: 'x' });
});

test('FsImageCache round-trips through disk and misses to null', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lpcache-'));
  const c = new FsImageCache(dir);
  assert.strictEqual(await c.get('missing'), null);
  await c.set('wikimedia:cc0:cow', { title: 'A cow', dataUri: 'data:...' });
  assert.deepStrictEqual(await c.get('wikimedia:cc0:cow'), { title: 'A cow', dataUri: 'data:...' });
});
