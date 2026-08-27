'use strict';
// Raw lesson text → guide JSON, in code, with NO model call.
//
// Why this exists: the render path used to reach the design template by asking a
// language model to "condense" the lesson. That made three things true at once — the
// teacher's words got rewritten, every render cost credits, and a provider outage (or
// an empty balance) stopped the DESIGN work dead with "condense: model returned no
// parseable JSON". None of that is acceptable for a design/rendering layer.
//
// So the mapping is a function. The lesson's own headings decide which role each block
// belongs to, and every reader-visible string is a SLICE of the source: this module
// never rewrites, never summarises, and never invents a section the lesson does not
// have. If a lesson carries no misconception pair, the guide has no misconception card —
// an empty design slot is honest, an invented one is not.
//
// REGION-NEUTRAL (2026-08-27). The first version had Yemen baked into it: the heading
// patterns were the 5E names and their Arabic equivalents, every card title came from an
// Arabic table, the section order was Yemen's twelve roles, and a block was only a block
// if its line began with '#'. A pasted Kenyan CBC lesson therefore failed outright.
// Everything region-specific now lives in ./profiles.js, and this file reads a profile:
// which headings name which role, what each card is called, what order they come in,
// and the document's own chrome. Adding a region means adding a profile.
const { profileFor, resolveProfile, detectRegion, GUIDE_SECTION_IDS } = require('./profiles');

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (s) => String(s).replace(/\d/g, (d) => AR_DIGITS[+d]);
const num = (profile, s) => (profile.digits === 'arabic' ? toArabicDigits(s) : String(s));

const asProfile = (p) => (typeof p === 'string' || !p ? profileFor(p) : p);

// Truncate to whole words. Used wherever a shortened string becomes reader-visible.
function cutWords(s, max) {
  const t = String(s || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s،,;:—–-]+$/, '');
}

function roleOf(title, profile) {
  const p = asProfile(profile);
  for (const [role, re] of p.roles) if (re.test(title)) return role;
  return null;
}

// ── splitting the document into { level, title, body } blocks ──────────────────────
//
// Two modes, and the mode is CHOSEN BY THE TEXT, not by the region:
//
//   markdown — a line beginning with '#' is a heading. What the Yemen artifacts use.
//   bare     — a short line that NAMES one of the profile's roles is a heading, with or
//              without '#', with or without bold marks, with or without a trailing
//              colon, and with its content allowed to sit after that colon on the same
//              line ("Strand: Living Things"). What a lesson pasted out of a Word
//              document or a Google Doc looks like.
//
// A heading in bare mode must name a role. That is the guard against promoting an
// ordinary sentence: prose does not consist of five-word lines that read "Key Inquiry
// Question(s)". Markdown mode is tried first and kept whenever it already recognises
// the document's structure, so text that does use '#' behaves exactly as before.

// How far into a heading may the role name start? A heading LEADS with its own name, but
// not always at character zero: «Swali/Maswali Muhimu ya Uchunguzi» reaches "Maswali" at
// index 6, and «Lesson Learning Outcomes» reaches "Learning Outcomes" at index 7.
//
// This bound is what separates a heading from a sentence, and 44 was far too loose.
// Measured on a real Kiswahili lesson, a 44-character window turned two ordinary prose
// lines into headings, because Kiswahili role names are ordinary words:
//   «darasa zima linafanya mazoezi ya kuoanisha maamkizi…» → "mazoezi" at 21 → development
//   «Maswali ya mdomo ya kufunga somo:»                    → "kufunga somo" at 20 → conclusion
// The first split a sentence in half mid-activity; the second tore the closing questions
// out of Hitimisho into a card of their own.
const ROLE_START_MAX = 12;
function roleAtStart(title, profile) {
  for (const [role, re] of profile.roles) {
    const m = String(title).match(re);
    if (m && m.index <= ROLE_START_MAX) return role;
  }
  return null;
}

function bareHeading(line, profile) {
  const raw = String(line).trim();
  if (!raw || raw.length > 120) return null;
  const m = raw.match(/^#{0,6}\s*\*{0,2}_{0,2}([^:*_\n]{2,80}?)_{0,2}\*{0,2}\s*:\s*(.*)$/)
    || raw.match(/^#{0,6}\s*\*{0,2}_{0,2}([^:*_\n]{2,80}?)_{0,2}\*{0,2}\s*$/);
  if (!m) return null;
  // The source's own bullet is list punctuation, never part of a heading's name, so it
  // comes off before the role is looked up and before the title is used.
  const title = m[1].replace(/^[•▪●◦*\-–—]\s*/, '').trim();
  if (!title || /[.!?؟]$/.test(title)) return null;   // a sentence, not a heading
  if (title.split(/\s+/).length > 16) return null;    // headings are short
  if (!roleAtStart(title, profile)) return null;       // and they lead with their own name
  return { title, rest: (m[2] || '').trim() };
}

function split(md, profile, bare) {
  const lines = String(md).replace(/\r/g, '').split('\n');
  const out = []; const lead = []; let cur = null;
  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    const b = bare && !h ? bareHeading(line, profile) : null;
    if (h || b) {
      if (cur) out.push(cur);
      cur = h
        ? { level: h[1].length, title: h[2].trim(), lines: [] }
        : { level: 2, title: b.title, lines: b.rest ? [b.rest] : [] };
    } else if (cur) cur.lines.push(line);
    else lead.push(line);
  }
  if (cur) out.push(cur);
  return {
    preamble: lead.join('\n').trim(),
    blocks: out.map((x) => ({ ...x, body: x.lines.join('\n').trim() })),
  };
}

function rolesIn(bs, profile) {
  return new Set(bs.map((b) => roleOf(b.title, profile)).filter(Boolean));
}

function parseDocument(md, profile) {
  const hashed = split(md, profile, false);
  const hashedRoles = rolesIn(hashed.blocks, profile);
  if (hashedRoles.size >= 3) return { ...hashed, mode: 'markdown', roles: hashedRoles };
  const bare = split(md, profile, true);
  const bareRoles = rolesIn(bare.blocks, profile);
  if (bareRoles.size > hashedRoles.size) return { ...bare, mode: 'bare', roles: bareRoles };
  return { ...hashed, mode: 'markdown', roles: hashedRoles };
}

// kept for callers and tests that only want the block list
function blocks(md, profile) {
  return parseDocument(md, asProfile(profile)).blocks;
}

// «— 8-10 دقائق» / «(5 minutes)» / «(Dakika 20)» in a stage heading, in the profile's own
// vocabulary — and in its own word ORDER. Kiswahili puts the unit first, so a heading
// reading «Hatua za Somo (Dakika 20)» matched nothing while the pattern only allowed
// number-then-unit, and the stage lost its time pill. No language in play writes
// "min 20", so trying both orders cannot fire spuriously.
// A DIGIT MAY BE ARABIC-INDIC. «التمهيد (٥ دقائق)» matched nothing while the pattern was
// ASCII-only \d, so every stage of a lesson written with ٥ ١٠ ١٥ lost its time pill — the
// artifact lessons happened to write their minutes in ASCII digits, which is why this went
// unnoticed. Matched in either script and normalised to ASCII before being re-rendered in
// the profile's own numerals.
const D = '[\\d\u0660-\u0669\u06F0-\u06F9]';
const toAscii = (s) => String(s)
  .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));

