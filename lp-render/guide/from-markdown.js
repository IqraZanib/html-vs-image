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

// The lesson already labels its own parts — «**نشاط الافتتاح (Getting Started):**»,
// «**السؤال الجوهري:**», «**BOARD:**», «**Exit Ticket:**» — 45 distinct labels in the
// test lesson. The first version of this mapper flattened all of that into one prose
// blob per stage, which is why the LP read as text after text. Each labelled part is a
// card of its own now: same words, structure the reader can scan.
function labelledParts(body) {
  const src = stripTables(String(body));   // fences kept: figureFor reads them
  const re = /\*\*([^*\n]{2,80}?):\*\*/g;
  const marks = [];
  let m;
  while ((m = re.exec(src))) marks.push({ label: m[1].trim(), at: m.index, end: re.lastIndex });
  if (!marks.length) {
    const t = plain(body);
    return t ? [{ label: '', body: t, raw: String(body) }] : [];
  }
  const parts = [];
  const lead = src.slice(0, marks[0].at);
  if (plain(lead)) parts.push({ label: '', body: plain(lead), raw: lead });
  marks.forEach((mk, i) => {
    const upto = i + 1 < marks.length ? marks[i + 1].at : src.length;
    const raw = src.slice(mk.end, upto);
    const text = plain(raw);
    if (text) parts.push({ label: mk.label, body: text, raw });
  });
  return parts;
}

// The stage's own shape decides its visual: rows of a table, a bulleted list, or an
// arithmetic run. Labels are short slices of the source's own words.
function fencedFigure(body) {
  // A chant or a short block of lines set in ``` — the memorable bit of a warm-up.
  // Its lines become step cards so the page shows it instead of burying it in prose.
  const m = String(body).match(/```([\s\S]*?)```/);
  if (!m) return null;
  const lines = m[1].split('\n').map((l) => l.replace(/\s{2,}.*$/, '').trim())
    .filter((l) => l && l.split(/\s+/).length <= 6);
  if (lines.length < 2) return null;
  return { kind: 'steps', items: lines.slice(0, 6).map((l) => ({ label: l, caption: '' })) };
}

function figureFor(rawBody) {
  // Order matters. A bulleted list is the stage's real activity steps and makes the
  // best cards; a table's rows are next. A fenced block is LAST because it is a chant
  // in a warm-up (good) but letter-by-letter board spelling elsewhere (poor labels) —
  // preferring it produced cards reading «أ | أ | أح م د», which is visual noise.
  const lf = stepsFigure(listItems(rawBody));
  if (lf) return lf;
  const tf = tableFigure(rawBody);
  if (tf) return tf;
  const ff = fencedFigure(rawBody);
  if (ff) return ff;
  const eq = String(rawBody).match(/[٠-٩0-9]+\s*[+\-×÷]\s*[٠-٩0-9]+\s*=\s*[٠-٩0-9]+/);
  if (eq) return { kind: 'expression', text: eq[0] };
  return null;
}

// A table's rows as step cards: label = first cell, caption = the next. The source's
// own cells, drawn by code, in the design's own component.
function tableFigure(body) {
  const rows = tableRows(body);
  if (rows.length < 2) return null;
  return { kind: 'steps',
    items: rows.slice(0, 6).map((r) => ({ label: r.label, caption: r.value })) };
}

