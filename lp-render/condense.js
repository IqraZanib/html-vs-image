'use strict';
// Condense a FULL lesson content JSON into the 2-page "daily guide" template — the
// region design sets' teacher-facing format (12 role sections, see
// decorative/regions/<region>/DESIGN.md). Same provider/key as the structurer.
// It condenses ONLY from the source (never invents facts), keeps the lesson's
// language, applies the EDITORIAL RULES below (how to choose well — distilled from
// the hand-curated reference guides), and reuses the source's image prompts
// VERBATIM so the asset store restores them free.
const { defaultFetch } = require('../imagegen/kie/client');

const CHAT_URL = 'https://api.kie.ai/gpt-5-2/v1/chat/completions';

const SYSTEM = `You condense a FULL lesson-plan JSON into a compact 2-page "daily teacher guide" JSON for the same renderer.

Output ONLY the JSON object — no markdown, no prose, no code fences.

THE TARGET SHAPE — exactly these 12 sections, with these EXACT "id" values, in this order:
1  { "id":"lesson-line",    "heading":"درس" (or "Lesson"), "type":"text", "body": subject · grade · lesson topic (page ref) — ONE line }
2  { "id":"goal",           "heading": goal word, "type":"note", "body": starts with the bolded goal label (Arabic: "**هدف اليوم:** …"; English: "**Today's goal:** …") then the lesson goal in ≤ 35 words }
3  { "id":"errors",         "heading": common-mistakes title (Arabic: "أخطاء شائعة — انتبه لها"), "type":"qa", "items": exactly 2: { "q":"✗ خطأ" (or "✗ Mistake"), "a": the misconception ≤ 30 words } and { "q":"✓ صواب" (or "✓ Correct"), "a": the correction ≤ 30 words } }
4  { "id":"errors-caption", "heading":"ملاحظة", "type":"text", "body": one concrete teacher move that prevents/disproves the mistake, ≤ 22 words }
5  { "id":"stage-tamhid",   "heading": warm-up stage name (Arabic "التمهيد"), "type":"steps", "time": "<minutes> · أنا أفعل", "items":[ { "label":"", "body": the stage's activities condensed ≤ 50 words }, { "label":"تحقق" (or "Check"), "body": one observable pupil criterion ≤ 20 words } ] }
6  { "id":"stage-arad",     same shape, presentation/explanation stage (Arabic "العرض"), "time":"<minutes> · أنا أفعل ← نحن نفعل" }
7  { "id":"stage-tatbiq",   same shape, practice stage (Arabic "التطبيق"), "time":"<minutes> · نحن نفعل ← أنت تفعل" }
8  { "id":"stage-taqwim",   same shape, assessment/closing stage (Arabic "التقويم والختام"), "time":"<minutes> · أنت تفعل" }
9  { "id":"solutions",      "heading": answers title + page ref, "type":"bullets", "marker":"num", "items": ≤ 3 items, each ≤ 28 words }
10 { "id":"glossary",       "heading": vocabulary title (Arabic "مصطلحات"), "type":"fields", "items": 3-4 terms, each value ≤ 10 words }
11 { "id":"multigrade",     "heading": multi-grade title (Arabic "تكييف متعدد الصفوف"), "type":"bullets", "marker":"num", "items": 3 one-line adaptations, each ≤ 16 words }
12 { "id":"homework",       "heading": homework+teacher-corner title (Arabic "الواجب المنزلي · ركن المعلم"), "type":"note", "body": ≤ 55 words }

meta: keep the source's locale, subject, grade, region. Set "id" = source id + "-2p".
If locale is "ar" and region "ye": title "دليل الدرس اليومي", subtitle "الجمهورية اليمنية · وزارة التربية والتعليم · التعليم المجتمعي", footer "للتواصل مع المدرّب الرقمي: 160 661 778 967+ · دليل الدرس اليومي". Otherwise: title = the guide word in the lesson's language, keep source subtitle/footer if any. NEVER set meta.banner. Keep up to 3 short chips.

EDITORIAL RULES — how to choose well (these decide quality; follow them for ANY subject):
- MISCONCEPTION (section 3): when the source lists several watch-outs, pick the one most central to the lesson's CORE skill — the confusion between the two things the lesson exists to distinguish (letter-forms in reading, place value in numbers, congruence vs similarity in shapes). The ✓ صواب side must contain the distinguishing RULE plus a concrete pupil ACTION (trace with a finger, stack the shapes, point to the middle letter) — never just "the correct fact".
- ERRORS-CAPTION (section 4): a physical teacher DEMONSTRATION that disproves the mistake in front of the class (show two different-length straight segments; hold up two same-shape different-size cutouts) — an action, not advice.
- STAGE BODIES: imperative teacher voice. Each stage keeps: its ONE concrete hook BY NAME (the real object, song, string, cards — these anchors are what reviewers praise), the essential question verbatim if short, and one short call-and-response quote when the source has one. Cut administrative narration first, pedagogy last.
- CHANT/SONG: if the source has a chant or song of ≤ 4 short lines, keep the lines VERBATIM inside التمهيد (memory anchors survive condensation).
- تحقق LINES: observable pupil behaviour, action verb, SINGULAR pupil ("يذكر التلميذ…"), never pupil-count numbers, never teacher behaviour.
- SOLUTIONS (section 9): answers stay factually EXACT per the source, grouped one item per exercise; keep the short "not X" discriminations when present ("لا مثلث (٣ أضلاع)") — they carry the teaching point.
- GLOSSARY (section 10): CONCEPT terms (the skill words: المطابقة، التمييز البصري، التطابق، القيمة المنزلية) — NOT the lesson's vocabulary items that pupils learn inside the lesson (not أبي/أمي, not the numbers list). Definitions from the source where given.
- MULTIGRADE (section 11): derive the lower grade from the source's scaffolding, the current grade = the lesson as-is, the higher grade from the source's extension activity. If the source has neither, write the natural simpler/harder variant of the SAME activity.
- HOMEWORK/CORNER (section 12): the source's homework items numbered and near-verbatim, then the re-teach trigger, then exactly ONE reflection question.
- NUMERALS: in Arabic lessons use Eastern Arabic numerals everywhere (٣٢، ٤٥ دقيقة، صفحة ٨٠) — including times, pages and marks.
- STAGE MINUTES: sum to the source's period length when known.

__IMAGES_BLOCK__

HARD RULES:
- Everything condensed FROM THE SOURCE ONLY — never invent facts, names, numbers or answers.
- Keep the lesson's language for ALL reader-visible text. No English scaffolding labels inside a non-English lesson.
- The total body text must fit 2 A4 pages: respect every word budget; prefer dropping detail over exceeding budgets.`;

