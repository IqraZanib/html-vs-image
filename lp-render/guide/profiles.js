'use strict';
// REGION PROFILES for the raw-text converter.
//
// The converter was written against one curriculum and quietly assumed it everywhere.
// Feeding it a Kenyan CBC lesson failed in five separate ways at once:
//
//   1. it only saw a heading if the line began with a Markdown '#', and a pasted CBC
//      lesson has bare heading lines — so it threw "no markdown headings found";
//   2. with '#' added by hand, none of the eleven CBC headings matched its patterns,
//      which are the Yemen 5E names and their Arabic equivalents — 0 of 11 recognised;
//   3. every card title came from an Arabic table, so a Kenyan English lesson was
//      labelled «درس»;
//   4. the section order it emitted was Yemen's twelve-role contract, so CBC roles like
//      Strand, Key Inquiry Question and Extended Activities had nowhere to go;
//   5. the labels around the content — page, minutes, the answer marker, the ✗/✓ pair —
//      were Arabic string literals in the mapper.
//
// A profile is the whole of what varies: which headings name which role, what each card
// is called, the order the roles appear in, the small labels around the content, and the
// document's own chrome. The converter itself is region-neutral and reads one of these.
//
// Adding a region means adding a profile — not editing the converter.

// ── Yemen: the دليل الدرس اليومي daily guide, 5E stages mapped onto four cards ──────
const YE = {
  id: 'ye',
  name: 'Yemen — دليل الدرس اليومي',
  locale: 'ar',
  roles: [
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
  ],
  // roles that are not their own heading here — they sit as a bold label inside a stage
  lift: [
    ['homework', /الواجب المنزلي|homework|إعادة التعليم|ركن المعلم/i],
    ['multigrade', /scaffolding|المتعثرين|extension|المتقدمين|تكييف/i],
    ['errors-caption', /watch out|تنبيه|احذر/i],
  ],
  titles: {
    'lesson-line': 'درس',
    goal: 'الهدف',
    errors: 'أخطاء شائعة — انتبه لها',
    'errors-caption': 'ملاحظة',
    'stage-tamhid': 'التمهيد',
    'stage-arad': 'العرض',
    'stage-tatbiq': 'التطبيق',
    'stage-taqwim': 'التقويم والختام',
    solutions: 'الإجابات',
    glossary: 'مصطلحات',
    multigrade: 'تكييف متعدد الصفوف',
    homework: 'الواجب المنزلي · ركن المعلم',
  },
  // the gradual-release pill the pack expects on a stage
  grr: {
    'stage-tamhid': 'أنا أفعل',
    'stage-arad': 'أنا أفعل ← نحن نفعل',
    'stage-tatbiq': 'نحن نفعل ← أنت تفعل',
    'stage-taqwim': 'أنت تفعل',
  },
  stages: ['stage-tamhid', 'stage-arad', 'stage-tatbiq', 'stage-taqwim'],
  order: ['lesson-line', 'goal', 'errors', 'errors-caption', 'stage-tamhid', 'stage-arad',
    'stage-tatbiq', 'stage-taqwim', 'solutions', 'glossary', 'multigrade', 'homework'],
  // small labels the mapper writes around the source's own words
  goalLead: 'هدف اليوم:',
  labelWrong: 'خطأ',
  labelCorrect: 'صواب',
  boardWrong: 'خطأ شائع',
  boardCorrect: 'التصحيح',
  checkLabel: 'تحقق',
  solutionLabel: 'الحل',
  teacherSaysLabel: 'يقول المعلم',
  pageLabel: 'صفحة',
  pageWords: ['صفحة', 'ص\\.?', 'page'],
  minutesWords: ['دقائق', 'دقيقة', 'min'],
  minutesLabel: 'دقيقة',
  digits: 'arabic',
  chipWords: 3,
  chipEllipsis: false,
  gradeRe: /الصف\s+\S+/,
  titleStrip: /^خطة الدرس:\s*/,
  checkMarks: /(?=(?:\*{0,2})\s*(?:MODEL ANSWER|الحل الصحيح|الحل:|الإجابة الصحيحة|الإجابة:))/i,
  // the lesson's own «Watch out» wording, for the drawn ✗/✓ board
  warnRe: /watch out|تنبيه|احذر/i,
  fixRe: /(?:التصحيح|الصواب|الصحيح)\s*[:،]?\s*([^.!؟\n]{6,60})/,
  errRe: /(?:بعض الطلاب|قد يخلط|يخلط|الخطأ)\s*[:،]?\s*([^.!؟\n]{6,60})/,
  fixLongRe: /(?:التصحيح|الصواب)\s*[:،]\s*([^.!؟]{6,120})/,
  errLongRe: /((?:بعض الطلاب|كثير من الطلاب)[^.!؟]{6,140})/,
  errLeadRe: /^(?:بعض|كثير من) الطلاب\s*/,
  confusionPairRe: /يخلطون\s+بين\s+("?[^"،.]{1,12}"?)\s*و\s*("?[^"،.]{1,12}"?)/,
  chrome: {
    when: (locale, region) => String(locale).startsWith('ar') && region === 'ye',
    title: 'دليل الدرس اليومي',
    subtitle: 'الجمهورية اليمنية · وزارة التربية والتعليم · التعليم المجتمعي',
    footer: 'للتواصل مع المدرّب الرقمي: 160 661 778 967+ · دليل الدرس اليومي',
  },
};

