'use strict';
const crypto = require('node:crypto');
const { resolveRegion } = require('./prompts/regions');

// Per-lesson character spec: each character gets region-appropriate appearance,
// plus a stable seed so a lesson's scenes look consistent on regenerate.
function characterSpec(block, regionId = 'pk') {
  const region = resolveRegion(regionId);
  const chars = (block && block.characters) || [];
  const characters = chars.map((c) => ({
    name: c.name || 'a child',
    role: c.role || 'student',
    appearance: `${c.role || 'student'} wearing ${region.dress}`,
  }));
  const key = JSON.stringify({ names: characters.map((c) => c.name), region: region.id });
  const hex = crypto.createHash('sha1').update(key).digest('hex').slice(0, 8);
  const seed = parseInt(hex, 16) % 2147483647;
  return { characters, seed };
}

module.exports = { characterSpec };