// Figure policy is part of a REGION'S DESIGN SET, not global editorial policy.
// Regions whose approved design is figure-rich (every card teaches inside the
// image — Yemen pilot grammar) opt in here; every other region keeps the
// conservative contract (reuse the source's figures, author nothing), so a
// region is never restyled by another region's design decisions.
const RICH_FIGURE_REGIONS = new Set(['ye']);

const IMAGES_RICH = `IMAGES — the guide is FIGURE-RICH like the approved pilot. A picture must TEACH, never decorate: the explanation happens INSIDE the image, on a teaching surface (chalkboard, notebook page, flashcards, wall chart) that carries THIS lesson's exact words/letters/numbers/answers.
- EVERY stage section (stage-tamhid, stage-arad, stage-tatbiq, stage-taqwim) carries one figure via "image": "<id>". The "errors" section ALSO carries one: a split twin-board image visualizing the misconception.
- REUSE FIRST: if a SOURCE image already IS a labelled teaching diagram that fits a stage, reference its id and COPY its entry into "images" EXACTLY — id, concept, label, prompt BYTE-FOR-BYTE (any change breaks the image cache).
- Otherwise AUTHOR a new entry (fresh id, kebab-case, never colliding with a source id) in the pilot's grammar:
  * Prompt in English instruction + the lesson's exact Arabic strings quoted. Template: "Flat vector educational illustration, clean textbook style. <the teaching surface and who works at it>. <the lesson's OWN content worked out on that surface — the actual example, decomposition, matching, ordering or answer>. Labelled in Arabic exactly as follows: «…», «…», «…». No other text, no decoration."
  * LABEL RULES (image models garble long/vocalized Arabic, and garbled labels FAIL the quality gate — these rules are what make the figure generatable): 2–4 labels total; each label ONE or TWO words; STRIP ALL DIACRITICS/tashkeel from labels (write «أبي», never «أَبِي») even when the lesson text carries them; never a sentence, chant line or instruction as a label; never the same word twice; besides the labels, at most ONE short line of text on the teaching surface.
  * Per stage: stage-tamhid = the named hook object/scene WITH the day's key words written plainly on a board inside it (a chant belongs in the stage BODY, never inside the image); stage-arad = the concept worked on the board with the lesson's real example, kept to ONE worked example; stage-tatbiq = the actual exercise being solved in a pupil's notebook, the real answer visible; stage-taqwim = the exit task being performed.
  * "errors" figure: "One wide chalkboard split in two halves by a vertical line: one half shows <the lesson's real example done WRONG> under a large red ✗; the other half shows <the CORRECT version> under a large green ✓." Keep each half to ONE word/expression — the two things the lesson distinguishes. Same label rules.
  * concept: "diagram" for worked/labelled boards (most figures); "scene" only for a stage-tamhid real-world hook — and even then the key fact appears written inside.
  * label: a short Arabic caption in the lesson's language.
- One figure per section, no repeats. Do NOT emit any "images"-type section.`;

