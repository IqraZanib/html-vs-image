'use strict';
// ARABIC HYGIENE — a deterministic correction pass over generated guide text.
//
// Every rule here comes from a specific reviewer finding on a real lesson. They are
// applied in code rather than asked for in a prompt so the same mistake cannot come
// back on the next roll, and every correction is logged so a reviewer can audit what
// was changed. Rules are narrow on purpose: this is a table of known errors, not an
// Arabic grammar engine.

// Present-tense verbs take ي- for a male subject and ت- for a female one. The reviewer
// caught «وإيمان يحبني» for a girl's name; the fix is the morphology, not that phrase.
const FEMALE_NAMES = ['إيمان', 'سبأ', 'هدى', 'سلمى', 'فاطمة', 'زينب', 'مريم', 'أمي', 'أختي', 'الأم', 'البنت', 'التلميذة'];

// Diacritics are the trap: the generated text says «تلُ الآية» and «ذو نُواس», so a
// pattern written against the bare letters never matches. Every rule below is built
// with tolerance for harakat and tatweel between letters — and the verification uses
// the same helper, because a check with the same blind spot as the fix is no check.
const HARAKAT = '[\u064B-\u0652\u0670\u0640]*';
function tolerant(word) {
  // Tolerance must also come AFTER the last letter: «تلُ» carries its damma there, and
  // without the trailing class the pattern stops one character short and never matches.
  return word.split('').map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(HARAKAT) + HARAKAT;
}

