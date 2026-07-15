// Template-based lesson-plan generator — builds a RICH, reference-style, self-contained
// lesson-plan HTML from the form inputs WITHOUT any LLM/API key. Layout matches the
// "Pinky day out" reference (navy header, warm-up + CFU, hook with two characters and
// speech bubbles, Big Idea, Goal + Key Words, I-Do steps, Write-on-the-Board Q&A).
// Text uses real bundled fonts (no AI image model, no cost). Topic-specific CONTENT is
// generic scaffolding filled with the topic — smart per-topic content needs the LLM path.

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

const SVG_DEFS = `<svg width="0" height="0" style="position:absolute"><defs>
<symbol id="ic-thumbsup" viewBox="0 0 64 64"><path d="M20 28h6v28h-6z" fill="#fff"/><path d="M28 28l4-14a4 4 0 0 1 8 0l-2 12h14a5 5 0 0 1 5 6l-4 18a6 6 0 0 1-6 5H28z" fill="#fff"/></symbol>
<symbol id="ic-lightbulb" viewBox="0 0 64 64"><circle cx="32" cy="26" r="16" fill="#fff"/><rect x="25" y="40" width="14" height="8" rx="2" fill="#fff"/><rect x="27" y="50" width="10" height="4" rx="2" fill="#fff"/></symbol>
<symbol id="ic-target" viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="4"/><circle cx="32" cy="32" r="13" fill="none" stroke="#fff" stroke-width="4"/><circle cx="32" cy="32" r="5" fill="#fff"/></symbol>
<symbol id="ic-key" viewBox="0 0 64 64"><circle cx="22" cy="32" r="12" fill="none" stroke="#fff" stroke-width="4.5"/><rect x="32" y="29" width="26" height="6" fill="#fff"/><rect x="46" y="35" width="5" height="8" fill="#fff"/><rect x="53" y="35" width="5" height="8" fill="#fff"/></symbol>
<symbol id="char-ali" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#eef2ff"/><path d="M28 78c0-14 10-22 22-22s22 8 22 22" fill="#fff"/><rect x="41" y="58" width="18" height="10" fill="#f4c28e"/><circle cx="50" cy="40" r="17" fill="#f4c28e"/><path d="M33 36a17 17 0 0 1 34 0c0-2-2-14-17-14s-17 12-17 14z" fill="#2b2118"/><path d="M46 64l4 6 4-6" fill="#c0392b"/></symbol>
<symbol id="char-sara" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#f3f0ff"/><path d="M26 82c0-16 24-16 24-16s24 0 24 16" fill="#a06bf0"/><path d="M30 44c0-14 9-22 20-22s20 8 20 22v10c0 3-2 5-4 6-2-6-6-9-16-9s-14 3-16 9c-2-1-4-3-4-6z" fill="#a06bf0"/><circle cx="50" cy="46" r="15" fill="#f4c28e"/><circle cx="44" cy="46" r="1.6" fill="#2b2118"/><circle cx="56" cy="46" r="1.6" fill="#2b2118"/><path d="M45 52q5 4 10 0" stroke="#7a4a26" stroke-width="1.5" fill="none" stroke-linecap="round"/></symbol>
<symbol id="scn-school" viewBox="0 0 120 100"><rect x="10" y="90" width="100" height="4" fill="#c9d6e8"/><rect x="20" y="40" width="80" height="50" fill="#fff" stroke="#1c2541" stroke-width="2"/><path d="M14 42l46-26 46 26z" fill="#2f80ed"/><rect x="52" y="62" width="16" height="28" fill="#7c4dff"/><rect x="30" y="52" width="14" height="14" fill="#eef6ff" stroke="#2f80ed" stroke-width="1.5"/><rect x="76" y="52" width="14" height="14" fill="#eef6ff" stroke="#2f80ed" stroke-width="1.5"/></symbol>
<symbol id="scn-park" viewBox="0 0 140 100"><circle cx="112" cy="20" r="12" fill="#f5a623"/><rect x="0" y="82" width="140" height="18" fill="#bbe7c6"/><rect x="26" y="60" width="6" height="24" fill="#8a5a2b"/><circle cx="29" cy="50" r="18" fill="#4caf6e"/><rect x="58" y="46" width="4" height="38" fill="#8a5a2b"/><path d="M62 46l18 22h-18z" fill="#f5a623"/></symbol>
<symbol id="scn-book" viewBox="0 0 120 100"><rect x="20" y="24" width="80" height="56" rx="4" fill="#fff" stroke="#7c4dff" stroke-width="3"/><line x1="60" y1="24" x2="60" y2="80" stroke="#7c4dff" stroke-width="3"/><line x1="30" y1="38" x2="52" y2="38" stroke="#2f80ed" stroke-width="2"/><line x1="30" y1="48" x2="52" y2="48" stroke="#2f80ed" stroke-width="2"/><line x1="68" y1="38" x2="90" y2="38" stroke="#2f80ed" stroke-width="2"/><line x1="68" y1="48" x2="90" y2="48" stroke="#2f80ed" stroke-width="2"/></symbol>
</defs></svg>`;

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
  const idoIcons = ['char-sara', 'scn-school', 'scn-park'];
  const ido = p.iDo(t)
    .map(
      (s, i) =>
        `<div class="ido"><div class="stepnum">${i + 1}</div>` +
        `<div class="iconf"><svg viewBox="0 0 120 100" width="34" height="30"><use href="#${idoIcons[i]}"/></svg></div>` +
        `<div class="content">${s}</div></div>` +
        (i < 2 ? '<div class="arrow">▼</div>' : '')
    )
    .join('');
  const boardIcons = ['scn-school', 'scn-park', 'scn-book'];
  const board = p.board(t)
    .map(
      (b, i) =>
        `<div class="bitem"><div class="bnum">${i + 1}</div>` +
        `<div class="iconf"><svg viewBox="0 0 120 100" width="26" height="22"><use href="#${boardIcons[i]}"/></svg></div>` +
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
  .iconf{border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:0 1mm 2mm rgba(0,0,0,.08)}
  .hook{background:#fff;border:2px solid #f5c451;border-radius:10px;padding:3.5mm 4.5mm}
  .hook-chars{display:flex;justify-content:space-between;gap:4mm;margin-top:2.5mm}
  .char{flex:1;text-align:center}
  .bubble{background:#f4f6fb;border:1.5px solid #dfe4ee;border-radius:14px;padding:3mm;font-size:11.5px;margin-bottom:2mm}
  .char .iconf{width:20mm;height:20mm;margin:0 auto;background:#f4f6fb}
  .char .name{font-size:9px;font-weight:700;color:#4b5563;margin-top:1mm}
  .bigidea{background:#fff;border:2px solid #7c4dff;border-radius:10px;padding:3.5mm 4.5mm;display:flex;gap:3.5mm}
  .bigidea .iconf{width:11mm;height:11mm;background:#7c4dff}
  .bigidea h2{font-size:13px;color:#6a3df0;font-weight:800;margin-bottom:1.5mm}
  .bigidea ul{list-style:none}
  .bigidea li{font-size:11.5px;margin-bottom:1.5mm;padding-${align}:4mm;position:relative;font-family:${fam};direction:${dir};text-align:${align};line-height:2.2}
  .bigidea li::before{content:"•";color:#7c4dff;position:absolute;${align}:0;font-weight:900}
  .goal{flex:1.4;background:#7c4dff;color:#fff;border-radius:10px;padding:3.5mm 4.5mm;display:flex;gap:3mm;align-items:flex-start}
  .keywords{flex:1;background:#f5a623;color:#fff;border-radius:10px;padding:3.5mm 4.5mm;display:flex;gap:3mm;align-items:flex-start}
  .goal .iconf,.keywords .iconf{width:10mm;height:10mm;background:rgba(255,255,255,.25)}
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
${SVG_DEFS}
<div class="page">
  <div class="hdr"><h1>${esc(subject)} — Grade ${esc(grade)}</h1><div class="badge">${esc(language)} · 35 min</div></div>

  <div class="row">
    <div class="card warmup"><span class="bar amber">WARM-UP · 4 min</span><p class="content">${p.warmup(t)}</p></div>
    <div class="cfu"><div class="iconf" style="width:11mm;height:11mm;background:rgba(255,255,255,.25)"><svg viewBox="0 0 64 64" width="22" height="22"><use href="#ic-thumbsup"/></svg></div><div>CFU</div><div class="content">${p.cfu}</div></div>
  </div>

  <div class="hook"><span class="bar cream">HOOK · 4 min</span>
    <div class="hook-chars">
      <div class="char"><div class="bubble content">${p.hookA(t)}</div><div class="iconf"><svg viewBox="0 0 100 100" width="70" height="70"><use href="#char-ali"/></svg></div><div class="name">Ali</div></div>
      <div class="char"><div class="bubble content">${p.hookB(t)}</div><div class="iconf"><svg viewBox="0 0 100 100" width="70" height="70"><use href="#char-sara"/></svg></div><div class="name">Sara</div></div>
    </div>
  </div>

  <div class="bigidea"><div class="iconf"><svg viewBox="0 0 64 64" width="24" height="24"><use href="#ic-lightbulb"/></svg></div>
    <div><h2>The Big Idea</h2><ul>${bigIdea}</ul></div></div>

  <div class="row">
    <div class="goal"><div class="iconf"><svg viewBox="0 0 64 64" width="20" height="20"><use href="#ic-target"/></svg></div>
      <div><h3>Today's Goal</h3><p class="content">${p.goal(t)}</p></div></div>
    <div class="keywords"><div class="iconf"><svg viewBox="0 0 64 64" width="20" height="20"><use href="#ic-key"/></svg></div>
      <div><h3>Key Words</h3><ul>${keywords}</ul></div></div>
  </div>

  <div class="section-label">I Do · How It Works · 6 min</div>
  ${ido}

  <div class="board"><h3>Write on the Board</h3><div class="board-cols">${board}</div>
    <div class="board-star">⭐ ${p.star(t)}</div></div>

  <div class="foot">Code-rendered (HTML/CSS/SVG + Puppeteer) · no AI image model · template mode</div>
</div>
</body></html>`;
}

module.exports = { renderTemplateHtml, fontFor, RTL_LANGS };
