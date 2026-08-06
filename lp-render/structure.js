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
  "meta": { "id": kebab-case string, "locale": a language code matching the lesson ("en","ur","sd","ar","sw",…), "subject": string, "grade": string,
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
- Use the lesson's OWN words and headings VERBATIM. Do NOT summarize, reword, translate, or invent content. If the lesson is in Urdu/Swahili/Arabic/etc, keep that language and set locale accordingly (default "en").
- LANGUAGE OF EVERYTHING A READER SEES: every heading, section title, item label and sub-heading MUST be in the SAME language as the lesson. The source often wraps non-English content in ENGLISH field keys (teacher, pupil, board, checkpoint, objective, g1/g2/g3, teachers_corner, note…). Translate ONLY those short structural labels into the content's language — never leave an English label in a non-English lesson (Arabic e.g. المعلم، التلميذ، السبورة، الهدف، الصف الأول، ركن المعلم). The lesson's own sentences/values stay VERBATIM — do not translate the actual content.
- Pick the section "type" that best fits each part of the source (objectives->bullets, resources->chips, steps->steps, questions->qa or bullets, conclusion/notes->note, forms->fields, formulas->math).
- If the input has "## Heading" blocks, each block is ONE section (its heading is that "## Heading"). Fold the block's lines into that section — e.g. a lesson phase with teacher/pupil/board lines becomes a single section (a note or a short steps list), NOT one section per line. Never emit more than a couple of sections per block.
- Formulas: put standalone formulas in a "math" section as LaTeX "tex"; for a formula inside a sentence, keep it inline using $...$ in the text.
- Images: add 0-3 entries ONLY for concrete things the lesson actually names that benefit from a picture (a chart/diagram it references -> concept "diagram"; an illustrative scene/resource -> concept "scene"). If nothing visual is named, use an empty images array.
- Image prompts must describe the SUBJECT plainly. Do NOT over-specify style or details the model may not honour ("plain background", "flat cartoon", "speed lines", "no face"): the quality gate compares the image to its prompt, so an over-specified prompt makes a good image fail. Keep prompts subject-focused.
- IN-IMAGE TEXT LANGUAGE: if the lesson is NOT in English, any label or word that appears INSIDE the image must be written in the lesson's language and script — never English. State this in the prompt of every "diagram" (e.g. Arabic → "…with each part labelled in Arabic"; Kiswahili → "…labelled in Kiswahili"). Give the actual labels in that language where you can (Arabic e.g. الأنف، الرئة، القلب). An English label inside an Arabic/Kiswahili lesson image is a defect.
- Images must be INFORMATIVE and content-relevant, like a good textbook illustration that helps the teacher explain the concept — never decorative or irrelevant filler. For vocabulary/parts, prefer a LABELLED "diagram" (e.g. a family with each member labelled by name: أبي، أمي، أخت …; the parts of a plant; a process). 1–3 well-chosen images per lesson is plenty; not every section needs one.
- Cultural grounding: any people or places in a prompt must match the lesson's region — Arabic → Yemeni children in a Yemeni setting; Kiswahili → Kenyan children in a Kenyan setting; otherwise Pakistani — so local teachers recognise their own pupils.
- Where the concept involves children doing something (counting, an activity, a family, playing), prefer a "scene" that SHOWS the region's own children doing it — e.g. "Kenyan children in a classroom counting stones to add 3 + 2 = 5"; "a Yemeni family" — so local children see themselves in the picture. Use a bare labelled diagram only when labelling parts is the actual point.
- If you declare any images, you MUST also add ONE "images" section whose "imageIds" list every declared image id, placed where the pictures belong.
- Every "id" must be unique kebab-case.`;

const PART_NOTE = `

IMPORTANT: The text below is ONE PART of a larger lesson. Output ONLY {"sections":[...], "images":[...]} for THIS part — do NOT include "meta". Follow all the same rules (verbatim words, section types, image rules). Never refuse; structure exactly what is here.`;

// Pull the actual lesson text out of an arbitrary JSON blob (an API/LLM response
// with the lesson buried in a text field, wrapped in model/usage/token metadata),
// so that noise never reaches the render. Plain text (or a real content JSON) is
// returned unchanged.
const META_KEY = /^(model|models|via|base_url|url|language|region|role|object|finish_reason|id|idx|index|self_hosted|created|choices?|status)$/i;
// Cryptic field keys → a readable English label the structurer can understand and
// then localise into the content's language (R2). Values are never touched.
const KEY_LABEL = {
  today_objective: 'Objective', objective: 'Objective', common_error: 'Common error',
  wrong: 'Common mistake', right: 'Correct form', note: 'Note', teach_note: 'Teaching note',
  teacher: 'Teacher', pupil: 'Pupil', board: 'Board', checkpoint: 'Checkpoint',
  grr: 'Gradual release', time: 'Time', key_terms: 'Key terms', term: 'Term', def: 'Definition',
  multigrade: 'Multigrade', g1: 'Grade 1', g2: 'Grade 2', g3: 'Grade 3',
  teachers_corner: "Teacher's corner",
};
// Parse JSON even if it's lightly broken: try as-is, then unescape a doubly-escaped
// JSON string (\" and \n), then treat it as a quoted string. Returns null if none work.
function looseParse(raw, depth = 0) {
  let v = null;
  try { v = JSON.parse(raw); } catch (_) {
    try { v = JSON.parse(raw.replace(/\\r/g, '').replace(/\\t/g, '\t').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')); } catch (_) { return null; }
  }
  // Double-encoded: a parse that yields a JSON-looking string — parse again.
  if (typeof v === 'string' && depth < 3 && /[{[]/.test(v)) { const inner = looseParse(v, depth + 1); if (inner != null) return inner; }
  return v;
}
// Last resort when JSON can't be parsed at all (e.g. literal newlines inside a
// string value): pull the biggest "text"/"content"/"body" field out by hand, so a
// metadata-wrapped blob never gets echoed into the render verbatim.
function textFromBlob(raw) {
  for (const k of ['text', 'content', 'body']) {
    const i = raw.lastIndexOf(`"${k}"`);
    if (i < 0) continue;
    const c = raw.indexOf(':', i);
    if (c < 0) continue;
    let s = raw.slice(c + 1).replace(/^\s+/, '');
    if (s[0] === '"') s = s.slice(1);
    const end = s.lastIndexOf('"');
    if (end > 0) s = s.slice(0, end);
    s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').trim();
    if (s.length > 40) return s;
  }
  return String(raw);
}
function extractLessonText(raw) {
  const obj = looseParse(String(raw));
  if (obj == null) return textFromBlob(String(raw)); // unparseable → salvage the lesson text
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object' && Array.isArray(obj.sections)) return String(raw); // already our schema

  // Flatten the JSON to readable "key: value" lines, keeping EVERY string field of
  // the lesson (short and long) and dropping only metadata keys / bare numbers &
  // booleans (tokens, page, grade, model, urls…). This preserves a richly-structured
  // lesson (objectives, phases, terms, notes) instead of trimming to a few fields.
  const HEAD_FIELDS = ['key', 'title', 'name', 'heading', 'phase', 'term', 'step', 'label'];
  const lines = [];
  const walk = (v, key) => {
    if (v == null) return;
    if (typeof v === 'string') { if (v.trim()) lines.push(key ? `${KEY_LABEL[key] || key}: ${v.trim()}` : v.trim()); return; }
    if (typeof v === 'number' || typeof v === 'boolean') return; // almost always metadata
    if (Array.isArray(v)) { for (const item of v) { if (item && typeof item === 'object') lines.push(''); walk(item, key); } return; }
    if (typeof v === 'object') {
      // Emit a "## Heading" so each item (a phase, a term…) reads as ONE block.
      const hf = HEAD_FIELDS.find((f) => typeof v[f] === 'string' && v[f].trim());
      if (hf) lines.push(`## ${v[hf].trim()}`);
      for (const k of Object.keys(v)) { if (META_KEY.test(k) || k === hf) continue; walk(v[k], k); }
    }
  };
  // API responses usually wrap the lesson under `content`; focus there but keep the
  // title/subject hints from the top level.
  const root = (obj && typeof obj.content === 'object' && obj.content) ? obj.content : obj;
  if (root !== obj) { walk(obj.lesson, 'lesson'); walk(obj.subject_ar || obj.subject, 'subject'); }
  walk(root, '');
  const text = lines.join('\n').trim();
  if (text.length >= 40) return text;

  // Fallback: no structured strings found — take the long prose.
  const strings = [];
  (function w(v) { if (typeof v === 'string') { if (v.trim()) strings.push(v); } else if (Array.isArray(v)) v.forEach(w); else if (v && typeof v === 'object') Object.values(v).forEach(w); })(obj);
  if (!strings.length) return String(raw);
  const long = strings.filter((s) => s.trim().length > 150);
  return (long.length ? long : [strings.sort((a, b) => b.length - a.length)[0]]).join('\n\n');
}

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
// Surface a language/region hint from the raw blob so the structurer sets the right
// locale (→ region cast + cultural grounding), even though those keys are metadata.
function langRegionHint(raw) {
  const s = String(raw);
  const lang = (s.match(/"language"\s*:\s*"([A-Za-z-]{2,8})"/) || [])[1];
  const region = (s.match(/"region"\s*:\s*"([^"]{2,40})"/) || [])[1];
  const bits = [];
  if (lang) bits.push(`Lesson language code: ${lang}`);
  if (region) bits.push(`Region: ${region}`);
  return bits.length ? bits.join('. ') + '.\n\n' : '';
}
async function structureLesson(raw, { apiKey, fetchImpl = defaultFetch, maxChars = 4500 } = {}) {
  if (!apiKey) throw new Error('structuring needs a kie.ai API key');
  const text = langRegionHint(String(raw)) + extractLessonText(String(raw)); // hint + stripped lesson
  if (text.length <= maxChars) {
    const single = await callStructure(text, SYSTEM, { apiKey, fetchImpl });
    if (single && Array.isArray(single.sections) && single.sections.length) return normalize(single);
  }
  return structureChunked(text, { apiKey, fetchImpl, maxChars });
}

module.exports = { structureLesson, splitIntoChunks, extractLessonText };
