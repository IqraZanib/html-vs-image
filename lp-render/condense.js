'use strict';
// Condense a FULL lesson content JSON into the 2-page "daily guide" template — the
// region design sets' teacher-facing format (12 role sections, see
// decorative/regions/<region>/DESIGN.md). Same provider/key as the structurer.
// It condenses ONLY from the source (never invents facts), keeps the lesson's
// language, and reuses the source's image prompts VERBATIM so the asset store
// restores them free.
const { defaultFetch } = require('../imagegen/kie/client');

const CHAT_URL = 'https://api.kie.ai/gpt-5-2/v1/chat/completions';

const SYSTEM = `You condense a FULL lesson-plan JSON into a compact 2-page "daily teacher guide" JSON for the same renderer.

Output ONLY the JSON object — no markdown, no prose, no code fences.

THE TARGET SHAPE — exactly these 12 sections, with these EXACT "id" values, in this order:
1  { "id":"lesson-line",    "heading":"درس" (or "Lesson"), "type":"text", "body": subject · grade · lesson topic (page ref) — ONE line }
2  { "id":"goal",           "heading": goal word, "type":"note", "body": starts with the bolded goal label (Arabic: "**هدف اليوم:** …"; English: "**Today's goal:** …") then the lesson goal in ≤ 35 words }
3  { "id":"errors",         "heading": common-mistakes title (Arabic: "أخطاء شائعة — انتبه لها"), "type":"qa", "items": exactly 2: { "q":"✗ خطأ" (or "✗ Mistake"), "a": the misconception ≤ 30 words } and { "q":"✓ صواب" (or "✓ Correct"), "a": the correction ≤ 30 words } — take these from the source's watch-outs / common errors }
4  { "id":"errors-caption", "heading":"ملاحظة", "type":"text", "body": one teacher move that prevents the mistake, ≤ 22 words }
5  { "id":"stage-tamhid",   "heading": warm-up stage name (Arabic "التمهيد"), "type":"steps", "time": "<minutes> · أنا أفعل", "items":[ { "label":"", "body": the stage's activities condensed ≤ 60 words }, { "label":"تحقق" (or "Check"), "body": one observable pupil criterion ≤ 20 words, singular pupil, NO pupil-count numbers } ] }
6  { "id":"stage-arad",     same shape, presentation/explanation stage (Arabic "العرض"), "time":"<minutes> · أنا أفعل ← نحن نفعل" }
7  { "id":"stage-tatbiq",   same shape, practice stage (Arabic "التطبيق"), "time":"<minutes> · نحن نفعل ← أنت تفعل" — include the differentiation (weak/strong learner) in the body if the source has it }
8  { "id":"stage-taqwim",   same shape, assessment/closing stage (Arabic "التقويم والختام"), "time":"<minutes> · أنت تفعل" — exit ticket essence }
9  { "id":"solutions",      "heading": answers title + page ref, "type":"bullets", "marker":"num", "items": ≤ 3 items, the source's answer key condensed, each ≤ 28 words — answers MUST stay factually exactly as in the source }
10 { "id":"glossary",       "heading": vocabulary title (Arabic "مصطلحات"), "type":"fields", "items": 3-4 of the source's key terms, each value ≤ 10 words }
11 { "id":"multigrade",     "heading": multi-grade title (Arabic "تكييف متعدد الصفوف"), "type":"bullets", "marker":"num", "items": 3 one-line adaptations (lower / this / higher grade), each ≤ 16 words }
12 { "id":"homework",       "heading": homework+teacher-corner title (Arabic "الواجب المنزلي · ركن المعلم"), "type":"note", "body": the homework (numbered, from source) + the re-teach trigger + one reflection question, ≤ 65 words total }

meta: keep the source's locale, subject, grade, region. Set "id" = source id + "-2p".
If locale is "ar" and region "ye": title "دليل الدرس اليومي", subtitle "الجمهورية اليمنية · وزارة التربية والتعليم · التعليم المجتمعي", footer "للتواصل مع المدرّب الرقمي: 160 661 778 967+ · دليل الدرس اليومي". Otherwise: title = the guide word in the lesson's language, keep source subtitle/footer if any. NEVER set meta.banner. Keep up to 3 short chips.

IMAGES — critical:
- Choose up to 4 images FROM THE SOURCE's "images" array that best illustrate the four stages. COPY each chosen entry EXACTLY — id, concept, label and PROMPT BYTE-FOR-BYTE VERBATIM (any change breaks the image cache). Never write new prompts unless the source has NO images at all (then use an empty array).
- Attach them by setting "image": "<id>" on the stage sections (one per stage, best fit). Do NOT emit any "images"-type section.

HARD RULES:
- Everything condensed FROM THE SOURCE ONLY — never invent facts, names, numbers or answers. Solutions and worked answers must remain exactly correct per the source.
- Keep the lesson's language for ALL reader-visible text (headings, labels, bodies). No English scaffolding labels inside a non-English lesson.
- The total body text must fit 2 A4 pages: respect every word budget above; prefer dropping detail over exceeding budgets.
- The four stage minutes should sum to the source's period length when known.`;

async function condenseToGuide(content, { apiKey, fetchImpl = defaultFetch, log = () => {} } = {}) {
  const body = JSON.stringify({
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Full lesson JSON to condense:\n\n${JSON.stringify(content)}` },
    ],
  });
  let json;
  const res = await fetchImpl(CHAT_URL, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body });
  json = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
  const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('condense: model returned no JSON');
  const out = JSON.parse(m[0]);
  if (!Array.isArray(out.sections) || out.sections.length < 8) throw new Error('condense: bad guide shape');
  const ids = new Set(out.sections.map((s) => s && s.id));
  for (const need of ['goal', 'stage-tamhid', 'stage-arad', 'stage-tatbiq', 'stage-taqwim']) {
    if (!ids.has(need)) throw new Error(`condense: missing required section "${need}"`);
  }
  // Normalize shapes the model commonly gets wrong (deterministic — no re-prompting):
  // bullets/steps/qa items as bare strings, fields as strings.
  for (const sec of out.sections) {
    if (!sec || !Array.isArray(sec.items)) continue;
    sec.items = sec.items.map((it) => {
      if (typeof it !== 'string') return it;
      if (sec.type === 'bullets') return { text: it };
      if (sec.type === 'steps') return { label: '', body: it };
      if (sec.type === 'qa') return { q: it };
      if (sec.type === 'fields') return { label: it, value: '' };
      return it;
    }).filter((it) => it && (it.text || it.body || it.q || it.value || it.label));
  }
  // Guard the image cache: only keep images whose prompts exist VERBATIM in the source.
  const srcPrompts = new Set((content.images || []).map((im) => im.prompt));
  out.images = (out.images || []).filter((im) => srcPrompts.has(im.prompt));
  const okIds = new Set(out.images.map((im) => im.id));
  for (const s of out.sections) if (s && s.image && !okIds.has(s.image)) delete s.image;
  // Drop images no stage references — the guide has no gallery, and unreferenced
  // images would otherwise be auto-appended at the bottom (R12).
  const used = new Set(out.sections.map((s) => s && s.image).filter(Boolean));
  out.images = out.images.filter((im) => used.has(im.id));
  if (out.meta) delete out.meta.banner;
  log(`Condensed to the 2-page guide: ${out.sections.length} sections, ${out.images.length} reused image(s).`);
  return out;
}

module.exports = { condenseToGuide };