// The pilot card is text | figure | تحقق, and that amber sidebar is a signature of the
// approved design. The lesson supplies its own check text: exercises carry
// «MODEL ANSWER», «الحل الصحيح» or «الإجابة». Splitting a part at that marker fills both
// slots with the source's own words — the instruction on one side, the answer the teacher
// checks against on the other — so the anatomy is complete without inventing anything.
// The asterisks are OPTIONAL: the source writes «**MODEL ANSWER**:» in some places and
// a bare «MODEL ANSWER:» in others. Requiring one found nothing.
const CHECK_MARK = /(?=(?:\*{0,2})\s*(?:MODEL ANSWER|الحل الصحيح|الحل:|الإجابة الصحيحة|الإجابة:))/i;
function splitCheck(text) {
  const t = String(text);
  const m = t.search(CHECK_MARK);
  if (m <= 40) return { body: t, check: '' };          // nothing before the marker
  const body = t.slice(0, m).trim();
  const check = t.slice(m).trim();
  // The amber sidebar is a ~90px column sized for ONE line. Measured: a 600-character
  // model answer in there runs the whole page height and cost three extra pages. Short
  // checks go to the sidebar; a long answer becomes its own card instead.
  if (check.length < 12) return { body: t, check: '' };
  if (check.length > 160) return { body, check: '', longCheck: check };
  return { body, check };
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

  // Some template roles are not their own HEADING in these lessons — they live as a
  // bold label inside a stage: «**الواجب المنزلي (Homework):**», «**Scaffolding (للطلاب
  // المتعثرين):**», «**Extension Activity (للطلاب المتقدمين):**», «**Watch out:**».
  // Measured against the approved design, four required cards were missing from the
  // raw-text render; three of them were sitting in the source under these labels, so
  // they are lifted to their proper role instead of being buried mid-stage.
  const LIFT = [
    ['homework', /الواجب المنزلي|homework|إعادة التعليم|ركن المعلم/i],
    ['multigrade', /scaffolding|المتعثرين|extension|المتقدمين|تكييف/i],
    ['errors-caption', /watch out|تنبيه|احذر/i],
  ];
  const lifted = new Map();
  const liftRole = (label) => {
    for (const [role, re] of LIFT) if (re.test(label)) return role;
    return null;
  };

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
    // ONE CARD PER LABELLED PART, not one card per stage. Putting a whole stage's text
    // into a single card and hanging one figure underneath is what made the full LP read
    // as a text document: the pack's card anatomy is text-beside-figure, and it cannot
    // apply to 2,400 characters. The lesson's own parts are 100–650 characters each —
    // the size that anatomy was designed for — so each becomes its own card in the
    // stage's colour, carrying its own title, its own text and its own figure.
    let first = true;
    for (const b of found) {
      const blockHead = b.title.replace(/\s*—.*$/, '').trim();
      for (const part of labelledParts(b.body)) {
        const role = part.label ? liftRole(part.label) : null;
        if (role) {
          if (!lifted.has(role)) lifted.set(role, []);
          lifted.get(role).push({ label: part.label, body: part.body });
          continue;
        }
        // Every card says which stage it belongs to: a teacher on page 3 should not have
        // to scroll back to find out they are still in العرض.
        const title = [HEADINGS_AR[id], part.label || blockHead].filter(Boolean).join(' · ');
        // Fill the pilot's two text slots from the part's own words when it carries a
        // model answer; otherwise a plain text card.
        const sp = splitCheck(part.body);
        const sec = sp.check
          ? { id, heading: title, type: 'steps',
              items: [{ label: '', body: sp.body }, { label: 'تحقق', body: sp.check }] }
          : { id, heading: title, type: 'text', body: sp.longCheck ? sp.body : part.body };
        if (first) {
          const mins = found.map((x) => minutesOf(x.title)).find(Boolean) || '';
          const pill = [mins, GRR[id]].filter(Boolean).join(' · ');
          if (pill) sec.time = pill;
          first = false;
        }
        const fig = figureFor(part.raw || '');
        if (fig) sec.codeFigure = fig;
        push(sec);
        // A long model answer is its own card — same stage colour, titled «… · الحل» —
        // rather than being squeezed into a sidebar built for one line.
        if (sp.longCheck) {
          push({ id, heading: `${title} · الحل`, type: 'text', body: sp.longCheck });
        }
      }
    }
  }

  // the roles lifted out of the stages
  const mgLift = lifted.get('multigrade');
  if (mgLift && mgLift.length && !byRole.get('multigrade')) {
    push({ id: 'multigrade', heading: HEADINGS_AR.multigrade, type: 'bullets', marker: 'num',
      items: mgLift.map((x) => ({ text: `**${x.label}:** ${x.body}` })) });
  }
  const hwLift = lifted.get('homework');
  if (hwLift && hwLift.length && !byRole.get('homework')) {
    push({ id: 'homework', heading: HEADINGS_AR.homework, type: 'note',
      body: hwLift.map((x) => `**${x.label}:** ${x.body}`).join(' ') });
  }
  const ecLift = lifted.get('errors-caption');
  if (ecLift && ecLift.length) {
    push({ id: 'errors-caption', heading: 'ملاحظة', type: 'text',
      body: ecLift.map((x) => `**${x.label}:** ${x.body}`).join(' ') });
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
