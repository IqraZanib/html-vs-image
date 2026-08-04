'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { runImageTask } = require('../kie/client');

function makeFetch({ createResp, recordSeq }) {
  let poll = 0;
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    if (url.includes('/jobs/createTask')) return { statusCode: 200, body: JSON.stringify(createResp) };
    if (url.includes('/jobs/recordInfo')) return { statusCode: 200, body: JSON.stringify(recordSeq[Math.min(poll++, recordSeq.length - 1)]) };
    return { statusCode: 404, body: '{}' };
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}
const ok = (url) => ({ code: 200, data: { state: 'success', creditsConsumed: 4, resultJson: JSON.stringify({ resultUrls: [url] }) } });

test('runs createTask then polls recordInfo to success and returns the url + credits', async () => {
  const fetchImpl = makeFetch({
    createResp: { code: 200, data: { taskId: 't1' } },
    recordSeq: [{ code: 200, data: { state: 'generating' } }, ok('http://img/out.png')],
  });
  const r = await runImageTask({ apiKey: 'k', model: 'nano-banana-2-lite', input: { prompt: 'x' }, fetchImpl, pollMs: 1 });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.url, 'http://img/out.png');
  assert.strictEqual(r.creditsConsumed, 4);
  assert.ok(fetchImpl.calls[0].url.includes('/jobs/createTask'));
});

test('returns ok:false when the task fails', async () => {
  const fetchImpl = makeFetch({
    createResp: { code: 200, data: { taskId: 't1' } },
    recordSeq: [{ code: 200, data: { state: 'fail', failMsg: 'bad prompt' } }],
  });
  const r = await runImageTask({ apiKey: 'k', model: 'nano-banana-2-lite', input: { prompt: 'x' }, fetchImpl, pollMs: 1 });
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /bad prompt/);
});

test('returns ok:false when createTask has no taskId', async () => {
  const fetchImpl = makeFetch({ createResp: { code: 402, msg: 'Insufficient Credits' }, recordSeq: [] });
  const r = await runImageTask({ apiKey: 'k', model: 'nano-banana-2-lite', input: { prompt: 'x' }, fetchImpl, pollMs: 1 });
  assert.strictEqual(r.ok, false);
});
