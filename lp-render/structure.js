'use strict';
// Turn a RAW lesson plan (pasted text, markdown, or a messy blob) into the strict
// content JSON the renderer consumes — using kie.ai GPT-5.2 (same provider/key as
// the vision gate). It must keep the lesson's own words and headings verbatim; it
// only structures, it never invents content (RULES R1–R3).
//
// Large lessons exceed a single model response, so this structures big inputs in
// CHUNKS (map-reduce) and merges the parts — any lesson, any size, converts (R11).
const { defaultFetch } = require('../imagegen/kie/client');

const CHAT_URL = 'https://api.kie.ai/gpt-5-2/v1/chat/completions';

const SYSTEM = `You convert a raw lesson plan into a STRICT JSON object for a lesson-image renderer.

Output ONLY the JSON object — no markdown, no prose, no code fences.

Shape:
{
  "meta": { "id": kebab-case string, "locale": "en"|"ur"|"sd"|"ar", "subject": string, "grade": string,
            "region": "pk", "title": string, "subtitle": string,
            "chips": [ { "label": string, "value": string } ] },
  "images": [ { "id": string, "concept": "diagram"|"scene", "label": string, "prompt": string } ],
  "sections": [ { "heading": string, "type": string, ...typeFields } ]
}

Section "type" values and their fields:
- "bullets": { "marker": "alpha"|"num"|"dot", "lead"?: string, "items": [ { "text": string, "tag"?: string } ] }
- "text":    { "body": string }
- "note":    { "label"?: string, "body": string }
- "chips":   { "items": [ string ] }              // for resource / material lists
- "steps":   { "items": [ { "label": string, "body": string } ] }  // numbered lesson steps
- "qa":      { "marker": "alpha", "items": [ { "q": string, "a"?: string } ] }
- "fields":  { "items": [ { "label": string, "value": string } ] }  // admin/detail forms
- "math":    { "engine": "katex", "items": [ { "label"?: string, "tex": string } ] }  // formulas as LaTeX
- "images":  { "imageIds": [ string ] }  // DISPLAYS images; ids must match entries in the top-level "images" array

Hard rules:
- Use the lesson's OWN words and headings VERBATIM. Do NOT summarize, reword, translate, or invent content. If the lesson is in Urdu/Swahili/etc, keep that language and set locale accordingly (default "en").
- Pick the section "type" that best fits each part of the source (objectives->bullets, resources->chips, steps->steps, questions->qa or bullets, conclusion/notes->note, forms->fields, formulas->math).
- Formulas: put standalone formulas in a "math" section as LaTeX "tex"; for a formula inside a sentence, keep it inline using $...$ in the text.
- Images: add 0-3 entries ONLY for concrete things the lesson actually names that benefit from a picture (a chart/diagram it references -> concept "diagram"; an illustrative scene/resource -> concept "scene"). If nothing visual is named, use an empty images array.
- Image prompts must describe the SUBJECT plainly. Do NOT over-specify style or details the model may not honour ("plain background", "flat cartoon", "speed lines", "no face"): the quality gate compares the image to its prompt, so an over-specified prompt makes a good image fail. Keep prompts subject-focused.
- If you declare any images, you MUST also add ONE "images" section whose "imageIds" list every declared image id, placed where the pictures belong.
- Every "id" must be unique kebab-case.`;

const PART_NOTE = `

IMPORTANT: The text below is ONE PART of a larger lesson. Output ONLY {"sections":[...], "images":[...]} for THIS part — do NOT include "meta". Follow all the same rules (verbatim words, section types, image rules). Never refuse; structure exactly what is here.`;

// One model call → parsed JSON object, or null on refusal / no-JSON / an {error} reply.
async function callStructure(text, system, { apiKey, fetchImpl = defaultFetch }) {
  const body = JSON.stringify({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Lesson text to structure:\n\n${text}` },
    ],
  });
  let json;
  try {
    const res = await fetchImpl(CHAT_URL, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body });
    json = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
  } catch (_) { return null; }
  const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  const m = String(content || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  let obj; try { obj = JSON.parse(m[0]); } catch (_) { return null; }
  if (obj && obj.error && !Array.isArray(obj.sections)) return null; // model refused
  return obj;
}

// Split raw text into <= maxChars chunks, preferring paragraph boundaries so a
// section rarely straddles two chunks.
function splitIntoChunks(raw, maxChars) {
  const paras = String(raw).split(/\n\s*\n/);
  const chunks = []; let cur = '';
  for (const p of paras) {
    if (p.length > maxChars) {
      if (cur) { chunks.push(cur); cur = ''; }
      for (let i = 0; i < p.length; i += maxChars) chunks.push(p.slice(i, i + maxChars));
      continue;
    }
    if (cur && (cur.length + 2 + p.length) > maxChars) { chunks.push(cur); cur = p; }
    else cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) chunks.push(cur);
  return chunks.length ? chunks : [String(raw)];
}

function normalize(obj) {
  return {
    meta: obj.meta && typeof obj.meta === 'object' ? obj.meta : { title: 'Lesson', locale: 'en' },
    images: Array.isArray(obj.images) ? obj.images : [],
    sections: Array.isArray(obj.sections) ? obj.sections : [],
  };
}

// Structure a large lesson in chunks and merge. Image ids are prefixed per chunk so
// they never collide, and the images-section references are rewritten to match. A
// chunk the model can't structure falls back to a verbatim text section — nothing
// is ever dropped.
async function structureChunked(text, { apiKey, fetchImpl, maxChars }) {
  const chunks = splitIntoChunks(text, maxChars);
  // Structure every chunk concurrently, then assemble in original order.
  const parts = await Promise.all(chunks.map((chunk, k) => {
    const system = k === 0 ? SYSTEM : SYSTEM + PART_NOTE;
    return callStructure(chunk, system, { apiKey, fetchImpl }).then((p) =>
      (p && Array.isArray(p.sections) && p.sections.length)
        ? p
        : { sections: [{ heading: k === 0 ? 'Lesson' : 'Continued', type: 'text', body: chunk.trim() }] });
  }));
  let meta = null; const images = []; const sections = [];
  parts.forEach((part, k) => {
    if (k === 0 && part.meta && typeof part.meta === 'object') meta = part.meta;
    const idmap = {};
    for (const im of (Array.isArray(part.images) ? part.images : [])) {
      const nid = `c${k}-${im.id}`; idmap[im.id] = nid; im.id = nid; images.push(im);
    }
    for (const s of part.sections) {
      if (s && s.type === 'images' && Array.isArray(s.imageIds)) s.imageIds = s.imageIds.map((id) => idmap[id] || id);
      sections.push(s);
    }
  });
  return { meta: meta || { title: 'Lesson', locale: 'en' }, images, sections };
}

// Structure any lesson to the content JSON. Small inputs go in one call; large ones
// (or a refusal) fall back to chunked structuring so any size converts smoothly.
async function structureLesson(raw, { apiKey, fetchImpl = defaultFetch, maxChars = 4500 } = {}) {
  if (!apiKey) throw new Error('structuring needs a kie.ai API key');
  const text = String(raw);
  if (text.length <= maxChars) {
    const single = await callStructure(text, SYSTEM, { apiKey, fetchImpl });
    if (single && Array.isArray(single.sections) && single.sections.length) return normalize(single);
  }
  return structureChunked(text, { apiKey, fetchImpl, maxChars });
}

module.exports = { structureLesson, splitIntoChunks };