function minutesOf(title, profile) {
  const unit = (profile.minutesWords || ['min']).join('|');
  const pats = [
    new RegExp(`(${D}+)\\s*[-–]\\s*(${D}+)\\s*(?:${unit})`, 'i'),
    new RegExp(`(${D}+)\\s*(?:${unit})`, 'i'),
    new RegExp(`(?:${unit})\\s*(${D}+)\\s*[-–]\\s*(${D}+)`, 'i'),
    new RegExp(`(?:${unit})\\s*(${D}+)`, 'i'),
  ];
  for (const re of pats) {
    const m = title.match(re);
    if (!m) continue;
    const n = num(profile, toAscii(m[2] || m[1]));
    const label = profile.minutesLabel || 'min';
    return profile.minutesUnitFirst ? `${label} ${n}` : `${n} ${label}`;
  }
  return '';
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
    .replace(/^\s*[-*+•]\s+/gm, '')
    .replace(/^\s*(?:\d+|[a-z])[.)]\s+/gim, '')
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

// Bulleted / numbered lines, kept whole. Markers include the lettered form — «a) …»,
// «b) …» — which is how a CBC plan writes its learning outcomes and its assessment
// questions; without it those lines read as one run-on paragraph.
function listItems(body) {
  // A CONTINUATION LINE BELONGS TO ITS ITEM. These sources routinely write the label on
  // the bullet line and the substance underneath:
  //     • Wanafunzi waliofikia lengo kikamilifu:
  //     nyumbani, waamkue mwanafamilia kwa maamkizi mapya…
  // Taking only the marked lines dropped every second line of Shughuli za Ziada and of
  // Maelezo ya Kurekebisha — silent content loss, on a page whose whole promise is that
  // nothing is cut. A line with no marker now continues the item above it.
  // A BULLET THAT ENDS IN A COLON IS A LABEL, and the lines under it are its content:
  //     • Wanafunzi waliofikia lengo kikamilifu:
  //     nyumbani, waamkue mwanafamilia kwa maamkizi mapya…
  // Taking only the marked lines dropped every second line of Shughuli za Ziada and of
  // Maelezo ya Kurekebisha — silent loss, on a page whose whole promise is that nothing
  // is cut.
  //
  // The colon is what makes this safe. Folding EVERY line under a bullet also swallowed
  // things that are not continuations at all: the Yemen answer key puts a bold
  // sub-heading between two bullets («**القسم الثاني (5 علامات):**»), and three
  // previously byte-stable Yemen sections changed. Absorbing stops at a blank line, at
  // the next marker, and at a bold line.
  const MARK = /^\s*(?:[-*+•▪●◦]|\d+[.)]|[a-z][.)])\s+(.*)$/i;
  const out = [];
  let open = false;
  for (const line of String(body).split('\n')) {
    const t = line.trim();
    const m = line.match(MARK);
    if (m) { out.push(m[1].trim()); open = /:$/.test(m[1].trim()); continue; }
    if (!t || /^\*\*/.test(t)) { open = false; continue; }
    if (open) out[out.length - 1] += ` ${t}`;
  }
  return out.map((x) => x.trim()).filter((x) => x.length > 1);
}

// A run of «LABEL: value» lines → [{label, value}]. This is what the identifying block
// of a CBC plan looks like when pasted — SHULE, ENEO LA KUJIFUNZA, DARASA, TAREHE, MUDA,
// IDADI, Jina la Mwalimu, Nambari ya TSC, Jinsia — and it is also the shape of a labelled
// summary («Muda wote / Muda wa maandalizi:» on one line, its value on the next).
//
// Two source habits both have to work: the value may sit AFTER the colon on the same
// line, or on the following line(s). A line with no colon therefore continues the field
// above it, joined with a separator rather than a space, so «IDADI:» followed by
// «WAVULANA ___», «WASICHANA ___», «JUMLA ___» stays readable as one row of the form.
// Blank values (a row of underscores) are kept exactly as the source wrote them — they
// are the spaces the teacher fills in, not missing data.
function fieldLines(raw, seedLabel) {
  const out = [];
  // The heading that opened this block may itself be the first field's label: «SHULE:
  // ______» is read as a heading («SHULE») whose content is the blank, so without the
  // seed the first row of the form lost its name and rendered as a bare row of
  // underscores.
  if (seedLabel) {
    const first = String(raw).split('\n').map((l) => l.trim()).find(Boolean) || '';
    if (first && !/:/.test(first)) out.push({ label: String(seedLabel).trim(), value: first });
  }
  let skipFirst = out.length === 1;
  for (const line of String(raw).split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (skipFirst) { skipFirst = false; continue; }   // already taken by the seed
    const m = t.match(/^([^:]{1,48}):\s*(.*)$/);
    if (m) out.push({ label: m[1].trim(), value: m[2].trim() });
    else if (out.length) {
      // Join with a SPACE, which is what plain() does everywhere else and what the
      // verbatim checker normalises newlines to. Joining with ' · ' built a string that
      // appears nowhere in the source and the checker rightly flagged it.
      out[out.length - 1].value = [out[out.length - 1].value, t].filter(Boolean).join(' ');
    } else out.push({ label: '', value: t });
  }
  return out.filter((f) => f.label || f.value);
}

// An assessment rubric → [{level, desc}]. A CBC rubric is written either as a table
// (level | description) or as a run of «Level — description» lines. The LEVEL NAMES ARE
// THE SOURCE'S OWN — never mapped onto another region's four names, because the
// renderer now takes the severity ramp from row order rather than from the words.
function rubricItems(body) {
  const rows = tableRows(body);
  if (rows.length >= 2) return rows.map((r) => ({ level: r.label, desc: r.value }));
  // «Kuzidi Matarajio:» on its own line, the descriptor on the next — the commonest
  // pasted form, and the one the reviewer's own Kiswahili lesson uses. Without this the
  // rubric fell through to a plain text card and lost its whole ramp.
  const fl = fieldLines(body).filter((f) => f.label && f.value);
  if (fl.length >= 2) return fl.map((f) => ({ level: f.label, desc: f.value }));
  const items = listItems(body).concat(
    String(body).split('\n').map((l) => l.trim()).filter((l) => l && !/^[-*+\d|]/.test(l)),
  );
  const out = [];
  for (const it of items) {
    const m = it.replace(/\*\*/g, '').match(/^([^:—–]{3,40})\s*[:—–]\s*(.+)$/);
    if (m) out.push({ level: m[1].trim(), desc: m[2].trim() });
  }
  const seen = new Set();
  return out.filter((x) => !seen.has(x.level) && seen.add(x.level));
}

// A steps figure built ONLY from words the lesson already uses. The card label is a
// short slice of the item (a chip holds a few words); the item's full text stays in
// the body, so nothing is lost from the page.
function stepsFigure(items, profile) {
  const budget = profile.chipWords || 3;
  const picked = items.slice(0, 4).map((t) => {
    const clean = t.replace(/\*\*/g, '').replace(/^[^:]{0,40}:\s*/, '');
    const words = clean.split(/\s+/);
    // A chip that stops mid-phrase reads as a defect rather than as a summary, so a
    // profile that allows longer chips also marks the cut. Yemen's word cards are short
    // enough that nothing is ever cut, and its budget is unchanged at three.
    const cut = words.length > budget;
    const label = words.slice(0, budget).join(' ') + (cut && profile.chipEllipsis ? '…' : '');
    return { label, caption: '' };
  }).filter((x) => x.label);
  return picked.length >= 2 ? { kind: 'steps', items: picked } : null;
}

