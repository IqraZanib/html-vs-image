'use strict';
// Raw lesson (Markdown) → guide JSON, in code, with NO model call.
//
// Why this exists: the render path used to reach the design template by asking a
// language model to "condense" the lesson. That made three things true at once — the
// teacher's words got rewritten, every render cost credits, and a provider outage (or
// an empty balance) stopped the DESIGN work dead with "condense: model returned no
// parseable JSON". None of that is acceptable for a design/rendering layer.
//
// So the mapping is now a function. The lesson's own headings decide which role each
// block belongs to, and every reader-visible string is a SLICE of the source: this
// module never rewrites, never summarises, and never invents a section the lesson does
// not have. If a lesson carries no misconception pair, the guide has no misconception
// card — an empty design slot is honest, an invented one is not.
//
// It maps the 5E shape these lessons use onto the four stage roles the Yemen design
// styles. Explore and Explain both belong to العرض, so they become two labelled items
// inside that one card, each keeping its own source heading as its label — the text is
// preserved and the reader still sees the source's structure.

// role ← heading. First match wins, so order matters.
const ROLE_PATTERNS = [
  ['goal', /الأهداف|معايير النجاح|objectives?|goals?/i],
  ['glossary', /المفردات|glossary|vocabulary/i],
  ['errors', /أخطاء شائعة|خطأ شائع|سوء فهم|misconception|common error/i],
  ['stage-tamhid', /\bengage\b|الإحماء|التشويق|التمهيد|warm[- ]?up/i],
  ['stage-arad', /\bexplore\b|الاستكشاف|\bexplain\b|الشرح|العرض|presentation/i],
  ['stage-tatbiq', /\bpractice\b|التطبيق|guided practice/i],
  ['stage-taqwim', /\bassess\b|التقييم|الختام|closing|wrap[- ]?up/i],
  ['solutions', /answer key|الإجابة|الإجابات|الحل|نموذج الإجابة/i],
  ['multigrade', /متعدد الصفوف|multigrade|تكييف|differentiat/i],
  ['homework', /الواجب|واجب منزلي|homework|ركن المعلم/i],
];

const HEADINGS_AR = {
  'lesson-line': 'درس',
  goal: 'الهدف',
  errors: 'أخطاء شائعة — انتبه لها',
  'stage-tamhid': 'التمهيد',
  'stage-arad': 'العرض',
  'stage-tatbiq': 'التطبيق',
  'stage-taqwim': 'التقويم والختام',
  solutions: 'الإجابات',
  glossary: 'مصطلحات',
  multigrade: 'تكييف متعدد الصفوف',
  homework: 'الواجب المنزلي · ركن المعلم',
};
// The gradual-release pill is design chrome the pack expects on a stage.
const GRR = {
  'stage-tamhid': 'أنا أفعل',
  'stage-arad': 'أنا أفعل ← نحن نفعل',
  'stage-tatbiq': 'نحن نفعل ← أنت تفعل',
  'stage-taqwim': 'أنت تفعل',
};
const ORDER = ['lesson-line', 'goal', 'errors', 'errors-caption', 'stage-tamhid',
  'stage-arad', 'stage-tatbiq', 'stage-taqwim', 'solutions', 'glossary',
  'multigrade', 'homework'];

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (s) => String(s).replace(/\d/g, (d) => AR_DIGITS[+d]);

// Split the document into { level, title, body } blocks.
function blocks(md) {
  const lines = String(md).replace(/\r/g, '').split('\n');
  const out = []; let cur = null;
  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      if (cur) out.push(cur);
      cur = { level: h[1].length, title: h[2].trim(), lines: [] };
    } else if (cur) cur.lines.push(line);
  }
  if (cur) out.push(cur);
  return out.map((b) => ({ ...b, body: b.lines.join('\n').trim() }));
}

function roleOf(title) {
  for (const [role, re] of ROLE_PATTERNS) if (re.test(title)) return role;
  return null;
}

// «— 8-10 دقائق» / «— 15-20 دقيقة» in a stage heading.
function minutesOf(title) {
  const m = title.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:دقائق|دقيقة|min)/i)
    || title.match(/(\d+)\s*(?:دقائق|دقيقة|min)/i);
  if (!m) return '';
  return `${toArabicDigits(m[2] || m[1])} دقيقة`;
}

