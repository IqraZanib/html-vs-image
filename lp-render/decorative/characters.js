'use strict';
// Reusable animated character cast (RULES R8). Generated ONCE via a cheap image
// model, quality-gated (clean single character, no text, human values), and cached
// to disk — then reused across every lesson-plan image. When a section has no
// relevant real image, the renderer drops one of these characters in to point at
// the heading in a decent, educational way.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { generateImage } = require('./../../imagegen/kie/generate');
const { checkImage } = require('./../../imagegen/quality_gate');

// Cheap + reliable for character art (no labels, so mis-mapping is irrelevant).
// nano-banana-2-lite = 4cr, fast, clean flat art. It occasionally returns a
// transient "generate failed", so we retry it a few times (fast + cheap) before
// falling back to the open-weight flux-2/pro (slower/flakier, last resort).
const LADDER = ['nano-banana-2-lite', 'flux-2/pro-text-to-image'];
const RETRIES = { 'nano-banana-2-lite': 4, 'flux-2/pro-text-to-image': 1 };
const PARAMS = {
  'nano-banana-2-lite': { aspect_ratio: '3:4' },
  'flux-2/pro-text-to-image': { aspect_ratio: '2:3', resolution: '1K' },
};

const STYLE = 'full body, isolated on a plain solid white background, no text and no words anywhere, clean thick black outlines, bright flat colors, friendly children educational storybook style';
// Characters gesture to THEIR right → when placed on the left they point inward;
// the renderer CSS-flips them when placed on the right.
const CAST = [
  // teacher colour variants — rotated so repeated teachers never look identical (R9)
  { id: 'teacher', role: 'female teacher',
    prompt: `flat vector cartoon illustration of a friendly Pakistani female teacher wearing a light blue hijab and a teal shalwar kameez, smiling warmly, gesturing with one open hand to her right as if presenting a lesson, ${STYLE}` },
  { id: 'teacher_coral', role: 'female teacher',
    prompt: `flat vector cartoon illustration of a friendly Pakistani female teacher wearing a cream hijab and a coral-red shalwar kameez, smiling warmly, gesturing with one open hand to her right as if presenting a lesson, ${STYLE}` },
  { id: 'teacher_purple', role: 'female teacher',
    prompt: `flat vector cartoon illustration of a friendly Pakistani female teacher wearing a soft lavender hijab and a plum-purple shalwar kameez, smiling warmly, gesturing with one open hand to her right as if presenting a lesson, ${STYLE}` },
  // scene poses — different presentations (R9)
  { id: 'teacher_board', role: 'female teacher teaching at a board',
    prompt: `flat vector cartoon illustration of a friendly Pakistani female teacher wearing a mustard-yellow shalwar kameez and a white hijab, standing beside a green classroom chalkboard and teaching, pointing at the board with a pointer stick, ${STYLE}` },
  { id: 'students_sitting', role: 'group of students sitting and listening',
    prompt: `flat vector cartoon illustration of three happy Pakistani school students in light blue uniforms sitting on the floor cross-legged facing forward and listening attentively, ${STYLE}` },
  // simple pointing figures
  { id: 'girl', role: 'schoolgirl',
    prompt: `flat vector cartoon illustration of a happy Pakistani schoolgirl wearing a cobalt-blue school uniform shalwar kameez with a maroon dupatta, smiling, gesturing with one open hand to her right as if pointing at something, ${STYLE}` },
  { id: 'boy', role: 'schoolboy',
    prompt: `flat vector cartoon illustration of a happy Pakistani schoolboy wearing a light blue school uniform shirt and navy trousers, neat hair, smiling, gesturing with one open hand to his right as if pointing at something, ${STYLE}` },
  { id: 'students_pair', role: 'two students',
    prompt: `flat vector cartoon illustration of two happy Pakistani school students standing together talking and discussing, a girl in a light blue uniform with white dupatta and a boy in a light blue shirt, one holding an open book, ${STYLE}` },
];

function download(url) {
  return new Promise((res, rej) => {
    https.get(url, (r) => {
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('download ' + r.statusCode)); }
      const chunks = []; r.on('data', (d) => chunks.push(d));
      r.on('end', () => { const b = Buffer.concat(chunks); const mime = b[0] === 0x89 && b[1] === 0x50 ? 'image/png' : 'image/jpeg'; res('data:' + mime + ';base64,' + b.toString('base64')); });
    }).on('error', rej);
  });
}

async function generateOne(member, apiKey, gatePolicy) {
  const expectation = `a single clean friendly flat cartoon ${member.role} on a plain white background, full body, with NO text or words in the image, respectful and appropriate for a children's classroom`;
  for (const model of LADDER) {
    for (let attempt = 0; attempt < (RETRIES[model] || 1); attempt++) {
      try {
        const gen = await generateImage({ apiKey, model, prompt: member.prompt, params: PARAMS[model] });
        if (!gen.ok || !gen.url) continue; // transient failure — retry this model
        const gate = await checkImage({ apiKey, imageUrl: gen.url, expectation, policy: gatePolicy });
        if (gate.pass) return { dataUri: await download(gen.url), model, prompt: member.prompt };
      } catch (_) { /* retry / next model */ }
    }
  }
  return null;
}

// Ensure the whole cast exists (generate only what is missing/changed), cache to
// disk, and return { id -> dataUri } for the members that passed the gate.
async function ensureCast({ apiKey, gatePolicy = '', castFile } = {}) {
  const file = castFile || path.join(__dirname, '../../assets/generated/cast/cast.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let cache = {};
  if (fs.existsSync(file)) { try { cache = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { cache = {}; } }

  const missing = CAST.filter((m) => !(cache[m.id] && cache[m.id].prompt === m.prompt && cache[m.id].dataUri));
  if (missing.length && !apiKey) {
    // No key and nothing cached for these — skip enrichment gracefully.
    console.log(`  (skipping ${missing.length} character(s): no KIE_API_KEY and not cached)`);
  } else {
    for (const m of missing) {
      const got = await generateOne(m, apiKey, gatePolicy);
      cache[m.id] = got || { dataUri: null, prompt: m.prompt };
      fs.writeFileSync(file, JSON.stringify(cache, null, 2)); // persist after each — never lose prior work
      console.log(got ? `  ✓ character "${m.id}" generated and passed the gate` : `  ✗ character "${m.id}" could not be generated`);
    }
  }

  const map = {};
  for (const m of CAST) { const c = cache[m.id]; if (c && c.dataUri) map[m.id] = c.dataUri; }
  return map;
}

module.exports = { ensureCast, CAST };
