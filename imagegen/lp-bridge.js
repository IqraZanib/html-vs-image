'use strict';
// Bridge: resolve lp-render `picture_cards` cards with kind:"gen" into embedded
// AI-generated images (kie.ai, VLM-gated) — producing the `_resolved` shape the
// picture-cards renderer reads. Keeps lp-render itself free of any imagegen/kie
// dependency; this module is the (optional) glue the CLI wires in.
const https = require('node:https');
const { resolveSegmentImages } = require('./index');

function sniffDataUri(buf) {
  let mime = 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) mime = 'image/png';
  else if (buf.slice(0, 3).toString() === 'GIF') mime = 'image/gif';
  else if (buf[0] === 0xFF && buf[1] === 0xD8) mime = 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}
function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      if (r.statusCode !== 200) { r.resume(); return reject(new Error(`download ${r.statusCode}`)); }
      const c = [];
      r.on('data', (d) => c.push(d));
      r.on('end', () => { const buf = Buffer.concat(c); resolve({ dataUri: sniffDataUri(buf), bytes: buf.length }); });
    }).on('error', reject);
  });
}

// Collect every picture_cards card with kind:"gen" across the lesson.
function collectGenCards(lesson) {
  const cards = [];
  for (const s of (lesson.sections || [])) {
    if (s && s.type === 'picture_cards' && Array.isArray(s.cards)) {
      for (const c of s.cards) if (c && c.kind === 'gen') cards.push(c);
    }
  }
  return cards;
}

// Resolve all kind:"gen" cards: route each to the right kie.ai model via imagegen
// (decorative_scene / labeled_diagram ladder + VLM gate), download the winner and
// embed it as a base64 data URI in `card._resolved`. Non-mutating.
async function resolveGenCards(lesson, opts = {}) {
  const {
    apiKey,
    region = (lesson.meta && lesson.meta.region) || 'pk',
    resolveImpl = resolveSegmentImages,
    downloadImpl = download,
  } = opts;

  const out = JSON.parse(JSON.stringify(lesson));
  const cards = collectGenCards(out);
  if (!cards.length) return { lesson: out, report: [] };

  const segment = {
    subject: out.meta && out.meta.subject,
    grade: out.meta && out.meta.grade,
    region,
    blocks: cards.map((c) => ({
      type: (c.category === 'labeled_diagram' || c.category === 'diagram') ? 'DIAGRAM' : 'HOOK_STORY',
      text: c.query || c.prompt || c.label || '',
      characters: c.characters,
    })),
  };

  const { images, report } = await resolveImpl(segment, { apiKey, region });
  for (let i = 0; i < cards.length; i++) {
    const img = images[i];
    if (img && img.asset && img.asset.url) {
      try {
        const { dataUri } = await downloadImpl(img.asset.url);
        const model = img.model || (img.asset && img.asset.model);
        cards[i]._resolved = { mode: 'photo', dataUri, attribution: { title: 'AI-generated', creator: model, license: 'kie.ai', source: 'kie.ai' } };
      } catch (_) { cards[i]._resolved = { mode: 'none' }; }
    } else {
      cards[i]._resolved = { mode: 'none' }; // gate/ladder failed → omit (deterministic fallback)
    }
  }
  return { lesson: out, report };
}

module.exports = { resolveGenCards, collectGenCards };
