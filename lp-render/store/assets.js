'use strict';
// Shared, persistent asset store. Every image a model generates (content images
// and — via cast.json — characters) is saved here keyed by its prompt, so the
// SAME image is never paid for twice: a later lesson that needs it is restored
// from disk with zero credits. Committed to the repo so the store travels with it.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DIR = path.join(__dirname, '..', '..', 'assets', 'asset-store');
const INDEX = path.join(DIR, 'index.json');

function keyFor(prompt) {
  return crypto.createHash('sha1').update(String(prompt || '')).digest('hex').slice(0, 16);
}
function readIndex() {
  try { return JSON.parse(fs.readFileSync(INDEX, 'utf8')); } catch (_) { return {}; }
}
function writeIndex(ix) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(INDEX, JSON.stringify(ix, null, 2));
}

// Restore a stored image as a data URI, or null on miss.
function get(key) {
  const ix = readIndex();
  const e = ix[key];
  if (!e || e.rejected) return null;
  const p = path.join(DIR, e.file);
  if (!fs.existsSync(p)) return null;
  return { dataUri: `data:${e.mime};base64,${fs.readFileSync(p).toString('base64')}`, meta: e };
}

// Save a generated image (data URI) under its key, with metadata.
function put(key, dataUri, meta = {}) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUri);
  if (!m) return false;
  const mime = m[1];
  const ext = mime.includes('png') ? 'png' : mime.includes('gif') ? 'gif' : 'jpg';
  const file = `${key}.${ext}`;
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, file), Buffer.from(m[2], 'base64'));
  const ix = readIndex();
  ix[key] = { file, mime, ...meta };
  writeIndex(ix);
  return true;
}

function has(key) { const ix = readIndex(); return !!(ix[key] && fs.existsSync(path.join(DIR, ix[key].file))); }

// A brief the gates have rejected twice should not be re-litigated on every future
// run: each attempt costs a generation plus a vision check, and the answer has not
// changed. The rejection is recorded next to the images so it survives a restart.
// Set LP_RETRY_REJECTED=1 to try again (e.g. after changing the rules).
function markRejected(key, reason) {
  const ix = readIndex();
  ix[key] = { rejected: true, reason: String(reason || '').slice(0, 200), at: new Date().toISOString() };
  writeIndex(ix);
}
function isRejected(key) {
  if (process.env.LP_RETRY_REJECTED === '1') return null;
  const ix = readIndex();
  const e = ix[key];
  return e && e.rejected ? e : null;
}
function stats() { const ix = readIndex(); return { count: Object.keys(ix).length, dir: DIR }; }

module.exports = { keyFor, get, put, has, stats, markRejected, isRejected, DIR };
