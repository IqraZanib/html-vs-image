'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function cacheKey(category, prompt, model) {
  const h = crypto.createHash('sha1').update(`${category}\n${model}\n${prompt}`).digest('hex');
  return `${category}:${model}:${h.slice(0, 16)}`;
}

class MemoryAssetCache {
  constructor() { this.m = new Map(); }
  async get(key) { return this.m.has(key) ? this.m.get(key) : null; }
  async set(key, asset) { this.m.set(key, asset); }
}

class FsAssetCache {
  constructor(dir) { this.dir = dir; }
  _file(key) { return path.join(this.dir, `${crypto.createHash('sha1').update(key).digest('hex')}.json`); }
  async get(key) { try { return JSON.parse(fs.readFileSync(this._file(key), 'utf8')); } catch (_) { return null; } }
  async set(key, asset) { fs.mkdirSync(this.dir, { recursive: true }); fs.writeFileSync(this._file(key), JSON.stringify(asset)); }
}

module.exports = { cacheKey, MemoryAssetCache, FsAssetCache };