const IMAGES_REUSE = `IMAGES — critical:
- Choose up to 4 images FROM THE SOURCE's "images" array. COPY each chosen entry EXACTLY — id, concept, label and PROMPT BYTE-FOR-BYTE VERBATIM (any change breaks the image cache). Never write new prompts unless the source has NO images at all (then use an empty array).
- Selection taste: التمهيد may take a "scene"; العرض and التطبيق prefer labelled "diagram" concepts (they teach); التقويم takes whatever depicts the exit task. Attach via "image": "<id>" on the stage sections (one per stage, best content fit). Do NOT emit any "images"-type section. Labels stay the source's own.`;

const buildSystem = (richFigures) => SYSTEM.replace('__IMAGES_BLOCK__', richFigures ? IMAGES_RICH : IMAGES_REUSE);

async function callOnce(content, { apiKey, fetchImpl, extra, system }) {
  const body = JSON.stringify({
    temperature: 0.2, // consistency: repeated runs of the same lesson stay close
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `${extra ? extra + '\n\n' : ''}Full lesson JSON to condense:\n\n${JSON.stringify(content)}` },
    ],
  });
  const res = await fetchImpl(CHAT_URL, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body });
  const json = JSON.parse(typeof res.body === 'string' ? res.body : res.body.toString('utf8'));
  const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('condense: model returned no JSON');
  return JSON.parse(m[0]);
}

