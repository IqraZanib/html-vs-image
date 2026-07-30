'use strict';
const http = require('node:http');
const https = require('node:https');
const { isAllowedLicense } = require('./license');

const API = 'https://api.openverse.org/v1/images/';

// Default network fetch. Resolves { statusCode, body } where body is a string
// unless binary:true (then a Buffer). Follows at most one level of redirects.
function defaultFetch(url, { binary = false, timeout = 12000, userAgent = 'TaleemabadLP/1.0 (educational)', redirectsLeft = 1 } = {}) {
  return new Promise((resolve, reject) => {
    const transport = url.startsWith('https:') ? https : http;
    const req = transport.get(url, { headers: { 'User-Agent': userAgent } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && redirectsLeft > 0) {
        r.resume();
        return resolve(defaultFetch(r.headers.location, { binary, timeout, userAgent, redirectsLeft: redirectsLeft - 1 }));
      }
      const chunks = [];
      r.on('data', (d) => chunks.push(d));
      r.on('end', () => resolve({ statusCode: r.statusCode, body: binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error('timeout')));
  });
}

async function withRetry(fn, retries) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function searchImage(query, opts = {}) {
  const {
    source = 'wikimedia', license = 'cc0,pdm,by,by-sa', size = 'medium',
    minSide = 600, pageSize = 12, timeout = 12000, retries = 1,
    fetchImpl = defaultFetch, userAgent = 'TaleemabadLP/1.0 (educational)',
  } = opts;

  const api = `${API}?q=${encodeURIComponent(query)}&source=${encodeURIComponent(source)}`
    + `&license=${encodeURIComponent(license)}&size=${encodeURIComponent(size)}`
    + `&mature=false&page_size=${pageSize}`;

  let data;
  try {
    const res = await withRetry(() => fetchImpl(api, { timeout, userAgent }), retries);
    data = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
  } catch (_) { return null; }

  for (const r of (data.results || [])) {
    if (!r.url) continue;
    if (!isAllowedLicense(r.license)) continue;
    const w = Number(r.width), h = Number(r.height);
    if (w && h && Math.min(w, h) < minSide) continue;
    let buf;
    try {
      const res = await withRetry(() => fetchImpl(r.url, { binary: true, timeout, userAgent }), retries);
      if (res.statusCode && res.statusCode !== 200) continue;
      buf = res.body;
    } catch (_) { continue; }
    if (!Buffer.isBuffer(buf) || buf.length < 4000 || buf.length > 2_200_000) continue;
    return {
      dataUri: `data:image/jpeg;base64,${buf.toString('base64')}`,
      title: (r.title || '').trim(),
      creator: (r.creator || 'unknown').trim(),
      license: (`CC ${r.license || ''} ${r.license_version || ''}`).trim(),
      source: r.source || source,
      sourceUrl: r.foreign_landing_url || r.url,
    };
  }
  return null;
}

module.exports = { searchImage, defaultFetch };