// ── Kenya: the CBC lesson plan. Its own roles, in its own order, in English ────────
// Heading vocabulary from the CBC lesson-plan form (Strand → Reflection) and from the
// CBC lesson already in this repo (assets/content/lesson-breathing-cbc.en.json), whose
// sections are llo / kiq / resources / introduction / development / conclusion /
// assessment / extended.
const KE = {
  id: 'ke',
  name: 'Kenya — CBC lesson plan',
  locale: 'en',
  roles: [
    ['strand', /^\s*strand\b/i],
    ['sub-strand', /sub[-\s]?strand/i],
    ['outcomes', /learning outcomes?|specific outcomes?|lesson outcomes?/i],
    ['inquiry', /key inquiry|inquiry question/i],
    ['resources', /learning resources?|teaching (?:aids|resources)|materials/i],
    ['introduction', /^\s*introduction\b|lesson introduction/i],
    ['development', /lesson development|development steps?|^\s*steps?\b|procedure/i],
    ['conclusion', /^\s*conclusion\b|lesson conclusion/i],
    ['extended', /extended activit|extension activit/i],
    ['rubric', /assessment rubric|rubric|marking guide|levels? of achievement/i],
    ['assessment', /assessment|assessment questions?/i],
    ['reflection', /^\s*reflection\b|teacher(?:'s)? reflection|self[-\s]?reflection/i],
  ],
  lift: [],
  titles: {
    'lesson-line': 'Lesson',
    strand: 'Strand',
    'sub-strand': 'Sub-Strand',
    outcomes: 'Lesson Learning Outcomes',
    inquiry: 'Key Inquiry Question(s)',
    resources: 'Learning Resources',
    introduction: 'Introduction',
    development: 'Lesson Development',
    conclusion: 'Conclusion',
    extended: 'Extended Activities',
    assessment: 'Assessment',
    rubric: 'Assessment Rubric',
    reflection: 'Reflection',
  },
  grr: {},
  // A CBC plan names its topic in the Sub-Strand row ("Sub-Strand: The Breathing
  // System"); the line above the first heading carries the grade and the learning area.
  topicRole: 'sub-strand',
  // CBC lesson development is one role, not four named stages: the source's own Step 1,
  // Step 2 … become the cards inside it rather than being forced into Engage/Explore.
  stages: ['introduction', 'development', 'conclusion'],
  order: ['lesson-line', 'admin', 'strand', 'sub-strand', 'outcomes', 'inquiry',
    'resources', 'introduction', 'development', 'conclusion', 'assessment', 'rubric',
    'extended', 'reflection'],
  // The CBC form states the learning area and grade in its header row, and the page
  // header already carries the topic — so a separate lesson-line CARD repeated all of it
  // a second time. These become header chips instead.
  lessonLineCard: false,
  headerChips: [['Learning Area', 'subject'], ['Grade', 'grade']],
  // Roles that belong together on ONE card. A CBC plan's identifying rows are a table
  // on the form, not four separate panels — rendering Strand and Sub-Strand as
  // full-width cards of their own spent a third of page 1 on two short phrases.
  merge: [{ id: 'admin', title: 'Lesson details', type: 'fields',
    roles: ['strand', 'sub-strand'] }],
  // how a role with no hand-written treatment should be drawn
  types: {
    strand: 'text',
    'sub-strand': 'text',
    outcomes: 'bullets',
    inquiry: 'note',
    resources: 'chips',
    assessment: 'bullets',
    rubric: 'rubric',
    extended: 'note',
    reflection: 'note',
  },
  goalLead: 'Learning outcomes:',
  labelWrong: 'Common error',
  labelCorrect: 'Correct',
  boardWrong: 'Common error',
  boardCorrect: 'Correction',
  checkLabel: 'Check',
  solutionLabel: 'Answer',
  teacherSaysLabel: 'Teacher says',
  pageLabel: 'page',
  pageWords: ['page', 'pg\\.?'],
  minutesWords: ['minutes', 'minute', 'mins', 'min'],
  minutesLabel: 'min',
  digits: 'latin',
  chipWords: 5,
  chipEllipsis: true,
  // Roles whose card is the SPACE, not the words: a CBC plan's Reflection is ruled lines
  // the teacher writes on after the lesson, so the heading alone earns the card.
  emitEmpty: ['reflection'],
  gradeRe: /\bgrade\s+\d+\b/i,
  titleStrip: /^(?:lesson plan|lesson)\s*[:—–-]\s*/i,
  checkMarks: /(?=(?:\*{0,2})\s*(?:MODEL ANSWER|Model answer|Expected response|Expected answer|Answer:))/,
  warnRe: /watch out|misconception|common error/i,
  fixRe: /(?:correction|correct(?:ion)?)\s*[:—–]?\s*([^.!\n]{6,60})/i,
  errRe: /(?:some (?:pupils|learners|children)|learners often|pupils often)\s*[:—–]?\s*([^.!\n]{6,60})/i,
  chrome: {
    title: '',                       // the lesson's own topic titles the page
    subtitle: 'Republic of Kenya · Competency-Based Curriculum',
    footer: 'Competency-Based Curriculum · lesson plan',
  },
};

// ── Fallback: enough English structure to be useful, no curriculum assumed ─────────
const GENERIC = {
  ...KE,
  id: 'generic',
  name: 'Generic (no region profile)',
  roles: [
    ['outcomes', /objectives?|outcomes?|goals?/i],
    ['resources', /resources?|materials/i],
    ['introduction', /^\s*(?:introduction|warm[- ]?up|starter)\b/i],
    ['development', /development|steps?|procedure|activit/i],
    ['conclusion', /^\s*(?:conclusion|closing|summary)\b/i],
    ['rubric', /rubric|marking guide/i],
    ['assessment', /assessment|evaluation/i],
  ],
  order: ['lesson-line', 'outcomes', 'resources', 'introduction', 'development',
    'conclusion', 'assessment', 'rubric'],
  chrome: { title: '', subtitle: '', footer: '' },
};

const PROFILES = { ye: YE, ke: KE, generic: GENERIC };

function profileFor(region) {
  const key = String(region || '').toLowerCase();
  return PROFILES[key] || GENERIC;
}

// Which profile does this text look like? Counts how many of each profile's role
// patterns appear as a line of their own. Used only when no region was declared: an
// explicit picker choice always wins.
function detectRegion(text) {
  const lines = String(text).split('\n')
    .map((l) => l.replace(/^#+\s*/, '').replace(/^\*{0,2}/, '').trim())
    .filter(Boolean);
  let best = { id: '', score: 0 };
  for (const p of [YE, KE]) {
    let score = 0;
    for (const [, re] of p.roles) if (lines.some((l) => l.length < 80 && re.test(l))) score++;
    if (score > best.score) best = { id: p.id, score };
  }
  return best.score >= 3 ? best.id : '';
}

// Every section id any profile can emit. The Studio uses this to recognise content that
// is ALREADY in guide shape; it used to test for 'stage-tamhid', which meant a Kenyan
// guide was never recognised as one and got sent back through the structurer.
const GUIDE_SECTION_IDS = new Set(Object.values(PROFILES).flatMap((p) => p.order));

module.exports = { profileFor, detectRegion, PROFILES, GUIDE_SECTION_IDS };
