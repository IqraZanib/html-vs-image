'use strict';
// The render path must reach the design template without a model call, and without
// touching the teacher's words. These tests pin both properties, plus the one that is
// easy to lose under pressure: a role the lesson does not provide stays EMPTY rather
// than being filled with something plausible.
const test = require('node:test');
const assert = require('node:assert');
const { buildGuideFromMarkdown, roleOf, tableRows, listItems,
  rubricItems } = require('./from-markdown');
const { checkVerbatim } = require('../text/verbatim');

const LESSON = `# خطة الدرس: أسرتي (صفحة 32) — الصف الأول

## الأهداف التعليمية ومعايير النجاح
يتعرف التلميذ على كلمات أفراد الأسرة الخمس ويربط كل كلمة بصورتها الصحيحة.

### جدول المفردات الأساسية
| الكلمة | المعنى |
|--------|--------|
| أَبِي | والد التلميذ |
| أُمِّي | والدة التلميذ |

## خطة الدرس

#### Engage (الإحماء والتشويق) — 8-10 دقائق
يبدأ المعلم بالنظر إلى صفحة 32 من الكتاب مباشرة كنشاط تمهيدي.
\`\`\`
أُسْرَتِي أُسْرَتِي
وَإِيمَان تُحِبُّنِي
\`\`\`

#### Explore (الاستكشاف) — 15-20 دقيقة
- يوزع المعلم بطاقات الكلمات على المجموعات
- يطابق التلميذ كل كلمة بصورتها

#### Practice (التطبيق) — 10-15 دقيقة
يحل التلميذ التدريب الأول مع المعلم ثم يكمل الثاني بنفسه.

#### Assess & Close (التقييم والختام) — 5-10 دقائق
يشير التلميذ إلى الكلمة المطلوبة ويقرأها بصوت مسموع.

## FOR TEACHER ONLY — ANSWER KEY
- السؤال 1: يُقيَّم شفهياً — 3 علامات.
- السؤال 2: MODEL ANSWER: "أَبِي" = 2 علامة.
`;

test('a raw markdown lesson becomes a guide with no model call', () => {
  const g = buildGuideFromMarkdown(LESSON, { region: 'ye', locale: 'ar', subject: 'اللغة العربية' });
  const ids = g.sections.map((s) => s.id);
  assert.deepStrictEqual(ids, ['lesson-line', 'goal', 'stage-tamhid', 'stage-arad',
    'stage-tatbiq', 'stage-taqwim', 'solutions', 'glossary']);
  assert.strictEqual(g.meta.region, 'ye');
  assert.match(g.meta.title, /دليل الدرس اليومي/);
});

test('the lesson text arrives verbatim', () => {
  const g = buildGuideFromMarkdown(LESSON, { region: 'ye', locale: 'ar' });
  const blob = JSON.stringify(g);
  // the chant, inside a fenced block in the source, survives word for word
  assert.match(blob, /أُسْرَتِي أُسْرَتِي/);
  assert.match(blob, /وَإِيمَان تُحِبُّنِي/);
  // and the verbatim checker agrees, which is the same check the Studio logs
  const r = checkVerbatim(g, { text: LESSON }, {});
  assert.strictEqual(r.deviations.length, 0,
    'code mapping must produce zero deviations: ' + JSON.stringify(r.deviations.map((d) => d.missing)));
});

test('a role the lesson does not provide is left out, not invented', () => {
  const g = buildGuideFromMarkdown(LESSON, { region: 'ye', locale: 'ar' });
  const ids = g.sections.map((s) => s.id);
  // this lesson has no misconception pair and no multigrade block
  assert.ok(!ids.includes('errors'), 'a misconception card was invented');
  assert.ok(!ids.includes('multigrade'), 'a multigrade block was invented');
});

test('stage times and gradual-release pills come from the source headings', () => {
  const g = buildGuideFromMarkdown(LESSON, { region: 'ye', locale: 'ar' });
  const tamhid = g.sections.find((s) => s.id === 'stage-tamhid');
  assert.match(tamhid.time, /١٠ دقيقة/, 'minutes parsed from «8-10 دقائق» in Arabic-Indic digits');
  assert.match(tamhid.time, /أنا أفعل/);
});

test('Explore and Explain both reach العرض as their own cards', () => {
  const two = LESSON.replace('#### Practice', '#### Explain (الشرح) — 10 دقائق\nيشرح المعلم الفرق بين الكلمات.\n\n#### Practice');
  const g = buildGuideFromMarkdown(two, { region: 'ye', locale: 'ar' });
  const arad = g.sections.filter((s) => s.id === 'stage-arad');
  assert.ok(arad.length >= 2, 'each source block gets at least one card');
  const blob = arad.map((s) => `${s.heading} ${s.body}`).join(' ');
  assert.match(blob, /Explore|الاستكشاف/);
  assert.match(blob, /Explain|الشرح/);
  assert.match(blob, /يشرح المعلم الفرق بين الكلمات/, 'the second block keeps its text');
});

