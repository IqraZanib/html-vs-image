// Template-based lesson-plan generator — builds a RICH, reference-style, self-contained
// lesson-plan HTML from the form inputs WITHOUT any LLM/API key. Illustrations are
// bundled, open-license artwork (OpenMoji, CC BY-SA 4.0) composed by code. Text uses real
// bundled fonts. No AI image model, no per-lesson cost. Topic-specific CONTENT is generic
// scaffolding filled with the topic — smart per-topic content needs the LLM path.

const { illustration } = require('./illustrations');

const RTL_LANGS = new Set(['Urdu', 'Sindhi', 'Arabic', 'Pashto']);

function fontFor(language) {
  if (language === 'Urdu') return "'Noto Nastaliq Urdu'";
  if (RTL_LANGS.has(language)) return "'Noto Naskh Arabic'";
  return "'Noto Sans'";
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Per-language scaffolding. Each field is a function of the escaped topic (t).
const PHRASES = {
  English: {
    warmup: (t) => `Let's begin! Today we will explore <b>${t}</b>. Open your book to today's page.`,
    cfu: 'Thumbs up if you are ready!',
    hookA: (t) => `What do we already know about ${t}?`,
    hookB: (t) => `Let's discover more about ${t} together!`,
    bigIdea: (t) => [
      `${t} has a few important parts we can learn step by step.`,
      `Students often notice only one part of ${t} — let's look at the whole picture.`,
      `Matching each idea to a picture makes ${t} easier to understand.`,
    ],
    goal: (t) => `By the end, students will understand ${t} and explain it in the correct order.`,
    iDo: (t) => [
      `I read aloud and show the first idea about ${t}.`,
      `I read aloud and show the next idea about ${t}.`,
      `I read aloud and show how the parts of ${t} connect.`,
    ],
    board: (t) => [
      { q: `What is ${t}?`, a: `Answer: students describe ${t} in their own words.` },
      { q: `Why is ${t} important?`, a: `Answer: it helps us in daily life.` },
      { q: `Give one example of ${t}.`, a: `Answer: students give an example.` },
    ],
    star: (t) => `Today we learned that the parts of ${t} connect and make sense in order.`,
  },
  Urdu: {
    warmup: (t) => `چلیں شروع کریں! آج ہم <b>${t}</b> کے بارے میں جانیں گے۔ اپنی کتاب کا صفحہ کھولیں۔`,
    cfu: 'تیار ہیں تو انگوٹھا اوپر کریں!',
    hookA: (t) => `ہم ${t} کے بارے میں پہلے سے کیا جانتے ہیں؟`,
    hookB: (t) => `آئیں مل کر ${t} کے بارے میں مزید سیکھیں!`,
    bigIdea: (t) => [
      `${t} کے چند اہم حصے ہیں جو ہم ترتیب سے سیکھ سکتے ہیں۔`,
      `اکثر طلبہ ${t} کا صرف ایک حصہ دیکھتے ہیں — آئیں پوری تصویر دیکھیں۔`,
      `ہر خیال کو تصویر سے جوڑنا ${t} کو سمجھنا آسان بنا دیتا ہے۔`,
    ],
    goal: (t) => `سبق کے آخر میں طلبہ ${t} کو سمجھ سکیں گے اور صحیح ترتیب سے بیان کر سکیں گے۔`,
    iDo: (t) => [
      `میں پڑھ کر دکھاتا ہوں: ${t} کے بارے میں پہلا خیال۔`,
      `میں پڑھ کر دکھاتا ہوں: ${t} کے بارے میں اگلا خیال۔`,
      `میں پڑھ کر دکھاتا ہوں: ${t} کے حصے آپس میں کیسے جڑتے ہیں۔`,
    ],
    board: (t) => [
      { q: `${t} کیا ہے؟`, a: `جواب: طلبہ ${t} کو اپنے الفاظ میں بیان کریں۔` },
      { q: `${t} کیوں اہم ہے؟`, a: `جواب: یہ روزمرہ زندگی میں کام آتا ہے۔` },
      { q: `${t} کی ایک مثال دیں۔`, a: `جواب: طلبہ ایک مثال دیں۔` },
    ],
    star: (t) => `آج ہم نے سیکھا کہ ${t} کے حصے آپس میں جڑے ہوتے ہیں اور ترتیب سے سمجھ آتے ہیں۔`,
  },
  Sindhi: {
    warmup: (t) => `اچو شروع ڪريون! اڄ اسين <b>${t}</b> بابت ڄاڻنداسين. پنهنجي ڪتاب جو صفحو کوليو.`,
    cfu: 'تيار آهيو ته آڱوٺو مٿي ڪريو!',
    hookA: (t) => `اسين ${t} بابت اڳ ۾ ڇا ٿا ڄاڻون؟`,
    hookB: (t) => `اچو گڏجي ${t} بابت وڌيڪ سکون!`,
    bigIdea: (t) => [
      `${t} جا ڪجهه اهم حصا آهن، جيڪي اسين ترتيب سان سکي سگهون ٿا.`,
      `گهڻا شاگرد ${t} جو رڳو هڪ حصو ڏسن ٿا — اچو سموري تصوير ڏسون.`,
      `هر خيال کي تصوير سان ملائڻ ${t} کي سمجهڻ آسان بڻائي ٿو.`,
    ],
    goal: (t) => `سبق جي آخر ۾ شاگرد ${t} کي سمجهي سگهندا ۽ صحيح ترتيب سان بيان ڪري سگهندا.`,
    iDo: (t) => [
      `مان پڙهي ڏيکاريان ٿو: ${t} بابت پهريون خيال.`,
      `مان پڙهي ڏيکاريان ٿو: ${t} بابت ٻيو خيال.`,
      `مان پڙهي ڏيکاريان ٿو: ${t} جا حصا پاڻ ۾ ڪيئن ڳنڍجن ٿا.`,
    ],
    board: (t) => [
      { q: `${t} ڇا آهي؟`, a: `جواب: شاگرد ${t} کي پنهنجن لفظن ۾ بيان ڪن.` },
      { q: `${t} ڇو اهم آهي؟`, a: `جواب: هيءُ روزمره جي زندگيءَ ۾ ڪم اچي ٿو.` },
      { q: `${t} جو هڪ مثال ڏيو.`, a: `جواب: شاگرد هڪ مثال ڏين.` },
    ],
    star: (t) => `اڄ اسان سکيو ته ${t} جا حصا پاڻ ۾ ڳنڍيل هوندا آهن ۽ ترتيب سان سمجهه ۾ اچن ٿا.`,
  },
};

function renderTemplateHtml(input) {
  const { subject, grade, language, topic } = input;
  const p = PHRASES[language] || PHRASES.English;
  const rtl = RTL_LANGS.has(language);
  const fam = fontFor(language);
  const dir = rtl ? 'rtl' : 'ltr';
  const align = rtl ? 'right' : 'left';
  const t = esc(topic);

  const kws = String(topic).split(/\s+/).filter(Boolean).slice(0, 4);
  const keywords = (kws.length ? kws : [String(topic)]).map((w) => `<li>${esc(w)}</li>`).join('');
  const bigIdea = p.bigIdea(t).map((li) => `<li>${li}</li>`).join('');

  const idoIcons = ['girl', 'school', 'tree'];
  const ido = p
    .iDo(t)
    .map(
      (s, i) =>
        `<div class="ido"><div class="stepnum">${i + 1}</div>` +
        `<div class="iconf">${illustration(idoIcons[i], 30)}</div>` +
        `<div class="content">${s}</div></div>` +
        (i < 2 ? '<div class="arrow">▼</div>' : '')
    )
    .join('');

  const boardIcons = ['school', 'tree', 'books'];
  const board = p
    .board(t)
    .map(
      (b, i) =>
        `<div class="bitem"><div class="bnum">${i + 1}</div>` +
        `<div class="iconf">${illustration(boardIcons[i], 26)}</div>` +
        `<div class="bq content">${b.q}</div><div class="ba content">${b.a}</div></div>`
    )
    .join('');

  return `<!DOCTYPE html><html lang="${rtl ? 'ur' : 'en'}"><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e8ecf3;font-family:'Noto Sans',sans-serif;color:#1c2541}
  .page{width:210mm;min-height:297mm;margin:6mm auto;background:#fff;padding:8mm 8mm 10mm;
        display:flex;flex-direction:column;gap:4mm;box-shadow:0 2mm 6mm rgba(0,0,0,.12)}
  .content{font-family:${fam};direction:${dir};text-align:${align};line-height:2.3}
  .hdr{background:#1c2541;color:#fff;border-radius:12px;padding:4mm 6mm;display:flex;align-items:center;justify-content:space-between}
  .hdr h1{font-size:20px;font-weight:800}
  .badge{background:linear-gradient(135deg,#7c4dff,#6a3df0);color:#fff;font-weight:800;font-size:11px;padding:2mm 4mm;border-radius:20px;white-space:nowrap}
  .bar{display:inline-block;font-weight:800;font-size:12px;color:#fff;padding:1.5mm 3.5mm;border-radius:6px}
  .amber{background:#f5a623}.gold{background:#eab308}.purple{background:#7c4dff}.blue{background:#2f80ed}.green{background:#22c55e}.cream{background:#f5c451}
  .row{display:flex;gap:3.5mm}
  .card{border-radius:10px;padding:3.5mm 4.5mm}
  .warmup{flex:3;background:#fff8e6;border-right:4px solid #f5a623}
  .warmup .content{font-size:12px;margin-top:1.5mm}
  .cfu{flex:1;background:#22c55e;color:#fff;border-radius:10px;padding:3mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1.2mm;font-weight:700;font-size:10px}
  .cfu .content{color:#fff}
  .iconf{border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .hook{background:#fff;border:2px solid #f5c451;border-radius:10px;padding:3.5mm 4.5mm}
  .hook-chars{display:flex;justify-content:space-between;gap:4mm;margin-top:2.5mm}
  .char{flex:1;text-align:center}
  .bubble{background:#f4f6fb;border:1.5px solid #dfe4ee;border-radius:14px;padding:3mm;font-size:11.5px;margin-bottom:2mm}
  .char .iconf{width:22mm;height:22mm;margin:0 auto;background:#f4f6fb;border-radius:50%}
  .char .name{font-size:10px;font-weight:700;color:#4b5563;margin-top:1mm}
  .bigidea{background:#fff;border:2px solid #7c4dff;border-radius:10px;padding:3.5mm 4.5mm;display:flex;gap:3.5mm;align-items:flex-start}
  .bigidea .iconf{width:12mm;height:12mm;background:#f3f0ff}
  .bigidea h2{font-size:13px;color:#6a3df0;font-weight:800;margin-bottom:1.5mm}
  .bigidea ul{list-style:none}
  .bigidea li{font-size:11.5px;margin-bottom:1.5mm;padding-${align}:4mm;position:relative;font-family:${fam};direction:${dir};text-align:${align};line-height:2.2}
  .bigidea li::before{content:"•";color:#7c4dff;position:absolute;${align}:0;font-weight:900}
  .goal{flex:1.4;background:#7c4dff;color:#fff;border-radius:10px;padding:3.5mm 4.5mm;display:flex;gap:3mm;align-items:flex-start}
  .keywords{flex:1;background:#f5a623;color:#fff;border-radius:10px;padding:3.5mm 4.5mm;display:flex;gap:3mm;align-items:flex-start}
  .goal .iconf,.keywords .iconf{width:11mm;height:11mm;background:#fff}
  .goal h3,.keywords h3{font-size:11.5px;font-weight:800;margin-bottom:1.5mm}
  .goal .content{font-size:11px;color:#fff}
  .keywords ul{list-style:none;font-size:11px}.keywords li{font-family:${fam};direction:${dir};margin-bottom:1.2mm;color:#fff}
  .section-label{font-size:12.5px;font-weight:800;color:#1c2541}
  .ido{display:flex;align-items:center;gap:3mm;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:2.5mm 4mm}
  .stepnum{width:8mm;height:8mm;border-radius:50%;background:#2f80ed;color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .ido .iconf{width:14mm;height:14mm;background:#eef2ff}
  .ido .content{font-size:11.5px;flex:1}
  .arrow{text-align:center;font-size:12px;color:#2f80ed}
  .board{background:#1c2541;border-radius:10px;padding:4mm 4.5mm;color:#fff}
  .board h3{text-align:center;color:#eab308;font-size:13px;font-weight:800;margin-bottom:3mm}
  .board-cols{display:flex;gap:3mm}
  .bitem{flex:1;background:#fff;color:#1c2541;border-radius:8px;padding:2.5mm;text-align:center;position:relative}
  .bnum{position:absolute;top:-2mm;${align}:-2mm;width:6mm;height:6mm;border-radius:50%;background:#eab308;color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center}
  .bitem .iconf{width:14mm;height:14mm;margin:1mm auto;background:#f8fafc}
  .bq{font-size:11.5px}.ba{font-size:10.5px;margin-top:2mm;color:#6a3df0}
  .board-star{text-align:center;margin-top:3mm;font-size:11px;color:#eab308;font-family:${fam};direction:${dir};line-height:2.1}
  .foot{text-align:center;font-size:9px;color:#9aa3b5;margin-top:auto}
</style></head><body>
<div class="page">
  <div class="hdr"><h1>${esc(subject)} — Grade ${esc(grade)}</h1><div class="badge">${esc(language)} · 35 min</div></div>

  <div class="row">
    <div class="card warmup"><span class="bar amber">WARM-UP · 4 min</span><p class="content">${p.warmup(t)}</p></div>
    <div class="cfu"><div class="iconf" style="width:12mm;height:12mm;background:rgba(255,255,255,.85)">${illustration('thumbsup', 28)}</div><div>CFU</div><div class="content">${p.cfu}</div></div>
  </div>

  <div class="hook"><span class="bar cream">HOOK · 4 min</span>
    <div class="hook-chars">
      <div class="char"><div class="bubble content">${p.hookA(t)}</div><div class="iconf">${illustration('boy', 58)}</div><div class="name">Ali</div></div>
      <div class="char"><div class="bubble content">${p.hookB(t)}</div><div class="iconf">${illustration('girl', 58)}</div><div class="name">Sara</div></div>
    </div>
  </div>

  <div class="bigidea"><div class="iconf">${illustration('lightbulb', 30)}</div>
    <div><h2>The Big Idea</h2><ul>${bigIdea}</ul></div></div>

  <div class="row">
    <div class="goal"><div class="iconf">${illustration('target', 26)}</div>
      <div><h3>Today's Goal</h3><p class="content">${p.goal(t)}</p></div></div>
    <div class="keywords"><div class="iconf">${illustration('key', 26)}</div>
      <div><h3>Key Words</h3><ul>${keywords}</ul></div></div>
  </div>

  <div class="section-label">I Do · How It Works · 6 min</div>
  ${ido}

  <div class="board"><h3>Write on the Board</h3><div class="board-cols">${board}</div>
    <div class="board-star">⭐ ${p.star(t)}</div></div>

  <div class="foot">Code-rendered (HTML/CSS + Puppeteer) · illustrations: OpenMoji (CC BY-SA 4.0) · no AI image model · template mode</div>
</div>
</body></html>`;
}

module.exports = { renderTemplateHtml, fontFor, RTL_LANGS };
