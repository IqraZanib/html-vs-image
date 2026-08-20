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
- NUMERALS: in Arabic lessons use Eastern Arabic numerals everywhere (٣٢، ٤٥ دقيقة، صفحة ٨٠) — including times, pages and marks. NEVER mix Latin digits (1,2,3) into Arabic text: Yemeni teachers flagged mixed numerals in a review as confusing for pupils. This applies ONLY to reader-visible Arabic strings — every JSON NUMBER (parts, shaded, total, len, and any value outside quotes) MUST be written with plain ASCII digits, e.g. "total": 16, never "total": ١٦, or the guide will not parse.
- KINESTHETIC (teacher request from the Yemen A/B review — "the students would love to be kinesthetic in the lessons they learn"): every stage body must contain something the pupils physically DO — touch, hold, point, stand, raise a hand, fold, cut, count on fingers, act out, walk to the board. Name the real object from the source (the string, the apple, the cards). If the source's stage is passive, convert it into the nearest physical version of the SAME activity rather than inventing new content.
- ANSWERS ARE NEVER OMITTED: the solutions section must always carry the lesson's actual answers (a review found missing answer keys to be a hard failure). Never leave it empty or generic.
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

// FIGURE MODE (owner decision 2026-08-19 — reverted to 'labeled'):
//   'labeled' — the image model writes the figure's Arabic labels itself, as the
//               design set was originally built. Richer-looking figures; the model
//               can misspell a label or miscount a diagram, so answer-bearing
//               figures need a human eye.
//   'hybrid'  — the model draws wordless artwork and the renderer draws every label,
//               mark and exact diagram (accurate by construction).
// Switch with FIGURE_MODE below, or per run with LP_FIGURE_MODE=hybrid|labeled.
const FIGURE_MODE = process.env.LP_FIGURE_MODE || 'labeled';

const IMAGES_RICH_LABELED = `IMAGES — the guide is FIGURE-RICH like the approved pilot. A picture must TEACH, never decorate: the explanation happens INSIDE the image, on a teaching surface (chalkboard, notebook page, flashcards, wall chart) that carries THIS lesson's exact words/letters/numbers/answers.
- EVERY stage section (stage-tamhid, stage-arad, stage-tatbiq, stage-taqwim) carries one figure via "image": "<id>". The "homework" section takes a SMALL figure when its task is physical (cutting, folding, counting objects): a simple labelled diagram of that one task.
- THE ERRORS FIGURE IS TWO SEPARATE IMAGES (the renderer composes the ✗/✓ board itself — never draw marks, never draw a split board): attach "imageWrong": "<id>" (a board showing ONLY the mistaken version) and "imageCorrect": "<id>" (a board showing ONLY the correct version) on the errors section. Each is a SINGLE-CONCEPT brief: one board, one item, its labels. Do NOT mention the other version, do NOT use words like wrong/correct/mistake inside the prompt's visual description.
- REUSE FIRST: if a SOURCE image already IS a labelled teaching diagram that fits a stage, reference its id and COPY its entry into "images" EXACTLY — id, concept, label, prompt BYTE-FOR-BYTE (any change breaks the image cache).
- Otherwise AUTHOR a new entry (fresh id, kebab-case, never colliding with a source id) in the pilot's grammar:
  * Prompt in English instruction + the lesson's exact Arabic strings quoted, using this EXACT slot template (the fixed wording is what keeps figures consistent across lessons): "Flat vector educational illustration, clean children's textbook style, soft colours. A dark-green classroom chalkboard with a light wooden frame. <ONE concept from the lesson worked out on the board — state every count in words AND digits, e.g. 'one square divided into exactly four equal parts, exactly two parts filled solid yellow'>. The ONLY text anywhere in the image is: «…», «…». No other text, no other numbers, no decorations." For notebook/exit-card/home roles swap the surface wording ('an open pupil notebook page' / 'a small exit card' / 'a simple home-objects diagram') but keep everything else identical.
  * NEVER put a contrast inside one image: no negations, no 'instead of', no wrong-vs-right — describe only what must appear.
  * LABEL RULES (image models garble long/vocalized Arabic, and garbled labels FAIL the quality gate — these rules are what make the figure generatable): 2–4 labels total; each label ONE or TWO words; STRIP ALL DIACRITICS/tashkeel from labels (write «أبي», never «أَبِي») even when the lesson text carries them; never a sentence, chant line or instruction as a label; never the same word twice; besides the labels, at most ONE short line of text on the teaching surface.
  * Per stage: stage-tamhid = the named hook object/scene WITH the day's key words written plainly on a board inside it (a chant belongs in the stage BODY, never inside the image); stage-arad = the concept worked on the board with the lesson's real example, kept to ONE worked example; stage-tatbiq = the actual exercise being solved in a pupil's notebook, the real answer visible; stage-taqwim = the exit task being performed.
  * "errors" figure: "One wide chalkboard split in two halves by a vertical line: one half shows <the lesson's real example done WRONG> under a large red ✗; the other half shows <the CORRECT version> under a large green ✓." Keep each half to ONE word/expression — the two things the lesson distinguishes. Same label rules.
  * concept: "diagram" for worked/labelled boards (most figures); "scene" only for a stage-tamhid real-world hook — and even then the key fact appears written inside.
  * label: a short Arabic caption in the lesson's language.
- One figure per section, no repeats. Do NOT emit any "images"-type section.`;


