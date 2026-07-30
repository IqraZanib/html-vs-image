'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { defaultFetch } = require('../images/openverse');

test('defaultFetch follows one redirect and returns final 200 response', async (t) => {
  const server = http.createServer((req, res) => {
    if (req.url === '/initial') {
      res.writeHead(302, { 'Location': `http://localhost:${server.address().port}/final` });
      res.end();
    } else if (req.url === '/final') {
      res.writeHead(200);
      res.end('success-body');
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await defaultFetch(`http://localhost:${port}/initial`, { binary: false });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'success-body');
  } finally {
    server.close();
  }
});

test('defaultFetch stops after one redirect and returns 302 without following further', async (t) => {
  const server = http.createServer((req, res) => {
    if (req.url === '/r0') {
      res.writeHead(302, { 'Location': `http://localhost:${server.address().port}/r1` });
      res.end();
    } else if (req.url === '/r1') {
      res.writeHead(302, { 'Location': `http://localhost:${server.address().port}/r2` });
      res.end();
    } else if (req.url === '/r2') {
      res.writeHead(200);
      res.end('should-not-reach');
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await defaultFetch(`http://localhost:${port}/r0`, { binary: false });
    assert.strictEqual(res.statusCode, 302);
    assert.notStrictEqual(res.body, 'should-not-reach');
  } finally {
    server.close();
  }
});
