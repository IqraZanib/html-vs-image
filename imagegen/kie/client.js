'use strict';
const https = require('node:https');

const BASE = 'https://api.kie.ai/api/v1';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// A stalled connection used to hang forever: no socket timeout meant the promise
// never settled, so one bad request could freeze a render (and a batch of them)
// indefinitely. Every call now fails loudly after a bounded wait — the callers all
// have retry or fallback paths, but only if they get an answer.
const FETCH_TIMEOUT_MS = Number(process.env.KIE_FETCH_TIMEOUT_MS || 180000);

function defaultFetch(url, { method = 'GET', headers = {}, body, timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ method, hostname: u.hostname, path: u.pathname + u.search, headers }, (r) => {
      const c = [];
      r.on('data', (d) => c.push(d));
      r.on('end', () => resolve({ statusCode: r.statusCode, body: Buffer.concat(c).toString('utf8') }));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`request timed out after ${timeoutMs}ms`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Run one kie.ai image job: createTask → poll recordInfo → url + credits.
async function runImageTask({ apiKey, model, input, fetchImpl = defaultFetch, pollMs = 3000, maxPolls = 60 } = {}) {
  const t0 = Date.now();
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  let created;
  try {
    const res = await fetchImpl(`${BASE}/jobs/createTask`, { method: 'POST', headers, body: JSON.stringify({ model, input }) });
    created = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
  } catch (e) { return { ok: false, error: `createTask: ${e.message}`, latencyMs: Date.now() - t0 }; }
  const taskId = created && created.data && (created.data.taskId || created.data.task_id);
  if (!taskId) return { ok: false, error: `no taskId (${(created && created.msg) || 'unknown'})`, latencyMs: Date.now() - t0 };

  for (let i = 0; i < maxPolls; i++) {
    await delay(pollMs);
    let info;
    try {
      const res = await fetchImpl(`${BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers });
      info = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8')).data;
    } catch (_) { continue; }
    const state = info && info.state;
    if (state === 'success') {
      let urls = [];
      try { urls = JSON.parse(info.resultJson).resultUrls || []; } catch (_) { /* ignore */ }
      return { ok: true, url: urls[0] || null, creditsConsumed: info.creditsConsumed, latencyMs: Date.now() - t0 };
    }
    if (state === 'fail') return { ok: false, error: (info && info.failMsg) || 'task failed', creditsConsumed: info && info.creditsConsumed, latencyMs: Date.now() - t0 };
  }
  return { ok: false, error: 'timeout', latencyMs: Date.now() - t0 };
}

module.exports = { runImageTask, defaultFetch };
