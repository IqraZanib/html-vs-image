'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { searchImage } = require('../images/openverse');

// A stub fetchImpl: first call (contains '/v1/images/') returns the JSON search
// body; later calls (image urls) return bytes keyed by url.
function makeFetch(searchJson, bytesByUrl) {
  const calls = [];
  const fetchImpl = async (url, optsIn) => {
    calls.push(url);
    if (url.includes('/v1/images/')) return { statusCode: 200, body: JSON.stringify(searchJson) };
    const buf = bytesByUrl[url];
    if (!buf) return { statusCode: 404, body: Buffer.alloc(0) };
    return { statusCode: 200, body: buf };
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}
const bigJpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(50000, 1)]); // passes 4KB..2.2MB byte check + mime sniff

test('returns a record for the first license-valid, large-enough result', async () => {
  const search = { results: [
    { url: 'http://img/ok.jpg', title: 'A Duck', creator: 'Jo', license: 'by', license_version: '2.0',
      source: 'flickr', width: 1200, height: 800, foreign_landing_url: 'http://land/ok' },
  ] };
  const rec = await searchImage('duck', { fetchImpl: makeFetch(search, { 'http://img/ok.jpg': bigJpeg }), source: 'flickr' });
  assert.ok(rec);
  assert.match(rec.dataUri, /^data:image\/jpeg;base64,/);
  assert.strictEqual(rec.title, 'A Duck');
  assert.strictEqual(rec.creator, 'Jo');
  assert.strictEqual(rec.sourceUrl, 'http://land/ok');
});

test('skips a non-commercial result and picks the next valid one', async () => {
  const search = { results: [
    { url: 'http://img/nc.jpg', title: 'NC', creator: 'x', license: 'by-nc', width: 1200, height: 800 },
    { url: 'http://img/ok.jpg', title: 'OK', creator: 'y', license: 'cc0', width: 1200, height: 800 },
  ] };
  const rec = await searchImage('duck', { fetchImpl: makeFetch(search, { 'http://img/ok.jpg': bigJpeg }), source: 'flickr' });
  assert.strictEqual(rec.title, 'OK');
});

test('skips results below the minimum shortest side', async () => {
  const search = { results: [
    { url: 'http://img/tiny.jpg', title: 'tiny', creator: 'x', license: 'by', width: 300, height: 200 },
  ] };
  const rec = await searchImage('duck', { fetchImpl: makeFetch(search, { 'http://img/tiny.jpg': bigJpeg }), source: 'flickr', minSide: 600 });
  assert.strictEqual(rec, null);
});

test('skips downloads that are too small (broken)', async () => {
  const search = { results: [
    { url: 'http://img/small.jpg', title: 't', creator: 'x', license: 'by', width: 1200, height: 800 },
  ] };
  const rec = await searchImage('duck', { fetchImpl: makeFetch(search, { 'http://img/small.jpg': Buffer.alloc(100) }), source: 'flickr' });
  assert.strictEqual(rec, null);
});

test('returns null when the API call throws', async () => {
  const fetchImpl = async () => { throw new Error('network down'); };
  const rec = await searchImage('duck', { fetchImpl, source: 'flickr', retries: 0 });
  assert.strictEqual(rec, null);
});

test('returns null when there are no results', async () => {
  const rec = await searchImage('duck', { fetchImpl: makeFetch({ results: [] }, {}), source: 'flickr' });
  assert.strictEqual(rec, null);
});

test('sniffs the real MIME from magic bytes rather than hardcoding jpeg', async () => {
  const pngBytes = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(50000, 1)]);
  const search = { results: [
    { url: 'http://img/ok.png', title: 'A Duck', creator: 'Jo', license: 'by', width: 1200, height: 800 },
  ] };
  const rec = await searchImage('duck', { fetchImpl: makeFetch(search, { 'http://img/ok.png': pngBytes }), source: 'flickr' });
  assert.ok(rec);
  assert.match(rec.dataUri, /^data:image\/png;base64,/);
});

test('rejects a non-raster (e.g. SVG) download instead of mislabeling it', async () => {
  const svgBytes = Buffer.concat([Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg">'), Buffer.alloc(50000, 32)]);
  const search = { results: [
    { url: 'http://img/ok.svg', title: 'A Duck', creator: 'Jo', license: 'by', width: 1200, height: 800 },
  ] };
  const rec = await searchImage('duck', { fetchImpl: makeFetch(search, { 'http://img/ok.svg': svgBytes }), source: 'flickr' });
  assert.strictEqual(rec, null);
});

test('prefers the thumbnail URL over the full-size url when downloading', async () => {
  const search = { results: [
    { url: 'http://img/full.tiff', thumbnail: 'http://img/thumb.jpg', title: 'A Duck', creator: 'Jo', license: 'by', width: 1200, height: 800 },
  ] };
  const fetchImpl = makeFetch(search, { 'http://img/thumb.jpg': bigJpeg });
  const rec = await searchImage('duck', { fetchImpl, source: 'flickr' });
  assert.ok(rec);
  assert.ok(fetchImpl.calls.includes('http://img/thumb.jpg'));
  assert.ok(!fetchImpl.calls.includes('http://img/full.tiff'));
});
