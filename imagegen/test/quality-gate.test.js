'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { checkImage } = require('../quality_gate');

const chat = (content) => ({ statusCode: 200, body: JSON.stringify({ choices: [{ message: { content } }] }) });

test('parses a passing JSON verdict', async () => {
  const fetchImpl = async () => chat('{"pass": true, "reason": "warm and on-topic"}');
  const r = await checkImage({ apiKey: 'k', imageUrl: 'http://img/x.png', expectation: 'a warm train scene', fetchImpl });
  assert.strictEqual(r.pass, true);
});

test('parses a failing verdict with a reason', async () => {
  const fetchImpl = async () => chat('{"pass": false, "reason": "shows a book cover, not the scene"}');
  const r = await checkImage({ apiKey: 'k', imageUrl: 'http://img/x.png', expectation: 'a train scene', fetchImpl });
  assert.strictEqual(r.pass, false);
  assert.match(r.reason, /book cover/);
});

test('fails closed when the VLM call errors', async () => {
  const fetchImpl = async () => { throw new Error('network down'); };
  const r = await checkImage({ apiKey: 'k', imageUrl: 'http://img/x.png', expectation: 'x', fetchImpl });
  assert.strictEqual(r.pass, false);
});