const IMAGES_RICH_HYBRID = `IMAGES — HYBRID FIGURES: the image model draws TEXTLESS illustrations; ALL text, numbers, fractions and marks are rendered by code afterwards. A generated image must NEVER contain any text, letters, numbers, fractions or symbols of any kind.

WHAT EACH SECTION CARRIES:
- stage-tamhid, stage-arad, stage-tatbiq, stage-taqwim: each carries EITHER an authored textless image ("image": "<id>") OR a CODE-DRAWN figure ("codeFigure"). *** PREFER codeFigure whenever the teaching point is a direction, a comparison, a count, a part-of-a-whole, a fraction, or a key expression — the renderer draws those exactly and legibly. Use a generated image only for real-world scenes, people and objects (supporting artwork). ***
  BALANCE (the page must feel illustrated, not diagrammatic): use a codeFigure wherever exactness matters, up to THREE stage sections, and never the same kind twice; the other stages carry textless illustrations as supporting artwork. There is no fixed figure count — give a stage a figure when it earns one, and leave prose alone when a figure would only decorate. The errors board does not count towards the three.
  codeFigure kinds — pick the one that fits, all take optional "label" (big caption under the drawing, Eastern numerals) and "caption" (short Arabic line):
  · { "kind":"fraction-grid", "shape":"square"|"circle", "parts":N, "shaded":K } — one whole split into N equal parts with K shaded.
  · { "kind":"count-set", "shape":"circle"|"square"|"triangle", "total":N, "shaded":K } — N separate objects, K highlighted (counting, grouping, "K of N").
  · { "kind":"compass", "north":"شمال", "east":"شرق", "south":"جنوب", "west":"غرب", "center":"<optional short word>" } — four labelled direction arrows.
  · { "kind":"compare", "items":[ { "label":"<short Arabic>", "len":0.0-1.0, "mark":"good"|"bad"|null }, … ] } — two or three labelled bars for length/size/quantity comparisons.
  · { "kind":"expression", "text":"<a short expression or key term, e.g. ٢/٤>" } — drawn as large text, never generated.
- errors: *** STRONGLY PREFER a fully code-drawn board *** — set "codeFigure": { "kind":"error-board", "wrong": <any codeFigure kind above, minus label/caption>, "correct": <same>, "labelWrong":"<short Arabic ≤ 4 words>", "labelCorrect":"<short Arabic ≤ 4 words>" }. The renderer draws the split board, the ✗ and ✓ marks, both mini-visuals and both captions — so the mistake is shown exactly (e.g. wrong = expression "٤/٢", correct = expression "٢/٤"; or wrong = count-set with the wrong number shaded, correct = the right one; or wrong/correct = compare bars). ONLY when the misconception cannot be drawn this way (it is about behaviour, a physical action or a place) fall back to two textless images: "imageWrong"/"imageCorrect" ids plus "labelWrong"/"labelCorrect".
- homework: a SMALL textless image of the physical task when there is one.

AUTHORED IMAGE ENTRIES (in "images"): { "id": kebab-case fresh id, "concept": "scene"|"diagram", "label": "<short Arabic caption for under the figure>", "prompt": <see template>, "overlays": [...] }.
- PROMPT TEMPLATE — English only, EXACTLY this shape: "Flat vector educational illustration, clean children's textbook style, soft colours. <the scene or object composition — concrete pictures only, real objects, people, places>. The image contains ABSOLUTELY NO text, no letters, no numbers, no symbols, no writing of any kind; boards, pages and cards appear clean and blank."
- OVERLAYS carry the figure's labels: up to 3 of { "text": "<exact Arabic ≤ 4 words, undiacritized, OR a fraction like ٢/٤>", "pos": "top-right"|"top-left"|"bottom-right"|"bottom-left"|"top"|"bottom", "kind": "chip"|"fraction" }. Code renders them on the image in that corner/strip; compose the picture so those areas stay uncluttered. Use kind "fraction" for fractions, "chip" for words.
- NEVER put a contrast inside one image; describe only what must appear.
- One figure per section, no repeats. Do NOT emit any "images"-type section.
- NEVER reference or reuse an image id from the source content: source prompts predate this contract and request in-image text. ALWAYS author fresh textless entries with the template above.`;

