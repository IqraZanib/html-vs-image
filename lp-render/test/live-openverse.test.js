'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { searchImage } = require('../images/openverse');

// Opt-in only: hits the real Openverse API. Enable with LP_LIVE_IMAGE_TEST=1.
// Uses source=flickr because Wikimedia Commons is unreachable in the dev sandbox.
test('live: fetches a real CC photo from Openverse', { skip: process.env.LP_LIVE_IMAGE_TEST !== '1' }, async () => {
  const rec = await searchImage('cow farm', { source: 'flickr' });
  assert.ok(rec && rec.dataUri.startsWith('data:image/jpeg;base64,'));
  assert.ok(rec.license && rec.creator);
});