test('each labelled part becomes its own design-shaped card', () => {
  // One card per stage with all its text made the full LP read as a document. The pack's
  // anatomy is text-beside-figure and only works at the size of a single part, so each
  // part is its own card in the stage's colour, titled and self-identifying.
  const withParts = LESSON.replace(
    'يبدأ المعلم بالنظر إلى صفحة 32 من الكتاب مباشرة كنشاط تمهيدي.',
    '**نشاط الافتتاح:** يبدأ المعلم بالنظر إلى صفحة 32.\n\n**السؤال الجوهري:** من هم أفراد أسرتك؟');
  const g = buildGuideFromMarkdown(withParts, { region: 'ye', locale: 'ar' });
  const cards = g.sections.filter((s) => s.id === 'stage-tamhid');
  assert.ok(cards.length >= 2, 'one card per labelled part');
  assert.ok(cards.every((c) => c.type === 'text'), 'a part card is a text card');
  assert.match(cards[0].heading, /التمهيد/, 'every card names its stage');
  assert.match(cards[0].heading, /نشاط الافتتاح/);
  assert.match(cards[1].heading, /السؤال الجوهري/);
  assert.match(cards[0].time, /أنا أفعل/, 'the first card of a stage carries the time pill');
  assert.ok(!cards[1].time, 'and later cards do not repeat it');
});

test('every stage that can carry a visual gets one', () => {
  // Text after text was the complaint. A stage with a chant, a list, a table or an
  // arithmetic run must render a code figure built from those same words.
  const g = buildGuideFromMarkdown(LESSON, { region: 'ye', locale: 'ar' });
  const tamhid = g.sections.find((s) => s.id === 'stage-tamhid');
  assert.ok(tamhid.codeFigure, 'the fenced chant should become a figure');
  assert.strictEqual(tamhid.codeFigure.kind, 'steps');
  assert.match(JSON.stringify(tamhid.codeFigure), /أُسْرَتِي/, 'built from the chant lines');
  const arad = g.sections.find((s) => s.id === 'stage-arad');
  assert.ok(arad.codeFigure, 'a bulleted stage should become a figure');
});

test('the vocabulary table becomes the glossary', () => {
  const rows = tableRows('| الكلمة | المعنى |\n|---|---|\n| أَبِي | والد التلميذ |');
  assert.deepStrictEqual(rows, [{ label: 'أَبِي', value: 'والد التلميذ' }]);
});

test('headings route to roles, and an unknown heading routes nowhere', () => {
  // roleOf takes the PROFILE that is doing the reading. It used to have Yemen's patterns
  // compiled into it, which is the whole reason a Kenyan heading matched nothing.
  assert.strictEqual(roleOf('#### Engage (الإحماء)', 'ye'), 'stage-tamhid');
  assert.strictEqual(roleOf('## FOR TEACHER ONLY — ANSWER KEY', 'ye'), 'solutions');
  assert.strictEqual(roleOf('### جدول المفردات الأساسية', 'ye'), 'glossary');
  assert.strictEqual(roleOf('### مستويات الأداء (Grade Bands)', 'ye'), null);
  // and the same headings mean nothing to the Kenya profile, which is correct
  assert.strictEqual(roleOf('#### Engage (الإحماء)', 'ke'), null);
});

test('list items keep their whole text', () => {
  const items = listItems('- يوزع المعلم بطاقات الكلمات على المجموعات\n- يطابق التلميذ كل كلمة بصورتها');
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0], 'يوزع المعلم بطاقات الكلمات على المجموعات');
});

test('a lesson with no headings fails loudly instead of guessing', () => {
  assert.throws(() => buildGuideFromMarkdown('just some prose with no headings at all'),
    /no lesson headings found/);
});

// ── Kenya (CBC) ──────────────────────────────────────────────────────────────────────
// Everything below is the regression set for the Kenya failure: a pasted CBC lesson has
// no '#' markers, none of its headings are Yemen's, and its rubric levels are not the
// four English words the renderer used to key its colours to.

const CBC = `Grade 5 · Science and Technology

Strand: Living things and their environment
Sub-Strand: The Breathing System

Lesson Learning Outcomes
By the end of the lesson, the learner should be able to:
a) Identify the main parts of the human breathing system from a chart.
b) Describe the functions of each part of the human breathing system to peers.

Key Inquiry Question(s)
- How does the breathing system help us stay alive?

Learning Resources
Chart, Model of the breathing system; Balloons; Flashcards

Introduction (5 minutes)
Learners are guided to carry out an activity on breathing in and out.

Lesson Development (18 minutes)
Step 1: Learners are guided to study the chart on human breathing system.
Step 2: learners are guided to discuss in groups on how to label the parts.

Conclusion (5 minutes)
Learners are guided to respond to oral questions on how to keep their breathing system healthy.

Assessment Questions (to be captured in the teacher's notes) (5 minutes)
a) Name 4 parts of the human breathing system
b) What is the work of the lungs

Extended Activities
Learners to draw and label the human Breathing System in their exercise books.

Reflection
`;