const IMAGES_REUSE = `IMAGES — critical:
- Choose up to 4 images FROM THE SOURCE's "images" array. COPY each chosen entry EXACTLY — id, concept, label and PROMPT BYTE-FOR-BYTE VERBATIM (any change breaks the image cache). Never write new prompts unless the source has NO images at all (then use an empty array).
- Selection taste: التمهيد may take a "scene"; العرض and التطبيق prefer labelled "diagram" concepts (they teach); التقويم takes whatever depicts the exit task. Attach via "image": "<id>" on the stage sections (one per stage, best content fit). Do NOT emit any "images"-type section. Labels stay the source's own.`;

// Figure-rich design sets EXPLAIN THROUGH THE PICTURES — the text is a terse
// sidebar. Their word budgets override the template's (appended after the
// images block so the shared template stays byte-identical for other regions).
const RICH_BUDGETS = `

VISUAL-FIRST RULE (applies to every section): if a point is carried by the section's figure — a direction, a count, a fraction, a comparison, a marked mistake — do NOT restate it in the prose. Write the teacher's ACTION only, and let the visual carry the concept. Never describe in words what the code-drawn visual already shows. Aim for a light page with generous whitespace; a section whose figure explains the idea needs only ONE short line of text.

FIGURE-RICH TEXT BUDGETS (this design set explains through IMAGES; text is a terse sidebar — these budgets OVERRIDE the ones above):
- goal body ≤ 20 words. errors ✗/✓ sides ≤ 16 words each. errors-caption ≤ 12 words.
- STAGE BODIES ≤ 18 words when the section has a figure (≤ 24 only if it has none): short imperative sentences — the hook BY NAME and the essential move. NO narration, no restating the visual.
- تحقق lines ≤ 10 words. solutions items ≤ 18 words each. glossary values ≤ 7 words. multigrade lines ≤ 12 words. homework ≤ 30 words — numbered tasks only, no explanations (the figure shows the task).`;

// ZERO-COST MODE (LP_NO_IMAGES=1): no image is generated at all — every figure
// must be a code-drawn visual, so an LP costs nothing but the text condensation.
const NO_IMAGES = process.env.LP_NO_IMAGES === '1';
const CODE_ONLY_RULE = `

CODE-ONLY MODE — ABSOLUTE: do NOT author any entry in "images" and do NOT set "image", "imageWrong" or "imageCorrect" on any section. "images" MUST be an empty array. EVERY figure is a "codeFigure" chosen from the kinds above, and the errors section uses { "kind":"error-board", ... }. Give a codeFigure to each stage that genuinely teaches something drawable (a count, a part of a whole, a comparison, a direction, an expression); a stage with nothing drawable simply has no figure and keeps its short text.`;

