'use strict';
// The render path must reach the design template without a model call, and without
// touching the teacher's words. These tests pin both properties, plus the one that is
// easy to lose under pressure: a role the lesson does not provide stays EMPTY rather
// than being filled with something plausible.
const test = require('node:test');
const assert = require('node:assert');
const { buildGuideFromMarkdown, roleOf, tableRows, listItems } = require('./from-markdown');
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

test('Explore and Explain both reach العرض, each under its own heading', () => {
  const two = LESSON.replace('#### Practice', '#### Explain (الشرح) — 10 دقائق\nيشرح المعلم الفرق بين الكلمات.\n\n#### Practice');
  const g = buildGuideFromMarkdown(two, { region: 'ye', locale: 'ar' });
  const arad = g.sections.find((s) => s.id === 'stage-arad');
  const blob = arad.body || (arad.items || []).map((i) => `${i.label || ''} ${i.body || i.text || ''}`).join(' ');
  assert.match(blob, /Explore|الاستكشاف/);
  assert.match(blob, /Explain|الشرح/);
  assert.match(blob, /يشرح المعلم الفرق بين الكلمات/, 'the second block keeps its text');
});

test('a stage becomes one row card per labelled part, not a wall of prose', () => {
  // The first version emitted one prose blob per stage and the LP read as text after
  // text. The lesson labels its own parts, so each label is a card. 'bullets' also
  // avoids the amber تحقق strip, which is sized for a one-line criterion.
  const withParts = LESSON.replace(
    'يبدأ المعلم بالنظر إلى صفحة 32 من الكتاب مباشرة كنشاط تمهيدي.',
    '**نشاط الافتتاح:** يبدأ المعلم بالنظر إلى صفحة 32.\n\n**السؤال الجوهري:** من هم أفراد أسرتك؟');
  const g = buildGuideFromMarkdown(withParts, { region: 'ye', locale: 'ar' });
  const tamhid = g.sections.find((s) => s.id === 'stage-tamhid');
  assert.strictEqual(tamhid.type, 'bullets');
  assert.ok(tamhid.items.length >= 2, 'one card per labelled part');
  assert.match(tamhid.items[0].text, /نشاط الافتتاح/);
  assert.match(tamhid.items[1].text, /السؤال الجوهري/);
  assert.match(tamhid.time, /أنا أفعل/, 'the stage keeps its time and gradual-release pill');
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
  assert.strictEqual(roleOf('#### Engage (الإحماء)'), 'stage-tamhid');
  assert.strictEqual(roleOf('## FOR TEACHER ONLY — ANSWER KEY'), 'solutions');
  assert.strictEqual(roleOf('### جدول المفردات الأساسية'), 'glossary');
  assert.strictEqual(roleOf('### مستويات الأداء (Grade Bands)'), null);
});

test('list items keep their whole text', () => {
  const items = listItems('- يوزع المعلم بطاقات الكلمات على المجموعات\n- يطابق التلميذ كل كلمة بصورتها');
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0], 'يوزع المعلم بطاقات الكلمات على المجموعات');
});

test('a lesson with no headings fails loudly instead of guessing', () => {
  assert.throws(() => buildGuideFromMarkdown('just some prose with no headings at all'),
    /no markdown headings/);
});