const RULES = [
  // ── verb agreement after a female subject ──────────────────────────────────
  ...FEMALE_NAMES.map((name) => ({
    id: 'fem_agreement',
    note: `${name} is female, so the verb takes ت- not ي-`,
    // «إيمان يحبني» → «إيمان تحبني». Only the 3rd-person present prefix.
    find: new RegExp(`(${tolerant(name)}\\s+)ي([\\u0621-\\u064A]{2,})`, 'g'),
    to: (m, pre, rest) => `${pre}ت${rest}`,
  })),

  // ── awkward phrasing the reviewer rewrote ─────────────────────────────────
  { id: 'eye_care', note: 'اذكر عناية → اذكر طريقةً للعناية',
    find: /اذكر\s+عناية\s+بالعين/g, to: () => 'اذكر طريقةً للعناية بالعين' },
  { id: 'eye_care', note: 'يذكر عناية → يذكر طريقةً للعناية',
    find: /يذكر\s+عناية\s+بالعين/g, to: () => 'يذكر طريقةً للعناية بها' },
  { id: 'eye_care', note: 'اذكر عناية بها → اذكر طريقةً للعناية بها',
    find: /(اذكر|يذكر)\s+عناية\s+بها/g, to: (m, v) => `${v} طريقةً للعناية بها` },

  // A short card label has no room for the full phrase, but «اذكر عناية» is still
  // wrong on its own. Handle the bare form too — the longer rules above only fire
  // when «بالعين» or «بها» follows.
  { id: 'eye_care', note: 'bare label: اذكر عناية → اذكر طريقة العناية',
    find: /(^|[\s«"(])(اذكر|يذكر)\s+عناية(?![\s]*(?:بال|بها|ب\s))/g,
    to: (m, pre, v) => `${pre}${v} طريقة العناية` },

  // Bare letter names read as gibberish: «ب ون وي» → «الباء والنون والياء».
  { id: 'letter_names', note: 'spell the letter names out',
    find: /ب\s*ون\s*وي(?![ء-ي])/g, to: () => 'الباء والنون والياء' },
  { id: 'letter_names', note: 'spell the letter names out',
    find: /بين\s+ب\s+و\s*ن\s+و\s*ي(?![ء-ي])/g, to: () => 'بين الباء والنون والياء' },

  { id: 'imperative_tala', note: 'تل → اتلُ (correct imperative), diacritics and all',
    find: new RegExp(`(^|[\\s«"(])${tolerant('تل')}\\s+${tolerant('الآية')}`, 'g'),
    to: (m, pre) => `${pre}اتلُ الآية` },

  { id: 'accusative_dhu', note: 'after a verb the name takes the accusative: ذا نواس',
    // keeps whatever diacritics the name already carries («نُواس» stays «نُواس»)
    find: new RegExp(`(${tolerant('حرّضوا')}|${tolerant('حرضوا')})\\s+${tolerant('ذو')}\\s+(${tolerant('نواس')})`, 'g'),
    to: (m, verb, name) => `${verb} ذا ${name}` },

  { id: 'theft_phrasing', note: 'natural Arabic for the burglary sentence',
    find: /فعل\s+اللصوص\s+بالدكان\s+السرقة[^.،]*/g, to: () => 'سرق اللصوص الدكان وكسروا الباب' },

  { id: 'wudu_naming', note: 'النية وبسم الله → النية والتسمية',
    find: /النية\s+وبسم\s+الل(?:ه|ّٰه|ٰه)/g, to: () => 'النية والتسمية' },
];

// Canonical glossary definitions the reviewer supplied. Applied only to these terms.
const GLOSSARY = {
  'المكعب': 'له أوجه مربعة',
  'المخروط': 'له قاعدة دائرية ورأس مدبب',
  'مكعب': 'له أوجه مربعة',
  'مخروط': 'له قاعدة دائرية ورأس مدبب',
};

function fixString(s, log) {
  if (typeof s !== 'string' || !s) return s;
  let out = s;
  for (const rule of RULES) {
    out = out.replace(rule.find, (...args) => {
      const before = args[0];
      const after = rule.to(...args);
      if (after !== before && log) log({ rule: rule.id, note: rule.note, before, after });
      return after;
    });
  }
  return out;
}

// Walk the guide and correct every human-readable string. Keys, ids and prompts are
// left alone: an image brief is English and a section id is machinery.
const SKIP_KEYS = new Set(['id', 'image', 'imageWrong', 'imageCorrect', 'prompt', 'concept',
  'kind', 'layout', 'shape', 'part', 'object', 'locale', 'region', 'model', 'banner', 'icon', 'type', 'engine']);

function fixGuide(guide, { log = null } = {}) {
  const changes = [];
  const record = (c) => changes.push(c);
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        if (SKIP_KEYS.has(k)) continue;
        const v = node[k];
        if (typeof v === 'string') node[k] = fixString(v, record);
        else node[k] = walk(v);
      }
      return node;
    }
    return node;
  };
  walk(guide);

  // Some findings live across TWO fields, so no single-string rule can see them: the
  // wudu sequence renders «النية» as a stage label with «وبسم الله» as its caption, and
  // the reviewer asked for «النية والتسمية». Fix the pair structurally.
  const fixPairs = (arr) => {
    for (const it of (arr || [])) {
      if (!it || typeof it !== 'object') continue;
      const label = String(it.label || '').trim();
      const cap = String(it.caption || '').trim();
      if (/^النية$/.test(label) && /^و?بسم\s+الل/.test(cap)) {
        record({ rule: 'wudu_naming', note: 'النية + وبسم الله → والتسمية', before: `${label} / ${cap}`, after: `${label} / والتسمية` });
        it.caption = 'والتسمية';
      }
    }
  };
  for (const sec of (guide.sections || [])) {
    const cf = sec && sec.codeFigure;
    if (!cf) continue;
    fixPairs(cf.items);
    fixPairs(cf.stages);
  }

  // Glossary definitions: only the terms the reviewer gave wording for.
  for (const sec of (guide.sections || [])) {
    if (!sec || sec.id !== 'glossary' || !Array.isArray(sec.items)) continue;
    for (const it of sec.items) {
      const term = String((it && it.label) || '').trim();
      const canonical = GLOSSARY[term];
      if (canonical && String(it.value || '').trim() !== canonical) {
        record({ rule: 'glossary_definition', note: `canonical definition for ${term}`, before: it.value, after: canonical });
        it.value = canonical;
      }
    }
  }

  if (log && changes.length) {
    log(`  ✎ Arabic hygiene: ${changes.length} correction(s)`);
    for (const c of changes.slice(0, 8)) log(`     ${c.rule}: «${String(c.before).slice(0, 34)}» → «${String(c.after).slice(0, 34)}»`);
  }
  return { guide, changes };
}

module.exports = { fixGuide, fixString, RULES, FEMALE_NAMES, GLOSSARY, tolerant, HARAKAT };
