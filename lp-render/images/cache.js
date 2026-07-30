'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Stable cache key: source + license set + normalized query.
function cacheKey(source, license, query) {
  const q = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${source}:${license}:${q}`;
}

// Default cache: one JSON file per key (incl. base64) under `dir`.
class FsImageCache {
  constructor(dir) { this.dir = dir; }
  _file(key) {
    const h = crypto.createHash('sha1').update(key).digest('hex');
    return path.join(this.dir, `${h}.json`);
  }
  async get(key) {
    try { return JSON.parse(fs.readFileSync(this._file(key), 'utf8')); }
    catch (_) { return null; }
  }
  async set(key, record) {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this._file(key), JSON.stringify(record));
  }
}

// In-process cache (tests, single-run pipelines). rumi injects an R2-backed
// cache implementing the same { get, set } interface.
class MemoryImageCache {
  constructor() { this.m = new Map(); }
  async get(key) { return this.m.has(key) ? this.m.get(key) : null; }
  async set(key, record) { this.m.set(key, record); }
}

module.exports = { cacheKey, FsImageCache, MemoryImageCache };