const buildSystem = (richFigures) => SYSTEM.replace('__IMAGES_BLOCK__',
  richFigures ? (FIGURE_MODE === 'hybrid' ? IMAGES_RICH_HYBRID : IMAGES_RICH_LABELED) + RICH_BUDGETS + (NO_IMAGES ? CODE_ONLY_RULE : '') : IMAGES_REUSE);

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
  // Models sometimes write Eastern Arabic numerals as JSON VALUES (total: ١٦),
  // which is not valid JSON. Convert digits only where a number is expected —
  // after ':' or ',' or '[' and before ',' '}' ']' — never inside strings.
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const repaired = m[0].replace(/([:,\[]\s*)([٠-٩]+(?:\.[٠-٩]+)?)(\s*[,}\]])/g,
    (_, pre, num, post) => pre + num.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))) + post);
  return JSON.parse(repaired);
}

// Validate a code-figure spec: unknown kinds and out-of-range numbers are dropped
// rather than trusted, so a bad model emission can never reach the renderer.
function sanitizeCodeFigure(cf, depth = 0) {
  if (!cf || typeof cf !== 'object') return null;
  const s = (v, n = 40) => String(v == null ? '' : v).slice(0, n);
  const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
  const label = s(cf.label), caption = s(cf.caption, 60);
  switch (cf.kind) {
    case 'fraction-grid': {
      const parts = int(cf.parts, 2, 12); if (parts == null) return null;
      const shaded = int(cf.shaded, 0, parts); if (shaded == null) return null;
      return { kind: 'fraction-grid', shape: cf.shape === 'circle' ? 'circle' : 'square', parts, shaded, label, caption };
    }
    case 'count-set': {
      const total = int(cf.total, 1, 8); if (total == null) return null;
      const shaded = int(cf.shaded, 0, total); if (shaded == null) return null;
      const shape = ['circle', 'square', 'triangle'].includes(cf.shape) ? cf.shape : 'circle';
      return { kind: 'count-set', shape, total, shaded, label, caption };
    }
    case 'compass':
      return { kind: 'compass', north: s(cf.north, 16), east: s(cf.east, 16), south: s(cf.south, 16),
        west: s(cf.west, 16), center: s(cf.center, 20), label, caption };
    case 'compare': {
      const items = (Array.isArray(cf.items) ? cf.items : []).slice(0, 3)
        .map((it) => ({ label: s(it && it.label, 24), len: Math.max(0.15, Math.min(1, Number(it && it.len) || 0.6)),
          mark: ['good', 'bad'].includes(it && it.mark) ? it.mark : null }))
        .filter((it) => it.label);
      return items.length >= 2 ? { kind: 'compare', items, label, caption } : null;
    }
    case 'expression': {
      // 48 chars: enough for a short sequence like «تبخر ← تكاثف ← هطول المطر»
      // (24 was cutting Arabic words in half).
      const text = s(cf.text, 48); return text ? { kind: 'expression', text, label, caption } : null;
    }
    case 'error-board': {
      if (depth) return null; // no nesting of boards
      const wrong = sanitizeCodeFigure(cf.wrong, 1), correct = sanitizeCodeFigure(cf.correct, 1);
      if (!wrong || !correct) return null;
      // Both halves identical means the board shows no contrast at all — it would
      // read as a rendering fault. Reject so the section falls back to images/text.
      if (JSON.stringify(wrong) === JSON.stringify(correct)) return null;
      return { kind: 'error-board', wrong, correct, labelWrong: s(cf.labelWrong, 40), labelCorrect: s(cf.labelCorrect, 40) };
    }
    default: return null;
  }
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
  // Hybrid regions never reuse source prompts (they request in-image text, which the
  // textless contract forbids) — the model authors every figure fresh.
  // Labeled mode reuses the source's own (already labelled) prompts — free cache
  // hits; hybrid mode must author fresh wordless briefs instead.
  const srcById = (richFigures && FIGURE_MODE === 'hybrid') ? new Map() : new Map((content.images || []).map((im) => [im.id, im]));
  const outById = new Map((out.images || []).filter((im) => im && im.id).map((im) => [im.id, im]));
  const POS = new Set(['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top', 'bottom']);
  const cleanOverlays = (o) => Array.isArray(o) ? o.slice(0, 3)
    .filter((v) => v && typeof v.text === 'string' && v.text.length <= 40 && POS.has(v.pos))
    .map((v) => ({ text: v.text, pos: v.pos, kind: v.kind === 'fraction' ? 'fraction' : 'chip' })) : undefined;
  for (const s of out.sections) {
    if (!s) continue;
    if (s.codeFigure) {
      const clean = sanitizeCodeFigure(s.codeFigure);
      if (clean) { s.codeFigure = clean; if (clean.kind !== 'error-board') delete s.image; }
      else delete s.codeFigure;
    }
    if (s.labelWrong) s.labelWrong = String(s.labelWrong).slice(0, 60);
    if (s.labelCorrect) s.labelCorrect = String(s.labelCorrect).slice(0, 60);
  }
  const seenIm = new Set();
  const rebuilt = [];
  const keepRef = (s, field) => {
    const id = s[field];
    if (!id || seenIm.has(id)) { delete s[field]; return; }
    const src = srcById.get(id);
    const authored = outById.get(id);
    const entry = src || ((richFigures || !srcById.size) && authored && typeof authored.prompt === 'string' && authored.prompt.trim().length >= 40 && authored.label
      ? { id: String(authored.id), concept: authored.concept === 'scene' ? 'scene' : 'diagram', label: String(authored.label), prompt: authored.prompt,
          overlays: cleanOverlays(authored.overlays) } : null);
    if (!entry) { delete s[field]; return; }
    seenIm.add(id);
    rebuilt.push(src ? { id: src.id, concept: src.concept, label: src.label, prompt: src.prompt } : entry);
  };
  for (const s of out.sections) {
    if (!s) continue;
    if (s.imageWrong) keepRef(s, 'imageWrong');
    if (s.imageCorrect) keepRef(s, 'imageCorrect');
    if (!s.image) continue;
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
  const remaining = (richFigures && FIGURE_MODE === 'hybrid') ? [] : (content.images || []).filter((im) => !seenIm.has(im.id));
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
  // BALANCE ENFORCEMENT (deterministic): identical code visuals are duplicates —
  // keep the first; and no more than two stage sections may be code-drawn, so the
  // page keeps its supporting illustrations instead of turning into a diagram sheet.
  {
    const sig = (cf) => JSON.stringify([cf.kind, cf.shape, cf.parts, cf.shaded, cf.total, cf.north, cf.east, cf.text, (cf.items || []).map((i) => i.label)]);
    const seen = new Set(); let stageCount = 0;
    for (const s of out.sections) {
      if (!s || !s.codeFigure || s.codeFigure.kind === 'error-board') continue;
      const k = sig(s.codeFigure);
      if (seen.has(k) || stageCount >= 3) { delete s.codeFigure; continue; }
      seen.add(k); stageCount++;
    }
  }
  // LANGUAGE SAFETY: the guide must never disagree with its own text about language.
  // A wrong locale (seen: "en" on an Arabic lesson) flips the whole page to LTR and
  // makes the figure prompts ask for ENGLISH labels — so derive it from the script.
  {
    out.meta = out.meta || {};
    const AR_LOCALES = ['ar', 'ur', 'sd', 'fa', 'ps'];
    const guideText = JSON.stringify(out.sections || []);
    const isArabicScript = /[\u0621-\u064A]/.test(guideText);
    const declared = String((content.meta && content.meta.locale) || out.meta.locale || '').toLowerCase();
    if (isArabicScript && !AR_LOCALES.includes(declared)) {
      if (out.meta.locale !== 'ar') log(`  (locale corrected to "ar": the guide text is Arabic but locale said "${out.meta.locale || declared || 'none'}")`);
      out.meta.locale = 'ar';
    } else if (declared) out.meta.locale = declared;
    for (const k of ['subject', 'grade', 'region']) {
      if (!out.meta[k] && content.meta && content.meta[k]) out.meta[k] = content.meta[k];
    }
  }
  if (NO_IMAGES) {
    // Enforce it in code, not just in the prompt: drop every image reference so
    // nothing can reach the generator.
    for (const s of out.sections || []) { delete s.image; delete s.imageWrong; delete s.imageCorrect; }
    if ((out.images || []).length) log(`  (code-only mode: discarded ${out.images.length} image brief(s) — no generation)`);
    out.images = [];
  }
  if (out.meta) delete out.meta.banner;
  log(`Condensed to the 2-page guide: ${out.sections.length} sections, ${out.images.length} reused image(s).`);
  return out;
}

module.exports = { condenseToGuide };