// Markdown prose → plain reader text, keeping every word. Bold survives as **…**
// because the renderer's richText understands it; fences and table pipes do not
// survive, but their CONTENT does — a chant inside ``` is still the chant.
// Drop markdown table lines from prose. Flattening a table into a sentence produced
// run-on text («الكلمة | عدد الحروف | من هو؟ أَبِي | 3 | الوالد …») that read as a
// rewrite and looked worse than the source. Tables become a VISUAL instead — see
// tableFigure — so the content stays and the page gains a card.
function stripTables(body) {
  return String(body).split('\n').filter((l) => !/^\s*\|/.test(l)).join('\n');
}

function plain(body) {
  return String(stripTables(body))
    .replace(/^```.*$/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*\|/gm, '')
    .replace(/\|\s*$/gm, '')
    .replace(/^[\s|:-]+$/gm, '')
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// A markdown table → [{label, value}], used for the vocabulary/glossary card.
function tableRows(body) {
  const rows = [];
  for (const line of String(body).split('\n')) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim()).filter((c) => c !== '');
    if (!cells.length || cells.every((c) => /^[-:]+$/.test(c))) continue;
    rows.push(cells);
  }
  if (rows.length < 2) return [];
  return rows.slice(1).map((r) => ({ label: r[0], value: r.slice(1).join(' · ') }))
    .filter((x) => x.label && x.value);
}

// Bulleted / numbered lines, kept whole.
function listItems(body) {
  return String(body).split('\n')
    .map((l) => l.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/))
    .filter(Boolean)
    .map((m) => m[1].trim())
    .filter((x) => x.length > 1);
}

// A steps figure built ONLY from words the lesson already uses. The card label is a
// short slice of the item (a chip holds a few words); the item's full text stays in
// the body, so nothing is lost from the page.
function stepsFigure(items) {
  const picked = items.slice(0, 4).map((t) => {
    const clean = t.replace(/\*\*/g, '').replace(/^[^:]{0,40}:\s*/, '');
    const words = clean.split(/\s+/).slice(0, 3).join(' ');
    return { label: words, caption: '' };
  }).filter((x) => x.label);
  return picked.length >= 2 ? { kind: 'steps', items: picked } : null;
}

// A table's rows as step cards: label = first cell, caption = the next. The source's
// own cells, drawn by code, in the design's own component.
function tableFigure(body) {
  const rows = tableRows(body);
  if (rows.length < 2) return null;
  return { kind: 'steps',
    items: rows.slice(0, 6).map((r) => ({ label: r.label, caption: r.value })) };
}

function buildGuideFromMarkdown(md, { region = '', locale = 'ar', subject = '', grade = '' } = {}) {
  const bs = blocks(md);
  if (!bs.length) throw new Error('from-markdown: no markdown headings found in the lesson');

  const h1 = bs.find((b) => b.level === 1) || bs[0];
  const pageRef = (h1.title.match(/\(?\s*(?:صفحة|ص\.?|page)\s*(\d+)\s*\)?/i) || [])[1] || '';
  const gradeText = (h1.title.match(/الصف\s+\S+/) || [])[0] || grade || '';
  const topic = h1.title.replace(/^خطة الدرس:\s*/, '').replace(/\s*—.*$/, '').trim();

  // gather every block per role, in document order, so nothing is dropped
  const byRole = new Map();
  for (const b of bs) {
    const role = roleOf(b.title);
    if (!role) continue;
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role).push(b);
  }

  const sections = [];
  const push = (s) => { if (s) sections.push(s); };

  const lessonLine = [subject, gradeText, topic, pageRef ? `صفحة ${toArabicDigits(pageRef)}` : '']
    .filter(Boolean).join(' · ');
  push({ id: 'lesson-line', heading: HEADINGS_AR['lesson-line'], type: 'text', body: lessonLine });

  const goal = byRole.get('goal');
  if (goal) {
    const body = goal.map((b) => plain(b.body)).filter(Boolean).join(' ');
    if (body) push({ id: 'goal', heading: HEADINGS_AR.goal, type: 'note', body: `**هدف اليوم:** ${body}` });
  }

  // Misconceptions only if the lesson has them. No invention.
  const errs = byRole.get('errors');
  if (errs) {
    const items = listItems(errs.map((b) => b.body).join('\n'));
    if (items.length >= 2) {
      push({ id: 'errors', heading: HEADINGS_AR.errors, type: 'qa',
        items: [{ q: '✗ خطأ', a: items[0] }, { q: '✓ صواب', a: items[1] }] });
    }
  }

  for (const id of ['stage-tamhid', 'stage-arad', 'stage-tatbiq', 'stage-taqwim']) {
    const found = byRole.get(id);
    if (!found) continue;
    // Each source block becomes its own labelled item, keeping the source heading as
    // the label. ALWAYS label it, even when a stage has only one block: the Yemen pack
    // styles a stage's last step item as the amber تحقق strip, so an empty label there
    // renders as a bare ✓ in an empty box.
    const items = found.map((b) => ({
      label: b.title.replace(/\s*—.*$/, '').trim(),
      body: plain(b.body),
    })).filter((x) => x.body);
    if (!items.length) continue;
    const mins = found.map((b) => minutesOf(b.title)).find(Boolean) || '';
    // WHICH SHAPE THE CARD TAKES. The pack's stage card is a three-column grid whose
    // LAST step item is the narrow amber تحقق strip — sized for a one-line criterion.
    // Full-length lesson text in that slot renders as a ~100px column running off the
    // page, and a single item lands in the strip too, so it arrives styled as a
    // checkpoint it is not. So: a stage carrying real prose ships as a full-width text
    // card (same title, colour, time pill and panel — the design is untouched), and the
    // steps shape is kept for the short, genuinely step-like case.
    const total = items.reduce((a, x) => a + x.body.length, 0);
    const asProse = items.length === 1 || total > 400;
    const sec = asProse
      ? { id, heading: HEADINGS_AR[id], type: 'text',
          time: [mins, GRR[id]].filter(Boolean).join(' · '),
          body: items.map((x) => (x.label ? `**${x.label}:** ${x.body}` : x.body)).join('\n\n') }
      : { id, heading: HEADINGS_AR[id], type: 'steps',
          time: [mins, GRR[id]].filter(Boolean).join(' · '), items };
    const raw = found.map((b) => b.body).join('\n');
    const fig = tableFigure(raw) || stepsFigure(listItems(raw));
    if (fig) sec.codeFigure = fig;
    push(sec);
  }

  const sol = byRole.get('solutions');
  if (sol) {
    const items = listItems(sol.map((b) => b.body).join('\n'));
    const body = items.length ? null : plain(sol.map((b) => b.body).join('\n'));
    if (items.length) {
      push({ id: 'solutions', heading: `${HEADINGS_AR.solutions}${pageRef ? ` · صفحة ${toArabicDigits(pageRef)}` : ''}`,
        type: 'bullets', marker: 'num', items: items.map((t) => ({ text: t })) });
    } else if (body) {
      push({ id: 'solutions', heading: HEADINGS_AR.solutions, type: 'text', body });
    }
  }

  const gl = byRole.get('glossary');
  if (gl) {
    const rows = tableRows(gl.map((b) => b.body).join('\n'));
    if (rows.length) push({ id: 'glossary', heading: HEADINGS_AR.glossary, type: 'fields', items: rows });
  }

  const mg = byRole.get('multigrade');
  if (mg) {
    const items = listItems(mg.map((b) => b.body).join('\n'));
    if (items.length) {
      push({ id: 'multigrade', heading: HEADINGS_AR.multigrade, type: 'bullets', marker: 'num',
        items: items.map((t) => ({ text: t })) });
    }
  }

  const hw = byRole.get('homework');
  if (hw) {
    const body = plain(hw.map((b) => b.body).join('\n'));
    if (body) push({ id: 'homework', heading: HEADINGS_AR.homework, type: 'note', body });
  }

  sections.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  const meta = { id: 'lesson-guide', locale, region, subject, grade: gradeText, chips: [] };
  if (locale.startsWith('ar') && region === 'ye') {
    meta.title = 'دليل الدرس اليومي';
    meta.subtitle = 'الجمهورية اليمنية · وزارة التربية والتعليم · التعليم المجتمعي';
    meta.footer = 'للتواصل مع المدرّب الرقمي: 160 661 778 967+ · دليل الدرس اليومي';
  } else {
    meta.title = topic || 'Lesson guide';
  }
  return { meta, images: [], sections };
}

module.exports = { buildGuideFromMarkdown, blocks, roleOf, plain, tableRows, listItems };
