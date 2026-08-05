'use strict';
// Turn a RAW lesson plan (pasted text, markdown, or a messy blob) into the strict
// content JSON the renderer consumes — using kie.ai GPT-5.2 (same provider/key as
// the vision gate). It must keep the lesson's own words and headings verbatim; it
// only structures, it never invents content (RULES R1–R3).
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
- Pick the section "type" that best fits each part of the source (objectives->bullets, resources->chips, steps->steps, questions->qa or bullets, conclusion/notes->note, forms->fields).
- Formulas: put standalone formulas in a "math" section as LaTeX "tex"; for a formula inside a sentence, keep it inline using $...$ in the text.
- Images: add 0-3 entries ONLY for concrete things the lesson actually names that benefit from a picture (a chart/diagram it references -> concept "diagram"; an illustrative scene/resource -> concept "scene"). If nothing visual is named, use an empty images array.
- Image prompts must describe the SUBJECT plainly. Do NOT over-specify style or details the model may not honour ("plain background", "flat cartoon", "speed lines", "no face"): the quality gate compares the image to its prompt, so an over-specified prompt makes a good image fail. Keep prompts subject-focused.
- IMPORTANT: if you declare any images, you MUST also add exactly ONE "images" section, placed where the pictures belong (e.g. right after the introduction), whose "imageIds" list every declared image id. Declared images that no section references are wasted, so never leave them out.
- Every "id" (meta.id, image ids) must be unique kebab-case.`;

async function structureLesson(raw, { apiKey, fetchImpl = defaultFetch } = {}) {
  if (!apiKey) throw new Error('structuring needs a kie.ai API key');
  const body = JSON.stringify({
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Raw lesson plan to structure:\n\n${String(raw)}` },
    ],
  });
  const res = await fetchImpl(CHAT_URL, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body });
  const json = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
  const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('could not structure the text into JSON (no object returned)');
  return JSON.parse(m[0]);
}

module.exports = { structureLesson };