async function condenseToGuide(content, { apiKey, fetchImpl = defaultFetch, log = () => {}, extra = '' } = {}) {
  const richFigures = RICH_FIGURE_REGIONS.has(String((content.meta && content.meta.region) || '').toLowerCase());
  const system = buildSystem(richFigures);
  if (richFigures) log('Figure policy: rich (region design set) — every card carries a teaching figure.');
  let out;
  try {
    out = await callOnce(content, { apiKey, fetchImpl, extra, system });
  } catch (e) {
    // Models occasionally emit truncated/invalid JSON — one strict retry.
    log(`  (condense output invalid — retrying once: ${e.message})`);
    out = await callOnce(content, { apiKey, fetchImpl, system,
      extra: `${extra ? extra + '\n' : ''}CRITICAL: your previous output was INVALID JSON. Return one complete, valid, parseable JSON object and nothing else.` });
  }
  if (!Array.isArray(out.sections) || out.sections.length < 8) throw new Error('condense: bad guide shape');
  const ids = new Set(out.sections.map((s) => s && s.id));
  for (const need of ['goal', 'stage-tamhid', 'stage-arad', 'stage-tatbiq', 'stage-taqwim']) {
    if (!ids.has(need)) throw new Error(`condense: missing required section "${need}"`);
  }
  // Normalize shapes the model commonly gets wrong (deterministic — no re-prompting).
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
  // Images are handled DETERMINISTICALLY: the model attaches ids (section.image)
  // and may AUTHOR pilot-grammar teaching figures, but code owns the outcome.
  // A referenced id that exists in the SOURCE is copied byte-for-byte (asset-store
  // cache always hits); an authored id is kept only if its entry is sane (real
  // prompt + label). One figure per section, no repeats; stages left bare are
  // auto-assigned from remaining source images (scenes suit التمهيد, labelled
  // diagrams suit the teaching stages).
  const srcById = new Map((content.images || []).map((im) => [im.id, im]));
  const outById = new Map((out.images || []).filter((im) => im && im.id).map((im) => [im.id, im]));
  const seenIm = new Set();
  const rebuilt = [];
  for (const s of out.sections) {
    if (!s || !s.image) continue;
    if (seenIm.has(s.image)) { delete s.image; continue; }
    const src = srcById.get(s.image);
    if (src) {
      seenIm.add(s.image);
      rebuilt.push({ id: src.id, concept: src.concept, label: src.label, prompt: src.prompt });
      continue;
    }
    const authored = outById.get(s.image);
    // Authored figures are a rich-figure-region feature; elsewhere they are only
    // legal when the source has no images at all (the pre-existing contract).
    if ((richFigures || !srcById.size)
        && authored && typeof authored.prompt === 'string' && authored.prompt.trim().length >= 40 && authored.label) {
      seenIm.add(s.image);
      rebuilt.push({ id: String(authored.id), concept: authored.concept === 'scene' ? 'scene' : 'diagram',
        label: String(authored.label), prompt: authored.prompt });
      continue;
    }
    delete s.image;
  }
  const remaining = (content.images || []).filter((im) => !seenIm.has(im.id));
  const pick = (pred) => { const i = remaining.findIndex(pred); return i < 0 ? null : remaining.splice(i, 1)[0]; };
  for (const id of ['stage-tamhid', 'stage-arad', 'stage-tatbiq', 'stage-taqwim']) {
    const sec = out.sections.find((x) => x && x.id === id);
    if (!sec || sec.image) continue;
    const im = id === 'stage-tamhid'
      ? (pick((x) => x.concept === 'scene') || pick(() => true))
      : (pick((x) => x.concept === 'diagram') || pick(() => true));
    if (!im) break;
    sec.image = im.id;
    rebuilt.push({ id: im.id, concept: im.concept, label: im.label, prompt: im.prompt });
  }
  out.images = rebuilt;
  // Structurer labels sometimes carry English scaffolding in parentheses
  // ("نشاط الاستهلال (Hook)") which would print as the figure caption. Labels are
  // display-only (the cache key is the prompt), so for non-English lessons strip
  // any parenthetical that contains Latin letters; pure-Arabic parentheses stay.
  const guideLocale = String((out.meta && out.meta.locale) || (content.meta && content.meta.locale) || '').toLowerCase();
  if (guideLocale && !guideLocale.startsWith('en')) {
    for (const im of out.images) {
      if (!im || !im.label) continue;
      const cleaned = String(im.label).replace(/\s*\([^)]*[A-Za-z][^)]*\)/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (cleaned) im.label = cleaned;
    }
  }
  if (out.meta) delete out.meta.banner;
  log(`Condensed to the 2-page guide: ${out.sections.length} sections, ${out.images.length} reused image(s).`);
  return out;
}

module.exports = { condenseToGuide };
