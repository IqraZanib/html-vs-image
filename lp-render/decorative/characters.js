'use strict';
// Reusable animated character cast (RULES R8, R20, R22). Generated ONCE per REGION,
// quality-gated, and cached to assets/generated/cast/<region>.json — then reused.
// The region follows the lesson's language so local teachers see local children:
//   Arabic → Yemen · Kiswahili → Kenya · otherwise → Pakistan.
// Characters are only a FALLBACK: the renderer uses them on lessons that have no
// real content images, to keep them from looking blank.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { generateImage } = require('./../../imagegen/kie/generate');
const { checkImage } = require('./../../imagegen/quality_gate');

const LADDER = ['nano-banana-2-lite', 'flux-2/pro-text-to-image'];
const RETRIES = { 'nano-banana-2-lite': 4, 'flux-2/pro-text-to-image': 1 };
const PARAMS = { 'nano-banana-2-lite': { aspect_ratio: '3:4' }, 'flux-2/pro-text-to-image': { aspect_ratio: '2:3', resolution: '1K' } };
const STYLE = 'full body, isolated on a plain solid white background, no text and no words anywhere, clean thick black outlines, bright flat colors, friendly children educational storybook style';

// Culturally-grounded descriptions per region (dress, features, setting).
const REGIONS = {
  pakistan: {
    teacher: 'a friendly Pakistani female teacher wearing a light blue hijab and a teal shalwar kameez',
    teacher2: 'a friendly Pakistani female teacher wearing a cream hijab and a coral-red shalwar kameez',
    teacher3: 'a friendly Pakistani female teacher wearing a soft lavender hijab and a plum-purple shalwar kameez',
    board: 'a friendly Pakistani female teacher wearing a mustard-yellow shalwar kameez and a white hijab',
    sitting: 'three happy Pakistani school children in light blue uniforms',
    girl: 'a happy Pakistani schoolgirl wearing a cobalt-blue school uniform shalwar kameez with a maroon dupatta',
    boy: 'a happy Pakistani schoolboy wearing a light blue school uniform shirt and navy trousers',
    pair: 'two happy Pakistani school children, a girl in a light blue uniform with a white dupatta and a boy in a light blue shirt',
  },
  kenya: {
    teacher: 'a friendly Kenyan female teacher with dark brown skin, wearing a colourful African headwrap and a smart blouse',
    teacher2: 'a friendly Kenyan female teacher with dark brown skin and short natural hair, wearing a maroon blouse and skirt',
    teacher3: 'a friendly Kenyan female teacher with dark brown skin, wearing a green dress',
    board: 'a friendly Kenyan female teacher with dark brown skin in a smart blouse',
    sitting: 'three happy Kenyan school children with dark brown skin wearing green school-uniform sweaters',
    girl: 'a happy Kenyan schoolgirl with dark brown skin and short hair, wearing a green school-uniform pinafore',
    boy: 'a happy Kenyan schoolboy with dark brown skin and short hair, wearing a green school-uniform sweater and grey shorts',
    pair: 'two happy Kenyan school children with dark brown skin in green school uniforms, one holding an open book',
  },
  yemen: {
    teacher: 'a friendly Yemeni female teacher wearing a black hijab and a modest dark abaya',
    teacher2: 'a friendly Yemeni female teacher wearing a grey hijab and a modest maroon abaya',
    teacher3: 'a friendly Yemeni female teacher wearing a navy hijab and a modest long dress',
    board: 'a friendly Yemeni female teacher wearing a black hijab and a modest abaya',
    sitting: 'three happy Yemeni school children, girls in small white headscarves and modest uniforms',
    girl: 'a happy Yemeni schoolgirl wearing a small white headscarf and a modest school uniform',
    boy: 'a happy Yemeni schoolboy wearing a simple light shirt and dark trousers',
    pair: 'two happy Yemeni school children, a girl in a small white headscarf and a boy in a light shirt, one holding an open book',
  },
};
const REGION_BY_LOCALE = { sw: 'kenya', ar: 'yemen' }; // else pakistan
const regionForLocale = (locale) => REGION_BY_LOCALE[String(locale || '').toLowerCase()] || 'pakistan';

const PRESENT = ', smiling warmly, gesturing with one open hand to their right as if presenting a lesson, ';
const POINT = ', smiling, gesturing with one open hand to their right as if pointing at something, ';
function buildCast(region) {
  const R = REGIONS[region] || REGIONS.pakistan;
  const art = (s) => `flat vector cartoon illustration of ${s}`;
  return [
    { id: 'teacher', role: 'female teacher', prompt: `${art(R.teacher)}${PRESENT}${STYLE}` },
    { id: 'teacher_coral', role: 'female teacher', prompt: `${art(R.teacher2)}${PRESENT}${STYLE}` },
    { id: 'teacher_purple', role: 'female teacher', prompt: `${art(R.teacher3)}${PRESENT}${STYLE}` },
    { id: 'teacher_board', role: 'female teacher teaching at a board', prompt: `${art(R.board)}, standing beside a green classroom chalkboard and teaching, pointing at the board with a pointer stick, ${STYLE}` },
    { id: 'students_sitting', role: 'group of students sitting and listening', prompt: `${art(R.sitting)} sitting on the floor cross-legged facing forward and listening attentively, ${STYLE}` },
    { id: 'girl', role: 'schoolgirl', prompt: `${art(R.girl)}${POINT}${STYLE}` },
    { id: 'boy', role: 'schoolboy', prompt: `${art(R.boy)}${POINT}${STYLE}` },
    { id: 'students_pair', role: 'two students', prompt: `${art(R.pair)} standing together talking and discussing, ${STYLE}` },
  ];
}

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
        if (!gen.ok || !gen.url) continue;
        const gate = await checkImage({ apiKey, imageUrl: gen.url, expectation, policy: gatePolicy });
        if (gate.pass) return { dataUri: await download(gen.url), model, prompt: member.prompt };
      } catch (_) { /* retry / next model */ }
    }
  }
  return null;
}

// Ensure the cast for a region exists (generate missing members concurrently),
// cache to disk, and return { id -> dataUri } for those that passed the gate.
async function ensureCast({ apiKey, gatePolicy = '', region = 'pakistan', locale, castFile } = {}) {
  const reg = locale ? regionForLocale(locale) : region;
  const file = castFile || path.join(__dirname, '../../assets/generated/cast', `${reg}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let cache = {};
  if (fs.existsSync(file)) { try { cache = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { cache = {}; } }

  const cast = buildCast(reg);
  const missing = cast.filter((m) => !(cache[m.id] && cache[m.id].prompt === m.prompt && cache[m.id].dataUri));
  if (missing.length && !apiKey) {
    console.log(`  (skipping ${missing.length} ${reg} character(s): no KIE_API_KEY and not cached)`);
  } else if (missing.length) {
    console.log(`  generating ${missing.length} ${reg} character(s)…`);
    const results = await Promise.all(missing.map((m) => generateOne(m, apiKey, gatePolicy)));
    missing.forEach((m, i) => { cache[m.id] = results[i] || { dataUri: null, prompt: m.prompt }; });
    fs.writeFileSync(file, JSON.stringify(cache, null, 2));
  }

  const map = {};
  for (const m of cast) { const c = cache[m.id]; if (c && c.dataUri) map[m.id] = c.dataUri; }
  return map;
}

module.exports = { ensureCast, buildCast, regionForLocale };
