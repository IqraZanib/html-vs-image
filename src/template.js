// Template-based lesson-plan generator — builds a clean, self-contained lesson-plan
// HTML from the form inputs WITHOUT any LLM/API key. Text is rendered with real
// bundled fonts (no AI image model, no cost). Layout follows the same design system
// as the reference lesson plans.

const RTL_LANGS = new Set(['Urdu', 'Sindhi', 'Arabic', 'Pashto']);

function fontFor(language) {
  if (language === 'Urdu') return "'Noto Nastaliq Urdu'";
  if (RTL_LANGS.has(language)) return "'Noto Naskh Arabic'";
  return "'Noto Sans'";
}

// Per-language scaffolding phrases. {topic} is substituted. Falls back to English.
const PHRASES = {
  English: {
    warmup: (t) => `Let's begin! Today we will learn about: ${t}. Open your books to today's page.`,
    cfu: 'Thumbs up if you are ready!',
    goal: (t) => `By the end of the lesson, students will understand "${t}" and be able to explain it in their own words.`,
    keywordsLabel: 'Key Words',
    activityLabel: 'Activity',
    steps: (t) => [
      `The teacher introduces the topic "${t}" and shows an example.`,
      `Students observe the example and repeat the key idea.`,
      `Students practise in pairs and share their answers.`,
    ],
    exit: (t) => `What is one thing you learned about "${t}" today?`,
  },
  Urdu: {
    warmup: (t) => `اچھا، آج ہم سیکھیں گے: ${t}۔ اپنی کتاب کا صفحہ کھولیں۔`,
    cfu: 'تیار ہیں تو انگوٹھا اوپر کریں!',
    goal: (t) => `سبق کے آخر میں طلبہ "${t}" کو سمجھ سکیں گے اور اپنے الفاظ میں بیان کر سکیں گے۔`,
    keywordsLabel: 'اہم الفاظ',
    activityLabel: 'سرگرمی',
    steps: (t) => [
      `استاد موضوع "${t}" متعارف کراتے ہیں اور ایک مثال دکھاتے ہیں۔`,
      `طلبہ مثال کو دیکھتے ہیں اور اہم بات دہراتے ہیں۔`,
      `طلبہ جوڑوں میں مشق کرتے ہیں اور جوابات بتاتے ہیں۔`,
    ],
    exit: (t) => `آج آپ نے "${t}" کے بارے میں کیا سیکھا؟`,
  },
  Sindhi: {
    warmup: (t) => `اچو، اڄ اسين سکنداسين: ${t}. پنهنجي ڪتاب جو صفحو کوليو.`,
    cfu: 'تيار آهيو ته آڱوٺو مٿي ڪريو!',
    goal: (t) => `سبق جي آخر ۾ شاگرد "${t}" کي سمجهي سگهندا ۽ پنهنجي لفظن ۾ بيان ڪري سگهندا.`,
    keywordsLabel: 'اهم لفظ',
    activityLabel: 'سرگرمي',
    steps: (t) => [
      `استاد موضوع "${t}" متعارف ڪرائي ٿو ۽ هڪ مثال ڏيکاري ٿو.`,
      `شاگرد مثال ڏسن ٿا ۽ اهم ڳالهه ورجائن ٿا.`,
      `شاگرد جوڙن ۾ مشق ڪن ٿا ۽ جواب ٻڌائين ٿا.`,
    ],
    exit: (t) => `اڄ توهان "${t}" بابت ڇا سکيو؟`,
  },
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderTemplateHtml(input) {
  const { subject, grade, language, topic } = input;
  const p = PHRASES[language] || PHRASES.English;
  const rtl = RTL_LANGS.has(language);
  const fam = fontFor(language);
  const dir = rtl ? 'rtl' : 'ltr';
  const align = rtl ? 'right' : 'left';
  const t = esc(topic);
  const steps = p.steps(t);

  const stepHtml = steps
    .map(
      (s, i) =>
        `<div class="step"><div class="num">${i + 1}</div><div class="txt content">${s}</div></div>`
    )
    .join('');

  return `<!DOCTYPE html><html lang="${rtl ? 'ur' : 'en'}"><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e8ecf3;font-family:'Noto Sans',sans-serif;color:#1c2541}
  .page{width:210mm;min-height:297mm;margin:6mm auto;background:#fff;padding:10mm 9mm;
        display:flex;flex-direction:column;gap:5mm;box-shadow:0 2mm 6mm rgba(0,0,0,.12)}
  .content{font-family:${fam};direction:${dir};text-align:${align};line-height:2.4}
  .hdr{background:#1c2541;color:#fff;border-radius:12px;padding:5mm 7mm;display:flex;
       align-items:center;justify-content:space-between}
  .hdr h1{font-size:22px;font-weight:800}
  .badge{background:linear-gradient(135deg,#7c4dff,#6a3df0);color:#fff;font-weight:800;
         font-size:12px;padding:3mm 5mm;border-radius:20px;white-space:nowrap}
  .bar{display:inline-block;font-weight:800;font-size:13px;color:#fff;padding:2mm 4mm;border-radius:6px}
  .amber{background:#f5a623}.purple{background:#7c4dff}.blue{background:#2f80ed}.green{background:#22c55e}
  .row{display:flex;gap:5mm}
  .card{border-radius:10px;padding:5mm 6mm}
  .warmup{flex:3;background:#fff8e6;border-right:5px solid #f5a623}
  .cfu{flex:1;background:#22c55e;color:#fff;border-radius:10px;padding:5mm;display:flex;
       flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:2mm;font-weight:700;font-size:12px}
  .goal{flex:2;background:#7c4dff;color:#fff;border-radius:10px;padding:5mm 6mm}
  .keywords{flex:1;background:#f5a623;color:#fff;border-radius:10px;padding:5mm 6mm}
  h2{font-size:15px;margin-bottom:2mm}
  .goal .content,.keywords .content{color:#fff;font-size:15px}
  .keywords ul{list-style:none} .keywords li{margin-bottom:1.5mm}
  .p{font-size:15px;margin-top:2mm}
  .step{display:flex;align-items:center;gap:4mm;background:#f8fafc;border:1.5px solid #e2e8f0;
        border-radius:10px;padding:4mm 5mm}
  .step .num{width:9mm;height:9mm;border-radius:50%;background:#2f80ed;color:#fff;font-weight:800;
             font-size:14px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .step .txt{flex:1;font-size:14.5px}
  .exit{background:#eef6ff;border:1.5px solid #bcd6f7;border-radius:10px;padding:5mm 6mm}
  .exit .q{font-size:16px;font-weight:700;margin-top:2mm}
  .foot{text-align:center;font-size:10px;color:#9aa3b5;margin-top:auto}
</style></head><body>
<div class="page">
  <div class="hdr">
    <h1>${esc(subject)} — Grade ${esc(grade)}</h1>
    <div class="badge">${esc(language)} · 35 min</div>
  </div>

  <div class="row">
    <div class="card warmup"><span class="bar amber">WARM-UP · 4 min</span>
      <p class="p content">${p.warmup(t)}</p></div>
    <div class="cfu"><div style="font-size:22px">👍</div><div>CFU</div><div class="content">${p.cfu}</div></div>
  </div>

  <div class="row">
    <div class="goal"><span class="bar purple">TODAY'S GOAL</span>
      <p class="p content">${p.goal(t)}</p></div>
    <div class="keywords"><span class="bar amber" style="background:#eab308">KEY WORDS</span>
      <p class="p content">${t}</p></div>
  </div>

  <div><span class="bar blue">${'ACTIVITY'} · 15 min</span></div>
  ${stepHtml}

  <div class="exit"><span class="bar green">EXIT TICKET · 4 min</span>
    <div class="q content">${p.exit(t)}</div></div>

  <div class="foot">Code-rendered (HTML/CSS + Puppeteer) · no AI image model · template mode</div>
</div>
</body></html>`;
}

module.exports = { renderTemplateHtml, fontFor, RTL_LANGS };