test('a CBC lesson with BARE headings (no # anywhere) is read, not rejected', () => {
  assert.ok(!/^#/m.test(CBC), 'the fixture must carry no markdown headings');
  const g = buildGuideFromMarkdown(CBC, { region: 'ke' });
  assert.strictEqual(g.sourceProfile.mode, 'bare');
  const ids = g.sections.map((s) => s.id);
  for (const id of ['admin', 'outcomes', 'inquiry', 'resources', 'introduction',
    'development', 'conclusion', 'assessment', 'extended', 'reflection']) {
    assert.ok(ids.includes(id), `CBC role ${id} is missing from the guide`);
  }
  // Strand and Sub-Strand are the two rows of the identifying table, not two cards
  const admin = g.sections.find((s) => s.id === 'admin');
  assert.deepStrictEqual(admin.items.map((x) => x.label), ['Strand', 'Sub-Strand']);
  assert.match(admin.items[0].value, /Living things and their environment/);
});

test('Kenya content is not dressed as Yemen content', () => {
  const g = buildGuideFromMarkdown(CBC, { region: 'ke' });
  const blob = JSON.stringify(g);
  assert.ok(!/[\u0600-\u06FF]/.test(blob), 'no Arabic may appear in a Kenyan guide');
  const ids = g.sections.map((s) => s.id);
  for (const yemenOnly of ['stage-tamhid', 'stage-arad', 'stage-tatbiq', 'stage-taqwim',
    'goal', 'multigrade', 'homework']) {
    assert.ok(!ids.includes(yemenOnly), `Yemen role ${yemenOnly} was forced onto a CBC lesson`);
  }
  assert.strictEqual(g.meta.locale, 'en');
  assert.strictEqual(g.meta.title, 'The Breathing System', 'the Sub-Strand names the lesson');
  assert.strictEqual(g.meta.grade, 'Grade 5');
});

test('the CBC roles keep the source order, and its own steps become its own cards', () => {
  const g = buildGuideFromMarkdown(CBC, { region: 'ke' });
  const ids = g.sections.map((s) => s.id);
  assert.ok(ids.indexOf('outcomes') < ids.indexOf('introduction'));
  assert.ok(ids.indexOf('introduction') < ids.indexOf('development'));
  assert.ok(ids.indexOf('development') < ids.indexOf('conclusion'));
  assert.ok(ids.indexOf('conclusion') < ids.indexOf('assessment'));
  const dev = g.sections.filter((s) => s.id === 'development');
  assert.strictEqual(dev.length, 2, 'Step 1 and Step 2 are two cards');
  assert.match(dev[0].heading, /Step 1/);
  assert.match(dev[0].time, /18 min/);
  assert.ok(!/Introduction · Introduction/.test(JSON.stringify(g.sections)),
    'a card must not repeat the role name it already carries');
});

test('nothing in a CBC lesson is rewritten', () => {
  const g = buildGuideFromMarkdown(CBC, { region: 'ke' });
  const r = checkVerbatim(g, { text: CBC }, {});
  assert.strictEqual(r.deviations.length, 0,
    'deviations: ' + JSON.stringify(r.deviations.map((d) => d.missing)));
  // the lead line above the outcomes list is text too, and used to be dropped
  assert.match(JSON.stringify(g.sections),
    /By the end of the lesson, the learner should be able to/);
});

test('the region can be detected from the text when the picker says nothing', () => {
  assert.strictEqual(buildGuideFromMarkdown(CBC, {}).sourceProfile.id, 'ke');
  assert.strictEqual(buildGuideFromMarkdown(LESSON, {}).sourceProfile.id, 'ye');
  // and a declared region always wins over detection
  assert.strictEqual(buildGuideFromMarkdown(CBC, { region: 'ke' }).sourceProfile.id, 'ke');
});

test('a rubric keeps the source level names and reads levels in order', () => {
  const rows = rubricItems('| Level | Descriptor |\n|---|---|\n'
    + '| Exceeding Expectation | Names all four parts unaided |\n'
    + '| Meeting Expectation | Names three parts |\n'
    + '| Approaching Expectation | Names two parts |\n'
    + '| Below Expectation | Names one part with help |');
  assert.strictEqual(rows.length, 4);
  assert.strictEqual(rows[0].level, 'Exceeding Expectation');
  assert.strictEqual(rows[3].level, 'Below Expectation');
  // and the «Level — descriptor» line form a teacher is likelier to paste
  const lines = rubricItems('Level 4 — Names all four parts unaided\n'
    + 'Level 3 — Names three parts\nLevel 2 — Names two parts');
  assert.deepStrictEqual(lines.map((x) => x.level), ['Level 4', 'Level 3', 'Level 2']);
});