// The lesson already labels its own parts — «**نشاط الافتتاح (Getting Started):**»,
// «**السؤال الجوهري:**», «**BOARD:**», «**Exit Ticket:**» — 45 distinct labels in the
// Yemen test lesson. The first version of this mapper flattened all of that into one
// prose blob per stage, which is why the LP read as text after text. Each labelled part
// is a card of its own now: same words, structure the reader can scan.
//
// A CBC lesson labels its parts too, but with no bold marks: «Step 1: …», «Teacher
// activity: …» at the start of a line. Those are read as labels ONLY when the block
// carries no bold labels at all — i.e. only in the case that would otherwise collapse
// into one giant card — so a source that does use bold marks splits exactly as before.
const BOLD_MARK = /\*\*([^*\n]{2,80}?):\*\*/g;
const BARE_MARK = /^[ \t]*([^\n:.!?؟*|]{2,60}):[ \t]*/gm;
function labelledParts(body, profile = {}) {
  const src = stripTables(String(body));   // fences kept: figureFor reads them
  const collect = (re) => {
    const marks = []; let m;
    re.lastIndex = 0;
    while ((m = re.exec(src))) marks.push({ label: m[1].trim(), at: m.index, end: re.lastIndex });
    return marks;
  };
  let marks = collect(BOLD_MARK);
  if (!marks.length) {
    // A LABEL CANNOT BEGIN INSIDE A QUOTATION. Teacher speech in these lessons runs over
    // several lines and contains colons of its own:
    //     “Fikiria - unapokutana na mwenzako asubuhi, unamsalimu vipi?
    //     Tuseme pamoja: ‘Hujambo?’”
    // Read as labels, «Tuseme pamoja» and «“Sikiliza» tore the teacher's own words into
    // three cards, one of them titled with an opening quote mark. A candidate is rejected
    // if the quotes before it are unbalanced, or if it starts with a quote glyph.
    const openQ = (t) => (t.match(/[“„]/g) || []).length - (t.match(/[”]/g) || []).length;
    const openS = (t) => (t.match(/‘/g) || []).length - (t.match(/’/g) || []).length;
    const bare = collect(BARE_MARK).filter((mk) => {
      if (/^[“”‘’"']/.test(mk.label)) return false;
      // A check-point label belongs in the card's own تحقق sidebar, so the card must not
      // be split at it — splitting turned «نقطة التحقق: ٤ من كل ٥ تلاميذ…» into a card of
      // its own and left the pilot's amber strip empty on every stage.
      if (profile.checkLabelRe && profile.checkLabelRe.test(mk.label)) return false;
      const before = src.slice(0, mk.at);
      return openQ(before) <= 0 && openS(before) <= 0;
    });
    if (bare.length >= 2) marks = bare;
  }
  // …AND THEN the numbered exercises, on top of whatever was collected. Adding these
  // BEFORE the bare-label pass made `marks` non-empty, which skipped that pass entirely —
  // so «دعم» and «تحد» after an exercise were swallowed into the exercise's own text.
  // A NUMBERED EXERCISE OPENS AN ACTIVITY. «١) أصل بين الصورة والكلمة الدالة عليها» has no
  // colon, so the bare-label splitter never saw it and both matching exercises ran together
  // inside one card as prose with one small merged figure. Each numbered line now starts its
  // own part, which is what lets each exercise get its own full-size visual.
  if (profile.exerciseRe) {
    const ex = [];
    const re = new RegExp(profile.exerciseRe.source, profile.exerciseRe.flags);
    let m;
    while ((m = re.exec(src))) {
      if (/^[٠-٩0-9]/.test(m[1].trim())) {
        ex.push({ label: m[1].trim(), at: m.index, end: m.index + m[0].length });
      }
    }
    if (ex.length >= 1) marks = marks.concat(ex).sort((x, y) => x.at - y.at);
  }
  // A bare label often begins with the source's own bullet — «• Mazoezi ya pamoja:»,
  // «▪ Wanafunzi walio chini ya lengo:». The bullet is list punctuation, not part of the
  // card's title, so it comes off the LABEL only; the body keeps every character.
  marks = marks.map((mk) => ({ ...mk, label: mk.label.replace(/^[•▪●◦*\-–—]\s*/, '').trim() }));
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

// ── visuals built from structures the lesson already contains ──────────────────
// The complaint was that examples and activities sit in prose. They do not have to:
// these lessons carry matching pairs, classroom quotes and board work, all of which
// are drawable from the source's own words.

// «[رجل] ← أَبِي» — a matching exercise. Each pair becomes a card: the prompt on the
// card, the answer as its caption. This is the single most common example shape in
// these lessons and it was being rendered as a run of bracketed text.
function pairsFigure(body) {
  const pairs = [...String(body).matchAll(/\[([^\]]{1,16})\]\s*[←→]\s*([^\s،.:]{1,16})/g)]
    .map((m) => ({ label: m[1].trim(), caption: m[2].trim() }));
  const seen = new Set();
  const uniq = pairs.filter((p) => !seen.has(p.label) && seen.add(p.label));
  if (uniq.length >= 2) return { kind: 'steps', items: uniq.slice(0, 6) };
  // The SAME exercise without the brackets — «أبي ← صورة الأب», «سبأ ← سبأ» — which is how
  // a hand-written lesson lists it. Read as a generic bulleted list it produced cards
  // labelled «أبي ← صورة» (the first three words of each line, arrow included); read as
  // pairs, each card carries the prompt and the answer it matches. The lesson's own
  // instruction is «أصل بين الصورة والكلمة الدالة عليها» — matching is the content.
  const bare = [...String(body).matchAll(/^[\s•▪●◦*-]*([^\s←→،.:]{1,18})\s*[←→]\s*([^←→،.:\n]{1,24})$/gm)]
    .map((m) => ({ label: m[1].trim(), caption: m[2].trim() }))
    .filter((x) => x.label && x.caption);
  const seen2 = new Set();
  const uniq2 = bare.filter((p) => !seen2.has(p.label + p.caption) && seen2.add(p.label + p.caption));
  // A MATCHING EXERCISE IS A MATCHING VISUAL, not a row of chips. «أصل بين الصورة والكلمة
  // الدالة عليها» is the central activity of the lesson; drawn as `steps` it was a small
  // embedded widget, which is exactly what the reviewer rejected. `match-pairs` is a
  // full-width two-column activity with a connector between each pair.
  return uniq2.length >= 2 ? { kind: 'match-pairs', items: uniq2.slice(0, 6) } : null;
}

// «Hujambo?-Sijambo, Hamjambo?-Hatujambo, Habari?-Nzuri» — a greeting paired with its
// answer. This IS the content of a Kiswahili greetings lesson: «kuoanisha maamkizi na
// majibu yake sahihi» means matching greetings to their correct responses, and the source
// writes the pairs as question–answer joined by a dash. Rendered as prose it is a run of
// bracketed text; drawn, each pair is a card showing the prompt and the answer to check
// against — which is what the lesson asks the class to practise.
//
// It exists because a real Kiswahili lesson produced ZERO code figures: every detector
// here was written against Arabic and English sources and looked for «[x] ← y», Arabic
// letter builds, «Teacher says:», markdown tables or fenced chants. None of those appear
// in a Kiswahili plan.
function askAnswerPairsFigure(body) {
  const pairs = [...String(body).matchAll(/([\p{L}]{3,20}\s*\?)\s*[-–—]\s*([\p{L}]{2,20})/gu)]
    .map((m) => ({ label: m[1].replace(/\s+/g, ''), caption: m[2].trim() }));
  const seen = new Set();
  const uniq = pairs.filter((x) => !seen.has(x.label) && seen.add(x.label));
  return uniq.length >= 2 ? { kind: 'steps', items: uniq.slice(0, 6) } : null;
}

// A run of questions the teacher asks aloud — «Tunasemaje tunaposalimu mwalimu?
// Tunasemaje tunaposalimu mwenzetu?». Two or more in one part are the card's real
// content, so they become chips a teacher can glance at rather than a paragraph.
function questionsFigure(body) {
  const qs = String(body).replace(/\s+/g, ' ').split(/(?<=\?)\s+/)
    .map((x) => x.trim()).filter((x) => /\?$/.test(x) && x.length > 12 && x.length < 90);
  const seen = new Set();
  const uniq = qs.filter((q) => !seen.has(q) && seen.add(q));
  return uniq.length >= 2
    ? { kind: 'steps', items: uniq.slice(0, 4).map((q) => ({ label: q, caption: '' })) }
    : null;
}

// «Teacher says: "…"» — the classroom voice. Drawn as a large centred card it reads as
// a callout a teacher can glance at, instead of disappearing into a paragraph.
function quoteFigure(body, profile) {
  const q = [...String(body).matchAll(/Teacher says:?\s*"([^"]{6,90})"/g)].map((m) => m[1].trim());
  if (!q.length) return null;
  return { kind: 'expression', text: q[0], caption: q.length > 1 ? (profile.teacherSaysLabel || '') : '' };
}

// «أ ب ي → أَبِي (٣ حروف)» — letter building. The arrow form is the teaching point.
function buildFigure(body) {
  const rows = [...String(body).matchAll(/([أ-ي](?:\s+[أ-ي]){1,5})\s*[←→]\s*([^\s(،.]{2,14})/g)]
    .map((m) => ({ label: m[2].trim(), caption: m[1].trim() }));
  const seen = new Set();
  const uniq = rows.filter((r) => !seen.has(r.label) && seen.add(r.label));
  return uniq.length >= 2 ? { kind: 'steps', items: uniq.slice(0, 6) } : null;
}

// The lesson's own warning about what pupils get wrong, and the correction that follows
// it. Drawn as the pilot's ✗/✓ split board: the mistake on one side, the fix on the
// other, both labelled with the lesson's own words.
function errorBoardFigure(body, profile) {
  const t = String(body);
  const warn = profile.warnRe || /watch out|misconception/i;
  const fixRe = profile.fixRe || /(?:correction|correct)\s*[:،]?\s*([^.!؟\n]{6,60})/i;
  const errRe = profile.errRe || /(?:some (?:pupils|learners)|learners often)\s*[:،]?\s*([^.!؟\n]{6,60})/i;
  if (!warn.test(t) && !fixRe.test(t)) return null;
  const fix = t.match(fixRe);
  const err = t.match(errRe);
  if (!fix || !err) return null;
  const short = (x) => x.trim().split(/\s+/).slice(0, 5).join(' ');
  return { kind: 'error-board',
    wrong: { kind: 'expression', text: short(err[1]) },
    correct: { kind: 'expression', text: short(fix[1]) },
    labelWrong: profile.boardWrong || 'Common error',
    labelCorrect: profile.boardCorrect || 'Correction' };
}

// The lesson's key words as a card set — taken from the vocabulary table it already
// provides. Attached to the first stage card that has no figure of its own, so page 1
// opens with something to look at.
function wordCardsFigure(rows) {
  if (!rows || rows.length < 2) return null;
  return { kind: 'steps',
    items: rows.slice(0, 6).map((r) => ({ label: r.label, caption: r.value.split(/\s+/).slice(0, 3).join(' ') })) };
}

// A table's rows as step cards: label = first cell, caption = the next. The source's
// own cells, drawn by code, in the design's own component.
function tableFigure(body) {
  const rows = tableRows(body);
  if (rows.length < 2) return null;
  return { kind: 'steps',
    items: rows.slice(0, 6).map((r) => ({ label: r.label, caption: r.value })) };
}

function figureFor(rawBody, profile) {
  // Order matters, most meaningful first: a matching exercise or a letter build IS the
  // example, so it beats a generic list; a classroom quote beats prose; a bulleted list
  // is the stage's real activity steps; a table's rows next. A fenced block is LAST
  // because it is a chant in a warm-up (good) but letter-by-letter board spelling
  // elsewhere (poor labels) — preferring it produced cards reading «أ | أ | أح م د».
  const eb = errorBoardFigure(rawBody, profile);
  if (eb) return eb;
  const pf = pairsFigure(rawBody);
  if (pf) return pf;
  // a greeting-and-answer list is the lesson's own matching exercise
  const ap = askAnswerPairsFigure(rawBody);
  if (ap) return ap;
  const bf = buildFigure(rawBody);
  if (bf) return bf;
  const qf = quoteFigure(rawBody, profile);
  if (qf) return qf;
  const lf = stepsFigure(listItems(rawBody), profile);
  if (lf) return lf;
  const tf = tableFigure(rawBody);
  if (tf) return tf;
  const ff = fencedFigure(rawBody);
  if (ff) return ff;
  const eq = String(rawBody).match(/[٠-٩0-9]+\s*[+\-×÷]\s*[٠-٩0-9]+\s*=\s*[٠-٩0-9]+/);
  if (eq) return { kind: 'expression', text: eq[0] };
  // last: a part that is mostly questions the teacher reads out
  const qsf = questionsFigure(rawBody);
  if (qsf) return qsf;
  return null;
}

// The pilot card is text | figure | تحقق, and that amber sidebar is a signature of the
// approved design. The lesson supplies its own check text: exercises carry «MODEL
// ANSWER», «الحل الصحيح», «Expected response». Splitting a part at that marker fills
// both slots with the source's own words — the instruction on one side, the answer the
// teacher checks against on the other — so the anatomy is complete without inventing
// anything. The asterisks are OPTIONAL: sources write «**MODEL ANSWER**:» in some
// places and a bare «MODEL ANSWER:» in others. Requiring one found nothing.
function splitCheck(text, profile) {
  const t = String(text);
  const m = t.search(profile.checkMarks);
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

// A role with no hand-written treatment is rendered from the SHAPE of its own content:
// a table becomes a field list, bullets become a numbered list, prose becomes a note.
// This is what lets a region's extra roles (Strand, Key Inquiry Question, Extended
// Activities, Reflection …) arrive on the page with no code written for each one.
function shapeSection(id, heading, raw, hint, opts = {}) {
  const rows = tableRows(raw);
  const items = listItems(raw);
  const body = plain(raw);
  const want = hint || '';
  if (want === 'rubric') {
    const rb = rubricItems(raw);
    if (rb.length >= 2) return { id, heading, type: 'rubric', items: rb };
  }
  // A CHIP HOLDS A PHRASE, NOT A SENTENCE. Lesson 01's materials list runs to entries like
  // «بطاقات كلمات مكتوبة بخط واضح وكبير (يمكن كتابتها يدوياً على ورق مقوى أو كراتين قديمة):
  // أبي، أمي، أحمد، سبأ، إيمان.» — 120 characters, which as a pill is a paragraph with
  // rounded corners. Long entries render as a list instead; short ones stay chips.
  if (want === 'chips' && items.length) {
    const clean = items.map((t) => t.replace(/\*\*/g, ''));
    if (!clean.some((t) => t.length > 48)) return { id, heading, type: 'chips', items: clean };
  }
  // …and only when there is no list to work from. Skipping the chips path because the
  // items are long must fall through to BULLETS, not to this one — splitting the whole
  // prose on Arabic commas turned lesson 01's materials into «كتاب الطالب صفحة 32. بطاقات
  // كلمات مكتوبة…» followed by a chip reading «أمي».
  if (want === 'chips' && !items.length && body) {
    // Split on the SEPARATOR THE SOURCE CHOSE. Splitting on commas as well as semicolons
    // broke a single resource — «Chart, Model of the breathing system» — into two.
    const sep = /;/.test(body) ? /\s*;\s*/ : /\s*[,،·]\s*/;
    const parts = body.split(sep).map((x) => x.trim()).filter((x) => x.length > 1);
    if (parts.length >= 2) return { id, heading, type: 'chips', items: parts.slice(0, 14) };
  }
  if (rows.length) return { id, heading, type: 'fields', items: rows };
  // The 30-second summary is the design's own cream card: an icon, a bold label and the
  // line it introduces. Its three labelled parts map straight onto that.
  if (want === 'summary') {
    const fl = fieldLines(raw);
    if (fl.length >= 2) {
      return { id, heading, type: 'summary',
        items: fl.map((f) => ({ label: f.label, body: f.value })) };
    }
  }
  if (want === 'fields') {
    const fl = fieldLines(raw);
    if (fl.length >= 2) return { id, heading, type: 'fields', items: fl };
  }
  if (items.length) {
    // The prose ABOVE a list belongs to the list: «By the end of the lesson, the learner
    // should be able to:» is the sentence the outcomes complete, and dropping it lost a
    // line of the teacher's text.
    const firstItem = String(items[0]).slice(0, 24);
    const at = firstItem ? raw.indexOf(firstItem) : -1;
    const lead = at > 0 ? plain(raw.slice(0, at)) : '';
    const sec = { id, heading, type: 'bullets', marker: items.length > 2 ? 'num' : 'dot',
      items: items.map((t) => ({ text: t })) };
    if (lead) sec.lead = lead;
    return sec;
  }
  if (!body) {
    // A heading with nothing under it is normally NOT a card — inventing content for an
    // empty role is exactly what this module refuses to do. The exception is a role whose
    // content is written by hand on the printed page: a CBC plan's Reflection is ruled
    // space for the teacher to fill after teaching, and the heading is in the source.
    return opts.emitEmpty ? { id, heading, type: want === 'note' ? 'note' : 'text', body: '' } : null;
  }
  return { id, heading, type: want === 'note' ? 'note' : 'text', body };
}

function buildGuideFromMarkdown(md, opts = {}) {
  const { subject = '', grade = '' } = opts;
  // Region resolution, in this order: what the caller declared (the Studio picker), what
  // the text looks like, then the region-neutral fallback. A declared region always
  // wins — detection is for a paste that arrives with nothing attached.
  const declared = opts.region || '';
  const detected = declared ? '' : detectRegion(md);
  const region = declared || detected || '';
  // resolveProfile also picks the LANGUAGE the source is written in, where a region has
  // more than one (Kenya's CBC form exists in English and in Kiswahili with identical
  // roles). The region says which curriculum; the text says which language of it.
  const profile = opts.profile || resolveProfile(region, md);
  const locale = opts.locale || profile.locale;
  const T = profile.titles;

  const doc = parseDocument(md, profile);
  const bs = doc.blocks;
  if (!doc.roles.size) {
    throw new Error(`from-markdown: no lesson headings found in the text — nothing in it `
      + `matched the ${profile.name} profile. Headings it looks for: `
      + `${Object.values(T).slice(1, 6).join(', ')}…`);
  }

  // The lesson's own title line. In markdown mode it is the h1; in bare mode there is
  // no h1, so it is whatever sits above the first heading. Taking blocks[0] instead —
  // which the first version did — titled a Kenyan lesson "Strand".
  const h1 = bs.find((b) => b.level === 1);
  const titleSrc = h1 ? h1.title : (doc.preamble.split('\n').map((l) => l.trim())
    .filter(Boolean).find((l) => l.length < 120) || '');
  const pageWords = (profile.pageWords || ['page']).join('|');
  const pageRe = new RegExp(`\\(?\\s*(?:${pageWords})\\.?\\s*(${D}+)\\s*\\)?`, 'i');
  const pageRef = toAscii((titleSrc.match(pageRe) || [])[1] || '');
  const gradeText = (titleSrc.match(profile.gradeRe) || [])[0] || grade || '';
  const trimSep = (s) => s.replace(/^[\s·|,;:\-–—]+|[\s·|,;:\-–—]+$/g, '').trim();
  let topic = trimSep(titleSrc.replace(profile.titleStrip || /$^/, '').replace(/\s*—.*$/, '')
    .replace(pageRe, ''));
  // The page number has its own slot in the lesson line, so leaving «(صفحة 32)» inside
  // the topic printed it twice — once in the source's own Latin digits.
  if (profile.gradeRe) topic = trimSep(topic.replace(profile.gradeRe, ''));
  const leftover = trimSep(titleSrc.replace(profile.gradeRe || /$^/, '').replace(pageRe, ''));

  // gather every block per role, in document order, so nothing is dropped
  const byRole = new Map();
  for (const b of bs) {
    const role = roleOf(b.title, profile);
    if (!role) continue;
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role).push(b);
  }
  const rawOf = (role) => (byRole.get(role) || []).map((b) => b.body).join('\n\n');

  // Some curricula NAME the lesson's topic in a section rather than in a title line: a
  // CBC plan's Sub-Strand IS the lesson ("Sub-Strand: The Breathing System"), while the
  // line above the first heading carries the grade and the learning area. Reading the
  // topic from that section is structural, not a guess at which preamble line matters —
  // and it is what stops a Kenyan lesson being titled "Grade 5" or "Strand".
  let subj = subject;
  let gradeFromForm = '';
  // A CBC plan states its grade and learning area as ROWS OF THE FORM — «DARASA: 1»,
  // «ENEO LA KUJIFUNZA: Kiswahili» — not in a title line, so the header came out with no
  // grade and no subject at all until these were read.
  const formRole = (profile.roles || []).some(([r]) => r === 'admin-form') ? 'admin-form' : '';
  if (formRole && byRole.get(formRole)) {
    const formBlocks = byRole.get(formRole);
    for (const f of fieldLines(rawOf(formRole), formBlocks[0] && formBlocks[0].title)) {
      const val = String(f.value || '').replace(/[_.\s]*$/, '').trim();
      if (!val) continue;
      if (profile.gradeField && profile.gradeField.test(f.label) && !gradeFromForm) {
        gradeFromForm = val;       // the chip supplies the word "Darasa" / "Grade"
      }
      if (profile.subjectField && profile.subjectField.test(f.label) && !subj) subj = val;
    }
  }
  if (profile.topicRole && byRole.get(profile.topicRole)) {
    const t = plain(rawOf(profile.topicRole));
    if (t && t.length <= 90) {
      topic = t;
      if (!subj && leftover && leftover !== t) subj = leftover;
    }
  }

  // Some template roles are not their own HEADING in some sources — they live as a bold
  // label inside a stage: «**الواجب المنزلي (Homework):**», «**Scaffolding (للطلاب
  // المتعثرين):**», «**Watch out:**». Measured against the approved Yemen design, four
  // required cards were missing from the raw-text render; three of them were sitting in
  // the source under these labels, so they are lifted to their proper role instead of
  // being buried mid-stage. A profile with no such convention declares no lifts.
  const lifted = new Map();
  const liftRole = (label) => {
    for (const [role, re] of (profile.lift || [])) if (re.test(label)) return role;
    return null;
  };

  const sections = [];
  const push = (s) => { if (s) sections.push(s); };

  const grade_ = gradeText || gradeFromForm;
  const lessonLine = [subj, grade_, topic,
    pageRef ? `${profile.pageLabel} ${num(profile, pageRef)}` : '']
    .filter(Boolean).join(' · ');
  // …and only if there is something to say. A lesson with no title line above its first
  // heading produced an empty «درس» card: a coloured tab over a blank panel.
  if (profile.lessonLineCard !== false && lessonLine) {
    push({ id: 'lesson-line', heading: T['lesson-line'], type: 'text', body: lessonLine });
  }

  // ── roles with a hand-written treatment, when the profile has them ────────────────
  if (T.goal && byRole.get('goal')) {
    const body = byRole.get('goal').map((b) => plain(b.body)).filter(Boolean).join(' ');
    if (body) push({ id: 'goal', heading: T.goal, type: 'note', body: `**${profile.goalLead}** ${body}` });
  }

  // Misconceptions only if the lesson has them. No invention — but no LOSS either: the
  // twin ✗/✓ card needs two list items, and a lesson that states its misconception as one
  // sentence («الأخطاء الشائعة: الخلط بين كلمتي "أبي" و"أمي" … يصححه المعلم بالتركيز على
  // نطق ومخرج حرفي "الباء" و"الميم"») used to produce NO card at all, which dropped the
  // content from the page. Prose falls back to a note card, and the confusion the sentence
  // names is drawn as the pilot's split board.
  if (T.errors && byRole.get('errors')) {
    const raw = rawOf('errors');
    const items = listItems(raw);
    if (items.length >= 2) {
      push({ id: 'errors', heading: T.errors, type: 'qa',
        items: [{ q: `✗ ${profile.labelWrong}`, a: items[0] },
          { q: `✓ ${profile.labelCorrect}`, a: items[1] }] });
    } else {
      const body = plain(raw);
      if (body) {
        const sec = { id: 'errors', heading: T.errors, type: 'misconception', body };
        const pair = profile.confusedPairRe ? body.match(profile.confusedPairRe) : null;
        if (pair) {
          // «✕ خطأ» / «✓ صواب» — the two words the design puts on this panel.
          sec.codeFigure = { kind: 'error-board',
            wrong: { kind: 'expression', text: pair[1].replace(/["»«]/g, '').trim() },
            correct: { kind: 'expression', text: pair[2].replace(/["»«]/g, '').trim() },
            labelWrong: profile.labelWrong, labelCorrect: profile.labelCorrect };
        }
        push(sec);
      }
    }
  }

  // ── the stages: one card per labelled part ────────────────────────────────────────
  for (const id of profile.stages) {
    const found = byRole.get(id);
    if (!found) continue;
    // A STAGE THE SOURCE LEAVES EMPTY. This lesson's «العرض — أنا أفعل (١٠ دقائق)» heading
    // has no body under it. Dropping the stage silently breaks the four-stage rhythm a
    // teacher reads by; inventing text to fill it would be worse. The heading, its time and
    // its gradual-release pill are the source's own, so the card is emitted with no body and
    // the pack draws it as a slim empty stage.
    if (profile.emitEmptyStages && !found.some((b) => plain(b.body))) {
      const mins = found.map((x) => minutesOf(x.title, profile)).find(Boolean) || '';
      const sec = { id, heading: T[id], type: 'stage', body: '' };
      if (mins) sec.time = mins;
      if ((profile.grr || {})[id]) sec.mode = profile.grr[id];
      push(sec);
      continue;
    }
    // ONE CARD PER LABELLED PART, not one card per stage. Putting a whole stage's text
    // into a single card and hanging one figure underneath is what made the full LP read
    // as a text document: the pack's card anatomy is text-beside-figure, and it cannot
    // apply to 2,400 characters. The lesson's own parts are 100–650 characters each —
    // the size that anatomy was designed for — so each becomes its own card in the
    // stage's colour, carrying its own title, its own text and its own figure.
    let first = true;
    let lastCard = null;      // sub-elements attach to the card they belong to
    const subOf = (label) => {
      for (const [, re, title] of (profile.subElements || [])) if (re.test(label)) return title;
      return null;
    };
    const unit = (profile.minutesWords || ['min']).join('|');
    const tailMin = new RegExp(`\\s*\\(?\\s*\\d+(?:\\s*[-–]\\s*\\d+)?\\s*(?:${unit})\\s*\\)?\\s*$`, 'i');
    const bare = (x) => String(x).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    for (const b of found) {
      // «Introduction (5 minutes)» under a card already titled «Introduction» printed
      // «Introduction · Introduction (5 minutes)». The minutes are shown on the time
      // pill, and a heading that only repeats the role name adds nothing.
      let blockHead = b.title.replace(/\s*—.*$/, '').replace(tailMin, '').trim();
      if (T[id] && bare(blockHead).startsWith(bare(T[id]))) blockHead = '';
      for (const part of labelledParts(b.body, profile)) {
        const role = part.label ? liftRole(part.label) : null;
        if (role) {
          if (!lifted.has(role)) lifted.set(role, []);
          lifted.get(role).push({ label: part.label, body: part.body });
          continue;
        }
        // A SUB-ELEMENT BELONGS TO THE ACTIVITY ABOVE IT, not to a card of its own.
        // «دعم» and «تحد» as full-width cards tripled the length of the LP and made every
        // stage read as three identical boxes. They ride on the stage card as compact
        // callouts, which is how the approved design carries them.
        const sub = part.label ? subOf(part.label) : null;
        if (sub && lastCard) {
          if (!lastCard.callouts) lastCard.callouts = [];
          lastCard.callouts.push({ label: sub, body: part.body });
          continue;
        }
        // Every card says which stage it belongs to: a teacher on page 3 should not have
        // to scroll back to find out they are still in العرض / still in Development.
        // KEEP THE SEPARATOR AWAY FROM A DIGIT. «التطبيق · ١) أصل بين…» displayed as
        // «التطبيق ١٠ ) أصل بين…»: bidi puts the neutral middle dot to the LEFT of the
        // Arabic-Indic digit run, right against «١», where it reads as «١٠». An isolate does
        // not help — the characters are in the wrong visual order either way. An em dash
        // cannot be mistaken for a zero, so a digit-initial label uses that instead.
        // A SENTENCE IS NOT A CARD TITLE. The pack draws a stage title inside the card's top
        // padding — .s-head is 32px tall with a -32px bottom margin — so a title that wraps
        // to two lines overflows its box and collides with the card's own text, which is
        // what «التقويم والختام · يحل التلاميذ التمرين الثالث بمفردهم في الكتاب» did. A long
        // label is prepended to the BODY instead: the title stays as short as the pilot's,
        // and not one word leaves the page. A numbered exercise heading always stays a
        // title — that IS its role, and those are short.
        const rawLabel = String(part.label || blockHead || '').trim();
        const isExercise = /^[\d٠-٩]/.test(rawLabel);
        const longLabel = !isExercise && rawLabel.length > 34;
        const label = longLabel ? '' : rawLabel;
        const sep = isExercise ? ' — ' : ' · ';
        const title = [T[id], label].filter(Boolean).join(sep);
        const fig = figureFor(part.raw || '', profile);
        // THE ACTIVITY IS THE VISUAL, NOT A PARAGRAPH TOO. When a matching figure carries
        // the pairs, printing «أبي ← صورة الأب أمي ← صورة الأم …» in the body as well is the
        // "labels squeezed into running text" the reviewer rejected. Every one of those
        // words still appears — drawn, in the activity — and the instruction line above them
        // stays exactly as written.
        //
        // This has to happen BEFORE the card is built: a card carrying a check point is a
        // `steps` card whose text lives in items[0].body, not in .body, so stripping
        // afterwards wrote to a field the renderer ignores and silently dropped the
        // instruction «٣) ألاحظ الكلمة التي في الشكل…» off the page.
        let partBody = longLabel && part.body
          ? `${rawLabel}: ${part.body}`
          : (longLabel ? rawLabel : part.body);
        if (fig && fig.kind === 'match-pairs') {
          // Strip at LINE level, from part.raw — part.body has already been flattened by
          // plain(), so a line filter applied to it matched nothing and the fallback regex
          // chewed the joined text into «… في السطر ← أحمد ← إيمان : ٨٠٪ …». Removing whole
          // source lines is exact: a pair line goes, everything else stays as written.
          const kept = plain(String(part.raw || '').split('\n')
            .filter((l) => !/^[\s•▪●◦*-]*[^\s←→،.:]{1,18}\s*[←→]/.test(l.trim()))
            .join('\n'));
          partBody = longLabel ? [rawLabel, kept].filter(Boolean).join(': ') : kept;
        }
        // Fill the pilot's two text slots from the part's own words when it carries a
        // model answer; otherwise a plain text card.
        let sp = splitCheck(partBody, profile);
        // A CARD WHOSE ONLY TEXT IS ITS CHECK POINT still puts that text in the تحقق strip.
        // splitCheck needs something before the marker to split at, so once the pair lines
        // moved into the matching visual the check was left as the card's body — losing the
        // amber strip on exactly the card whose activity most needs it.
        if (!sp.check && !sp.longCheck && partBody
            && partBody.search(profile.checkMarks) === 0 && partBody.length <= 160) {
          sp = { body: '', check: partBody.trim() };
        }
        // AN EXPLICIT STAGE COMPONENT WITH NAMED SLOTS — text, visual, checkpoint,
        // support, challenge — rather than a generic card whose contents arrange
        // themselves. The renderer lays these out on a fixed grid (see ylStage).
        const sec = { id, heading: title, type: 'stage',
          body: sp.longCheck ? sp.body : (sp.check ? sp.body : partBody) };
        if (sp.check) sec.check = sp.check;
        if (first) {
          sec.time = found.map((x) => minutesOf(x.title, profile)).find(Boolean) || '';
          sec.mode = (profile.grr || {})[id] || '';
          if (!sec.time) delete sec.time;
          if (!sec.mode) delete sec.mode;
          first = false;
        }
        if (fig) {
          // the same pairs, a different component: «أضع خطاً تحت الكلمة المماثلة» is an
          // exercise to complete, not a matching demonstration to read
          sec.codeFigure = (fig.kind === 'match-pairs' && id === profile.assessmentStage)
            ? { ...fig, kind: 'assessment' } : fig;
        }
        push(sec);
        lastCard = sec;
        // A long model answer is its own card — same stage colour — rather than being
        // squeezed into a sidebar built for one line.
        if (sp.longCheck) {
          push({ id, heading: `${title} · ${profile.solutionLabel}`, type: 'text', body: sp.longCheck });
        }
      }
    }
  }

  // ── the roles lifted out of the stages ───────────────────────────────────────────
  const mgLift = lifted.get('multigrade');
  if (mgLift && mgLift.length && !byRole.get('multigrade')) {
    push({ id: 'multigrade', heading: T.multigrade, type: 'bullets', marker: 'num',
      items: mgLift.map((x) => ({ text: `**${x.label}:** ${x.body}` })) });
  }
  const hwLift = lifted.get('homework');
  if (hwLift && hwLift.length && !byRole.get('homework')) {
    push({ id: 'homework', heading: T.homework, type: 'note',
      body: hwLift.map((x) => `**${x.label}:** ${x.body}`).join(' ') });
  }
  // The «Watch out» text IS a misconception and its correction — the content the pilot's
  // ✗/✓ twin card exists for. Split it at the lesson's own markers so the pair carries
  // the lesson's sentences, add the drawn board beside them, and keep whatever is left
  // as the note underneath so nothing is dropped.
  const ecLift = lifted.get('errors-caption');
  if (ecLift && ecLift.length) {
    const all = ecLift.map((x) => x.body).join(' ');
    const fixM = profile.fixLongRe ? all.match(profile.fixLongRe) : null;
    const errM = profile.errLongRe ? all.match(profile.errLongRe) : null;
    if (fixM && errM) {
      // A drawn label must say something on its own. Taking the first four words gave
      // «في هذا العمر يخلطون» — a mid-sentence fragment. The confusion pair is the
      // teaching point, so use it when the sentence names one.
      const shortLbl = (x) => {
        const pair = profile.confusionPairRe ? x.match(profile.confusionPairRe) : null;
        if (pair) return `${pair[1]} / ${pair[2]}`.replace(/"/g, '');
        return x.trim().split(/\s+/).slice(0, 4).join(' ');
      };
      push({ id: 'errors', heading: T.errors, type: 'qa',
        items: [{ q: `✗ ${profile.labelWrong}`, a: errM[1].trim() },
          { q: `✓ ${profile.labelCorrect}`, a: fixM[1].trim() }],
        codeFigure: { kind: 'error-board',
          wrong: { kind: 'expression', text: shortLbl(errM[1].replace(profile.errLeadRe || /$^/, '')) },
          correct: { kind: 'expression', text: shortLbl(fixM[1]) },
          labelWrong: profile.boardWrong, labelCorrect: profile.boardCorrect } });
      // Join what is left with a separator rather than splicing the sentences together:
      // cutting two non-adjacent sentences out of a paragraph and butting the remainders
      // against each other creates a seam that is not in the source. Keeping them as
      // separate pieces preserves every word AND keeps each piece a real source slice.
      const rest = all.replace(errM[1], '§').replace(fixM[0], '§')
        .split('§').map((x) => x.trim()).filter((x) => x.length > 20).join(' · ');
      if (rest) push({ id: 'errors-caption', heading: T['errors-caption'], type: 'text', body: rest });
    } else {
      push({ id: 'errors-caption', heading: T['errors-caption'], type: 'text',
        body: ecLift.map((x) => `**${x.label}:** ${x.body}`).join(' ') });
    }
  }

  if (T.solutions && byRole.get('solutions')) {
    const items = listItems(rawOf('solutions'));
    const body = items.length ? null : plain(rawOf('solutions'));
    if (items.length) {
      push({ id: 'solutions',
        heading: `${T.solutions}${pageRef ? ` · ${profile.pageLabel} ${num(profile, pageRef)}` : ''}`,
        type: 'bullets', marker: 'num', items: items.map((t) => ({ text: t })) });
    } else if (body) {
      push({ id: 'solutions', heading: T.solutions, type: 'text', body });
    }
  }

  if (T.glossary && byRole.get('glossary')) {
    const rows = tableRows(rawOf('glossary'));
    if (rows.length) push({ id: 'glossary', heading: T.glossary, type: 'fields', items: rows });
  }

  if (T.multigrade && byRole.get('multigrade')) {
    const items = listItems(rawOf('multigrade'));
    if (items.length) {
      push({ id: 'multigrade', heading: T.multigrade, type: 'bullets', marker: 'num',
        items: items.map((t) => ({ text: t })) });
    }
  }

  if (T.homework && byRole.get('homework')) {
    const body = plain(rawOf('homework'));
    if (body) push({ id: 'homework', heading: T.homework, type: 'note', body });
  }

  // ── roles the profile groups onto one card ───────────────────────────────────────
  const merged = new Set();
  for (const rule of (profile.merge || [])) {
    // An EXPAND role contributes its own «LABEL: value» rows (the fill-in form); a plain
    // role contributes one row, its card title against its text.
    const items = [];
    for (const r of (rule.expand || [])) {
      const bs_ = byRole.get(r);
      if (!bs_) continue;
      items.push(...fieldLines(rawOf(r), bs_[0] && bs_[0].title));
      merged.add(r);
    }
    items.push(...rule.roles.filter((r) => byRole.get(r))
      .map((r) => ({ label: T[r] || r, value: plain(rawOf(r)) }))
      .filter((x) => x.value));
    if (items.length) {
      push({ id: rule.id, heading: rule.title, type: rule.type || 'fields', items });
      rule.roles.forEach((r) => merged.add(r));
    }
  }

  // ── every other role the profile knows, rendered from its own shape ──────────────
  const done = new Set([...sections.map((s) => s.id), ...merged]);
  for (const [role] of profile.roles) {
    if (done.has(role) || profile.stages.includes(role) || !byRole.get(role)) continue;
    if (['goal', 'errors', 'solutions', 'glossary', 'multigrade', 'homework'].includes(role)) continue;
    push(shapeSection(role, T[role] || role, rawOf(role), (profile.types || {})[role],
      { emitEmpty: (profile.emitEmpty || []).includes(role) && !!byRole.get(role) }));
    done.add(role);
  }

  // Give page 1 something to look at: the lesson's own vocabulary as a card set, on the
  // first stage card that has no figure of its own.
  // Reserve a card for the illustration FIRST. render.js renders a section's codeFigure
  // and never reaches the image branch when both are set, so a card holding both shows
  // only the drawing — which is how the generated artwork went missing from page 1 while
  // the log said it had been generated.
  const isStage = (x) => profile.stages.includes(x.id);
  const artCard = sections.find((x) => isStage(x) && !x.codeFigure);
  const vocabRole = byRole.get('glossary') ? 'glossary' : (byRole.get('resources') ? 'resources' : '');
  if (vocabRole) {
    const wc = wordCardsFigure(tableRows(rawOf(vocabRole)));
    const target = sections.find((x) => isStage(x) && !x.codeFigure && x !== artCard);
    if (wc && target) target.codeFigure = wc;
  }

  const rank = (id) => {
    const i = profile.order.indexOf(id);
    return i < 0 ? profile.order.length : i;
  };
  sections.sort((a, b) => rank(a.id) - rank(b.id));

  const meta = { id: 'lesson-guide', locale, region, subject: subj, grade: grade_, chips: [] };
  // A profile may put the identifying details in the page header instead of in a card.
  for (const [label, key] of (profile.headerChips || [])) {
    const value = key === 'subject' ? subj : key === 'grade' ? grade_ : '';
    if (!value) continue;
    // The source often writes the label into the value — «Grade 5» under a chip already
    // labelled "Grade" printed «Grade  Grade 5». The value wins; the label drops.
    const dup = value.toLowerCase().startsWith(label.toLowerCase());
    meta.chips.push({ label: dup ? '' : label, value });
  }
  // Document chrome — ministry header, subtitle band, footer line — is the region's,
  // not the mapper's. A profile whose chrome carries a `when` only stamps it when that
  // holds (Yemen's ministry header belongs on an Arabic Yemeni lesson and nowhere else);
  // a chrome with an empty title lets the lesson's own topic title the page.
  const ch = profile.chrome || {};
  if (!ch.when || ch.when(locale, region)) {
    meta.title = ch.title || topic || 'Lesson guide';
    if (ch.subtitle) meta.subtitle = ch.subtitle;
    if (ch.footer) meta.footer = ch.footer;
  } else {
    meta.title = topic || 'Lesson guide';
  }
  // ONE WORDLESS ILLUSTRATION BRIEF, authored from the lesson's own topic. The image
  // model is the only source of artwork (labels stay code-drawn), and with an empty
  // credit balance nothing generates — the pipeline logs the drop and the LP still
  // renders. Authoring it anyway means the artwork appears on a top-up with no code
  // change. Region art direction (dress, teacher, setting) comes from the region's
  // art-direction pack — imagegen/prompts/regions/<region>.js — so the same brief is
  // grounded in a Yemeni classroom or a Kenyan one without being written differently.
  const images = [];
  const warmup = artCard || sections.find((x) => x.id === profile.stages[0]);
  // A lesson with no title line has no topic to brief an illustration from — this one had
  // none, so no artwork was authored at all. Its GOAL states what the lesson is about
  // («أستطيع التعرف على كلمات أفراد الأسرة وقراءتها والمطابقة بينها»), which is the
  // lesson's own description of itself and the right thing to draw. The brief is a prompt
  // to the image model, never reader-visible text.
  const goalSec = sections.find((x) => x.id === 'goal');
  const artTopic = topic || (goalSec
    ? String(goalSec.body || '').replace(/\*\*[^*]*\*\*/g, '').replace(/[.؟!]+\s*$/, '')
      .trim().slice(0, 90)
    : '');
  if (warmup && artTopic && !warmup.codeFigure) {
    images.push({
      id: 'lesson-scene',
      concept: 'scene',
      // THE LABEL IS READER-VISIBLE — it prints as the figure's caption, so it must not be
      // cut mid-word. A goal-derived topic sliced at 40 characters put «أستطيع التعرف على
      // كلمات أفراد الأسرة وقر» under the picture, "وقر" being half of "وقراءتها". Cut back
      // to the last whole word instead.
      label: cutWords(topic || artTopic, 44),
      // Naming boards, pages and walls as "empty surfaces" is what produced a row of blank
      // framed panels: the model draws what the brief names, so a brief that names an empty
      // board gets an empty board. Describe the PEOPLE and the ACTION instead.
      //
      // AND DO NOT ARGUE WITH THE SCAFFOLD. imagegen/prompts appends its own textless
      // rule — "every board, page, card and label area is blank and empty" — so my
      // earlier "No empty boards, blank cards, picture frames or vacant panels" put two
      // opposite instructions about the same object in one prompt. Read back from the
      // composed prompt, not from either file alone. The positive form ("the composition
      // is filled by the people") gets the same result without the contradiction, and
      // the scaffold keeps sole ownership of the no-text rule.
      // KEEP IT SHORT, AND ONLY THE SCENE. imagegen's scaffold already supplies the
      // style ("a warm, friendly flat-vector children's-book illustration…"), the
      // colour note and the no-text rule, and the region pack supplies dress, teacher
      // and setting. My first version restated the style itself, which pushed the
      // COMPOSED prompt to 1,194 characters against z-image's 1,000-character limit —
      // so the compactor trimmed the longest middle sentence, which was the region's
      // "any adult is Kenyan — dark brown skin and African features" clause. The prompt
      // then no longer asked for the very thing the culture gate checks. Describe the
      // people and the action; let the scaffold and the pack do their own jobs.
      prompt: 'Young primary-school children and their teacher together in a simple '
        + 'classroom, engaged in an activity about ' + topic + '. Show faces, gestures '
        + 'and posture; fill the frame with the people and a few simple objects they are '
        + 'handling.',
    });
    warmup.image = 'lesson-scene';
  }
  return { meta, images, sections, sourceProfile: { id: profile.id, name: profile.name, mode: doc.mode } };
}

module.exports = { buildGuideFromMarkdown, blocks, roleOf, plain, tableRows, listItems,
  rubricItems, parseDocument, GUIDE_SECTION_IDS };
