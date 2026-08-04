'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveSegmentImages } = require('../index');

const skip = process.env.IMAGEGEN_LIVE !== '1' || !process.env.KIE_API_KEY;

test('live: generates a real hook image that passes the gate', { skip }, async () => {
  const segment = { subject: 'English', grade: '1', region: 'pk',
    blocks: [{ type: 'HOOK_STORY', text: 'Ali and Sara ride a colourful train through green fields',
      characters: [{ name: 'Ali', role: 'student, boy' }, { name: 'Sara', role: 'student, girl' }] }] };
  const { images } = await resolveSegmentImages(segment, { apiKey: process.env.KIE_API_KEY, region: 'pk' });
  const hook = images.find((i) => i.blockType === 'HOOK_STORY');
  assert.ok(hook.asset && /^https?:\/\//.test(hook.asset.url), 'got a real image URL');
});
