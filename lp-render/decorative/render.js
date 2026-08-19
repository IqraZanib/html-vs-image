'use strict';
// Generic, content-driven decorative renderer (RULES R1–R7).
// It ONLY styles what the content JSON gives it. It never rewords, summarizes,
// translates, or invents lesson content. Every string rendered is escaped
// content taken verbatim from the JSON.
const { esc } = require('../template/shell');
const { icon, hasIcon } = require('../template/icons');
const { headerMotifs, headTwinkle, sparkle } = require('./motifs');
const { accentFor } = require('./theme');
const { renderMath, richText, katexCss, cleanHeading } = require('../math/math');

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const mark = (kind, i) => (kind === 'alpha' ? ALPHA[i] + ')' : kind === 'num' ? String(i + 1) : '•');

// small helpers for per-lesson character variation
function seedOf(str) { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function rotate(arr, k) { const n = arr.length; if (!n) return arr.slice(); const s = ((k % n) + n) % n; return arr.slice(s).concat(arr.slice(0, s)); }

// A section header. Single-grade: a solid coloured tab (accent box, white icon+title).
// Multigrade (mg): a dark navy full-width bar (reference-matched). '' for empty heading.
function sectionHead(accent, section, i, mg) {
  const title = cleanHeading(section.heading);
  if (!title) return '';
  const time = section.time ? `<div class="s-time">${esc(cleanHeading(section.time))}</div>` : '';
  const ic = section.icon && hasIcon(section.icon) ? icon(section.icon, 22) : sparkle('#fff');
  if (mg) {
    return `<div class="s-head mg"><div class="s-bar"><span class="s-ic">${ic}</span>`
      + `<span class="s-title">${esc(title)}</span>${time}</div></div>`;
  }
  return `<div class="s-head"><div class="s-tab" style="background:var(${accent})">`
    + `<span class="s-ic">${ic}</span><span class="s-title">${esc(title)}</span></div>${time}</div>`;
}

// Faint decorative icons behind the title block (like a lesson-plan letterhead).
function headerBg() {
  const ic = (n, cls) => (hasIcon(n) ? `<div class="hb ${cls}">${icon(n, 60)}</div>` : '');
  return `<div class="hbwrap">${ic('blackboard', 'b1')}${ic('books', 'b2')}${ic('target', 'b3')}${ic('pencil', 'b4')}</div>`;
}

// An image shown INLINE inside a section, right under the point it explains.
function inlineImage(id, images) {
  const im = images[id];
  if (!im || !im.dataUri) return '';
  const cap = im.label ? `<div class="cap">${esc(cleanHeading(im.label))}</div>` : '';
  return `<div class="d-imgrow n1 d-inline-img"><div class="d-img${im.cover ? ' cover' : ''}">`
    + `<img src="${im.dataUri}" alt="${esc(cleanHeading(im.label || ''))}">${cap}</div></div>`;
}

function renderBody(section, accent, images) {
  const soft = `var(${accent}-soft)`;
  const ink = `var(${accent}-ink)`;
  switch (section.type) {
    case 'summary': {
      const rows = (section.items || []).map((it) =>
        `<div class="srow"><div class="sic">${esc(it.icon || '•')}</div>`
        + `<div class="stext">${it.label ? `<b>${esc(cleanHeading(it.label))}:</b> ` : ''}${richText(it.body || '', { engine: section.engine })}</div></div>`
      ).join('');
      return `<div class="d-summary">${rows}</div>`;
    }
    case 'duo': {
      // Two grades side by side — lower grade (a) teal, higher grade (b) gold. Each
      // column can show WHO HAS THE TEACHER: role "teacher" (filled dot) / "own" (ring).
      const col = (g, tok) => {
        if (!g || !(g.label || g.body)) return '';
        const role = g.role === 'teacher'
          ? '<span class="mk teacher"></span><span class="role">Teacher here</span>'
          : g.role === 'own'
            ? '<span class="mk own"></span><span class="role">On its own</span>' : '';
        return `<div class="d-col" style="--cc:var(${tok});--cc-soft:var(${tok}-soft)">`
          + `<div class="cc-h">${role}${esc(cleanHeading(g.label || ''))}</div>`
          + `<div class="cc-b">${richText(g.body || '', { engine: section.engine })}</div></div>`;
      };
      const cols = col(section.a, '--g-a') + col(section.b, '--g-b');
      return cols ? `<div class="d-duo">${cols}</div>` : '';
    }
    case 'schedule': {
      // Minute-by-minute rotation overview: time · phase · who has the teacher · pages.
      const dot = (who) => {
        if (who === 'a') return '<span class="who"><span class="dot" style="background:var(--g-a)"></span>Teacher with ' + esc(section.gradeA || 'Grade A') + '</span>';
        if (who === 'b') return '<span class="who"><span class="dot" style="background:var(--g-b)"></span>Teacher with ' + esc(section.gradeB || 'Grade B') + '</span>';
        return '<span class="who">Whole class</span>';
      };
      const rows = (section.items || []).map((it) =>
        `<tr><td class="t">${esc(cleanHeading(it.time || ''))}</td><td>${richText(it.phase || '', { engine: section.engine })}</td>`
        + `<td>${dot(it.teacher)}</td><td>${esc(cleanHeading(it.pages || ''))}</td></tr>`).join('');
      return `<table class="d-sched"><thead><tr><th>Time</th><th>What happens</th><th>Who has the teacher</th><th>Pages</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    case 'table': {
      // A simple grid (e.g. a board-prep place-value table). Optional grade colour.
      const tok = section.grade === 'b' ? '--g-b' : section.grade === 'a' ? '--g-a' : null;
      const style = tok ? ` style="--cc:var(${tok});--cc-soft:var(${tok}-soft);--cc-ink:var(${tok}-ink)"` : '';
      const cap = section.caption ? `<caption>${esc(cleanHeading(section.caption))}</caption>` : '';
      const head = (section.columns || []).length ? `<thead><tr>${section.columns.map((c) => `<th>${esc(cleanHeading(c))}</th>`).join('')}</tr></thead>` : '';
      const body = (section.rows || []).map((r) => `<tr>${(r || []).map((c) => `<td>${esc(String(c))}</td>`).join('')}</tr>`).join('');
      return `<table class="d-gtable"${style}>${cap}${head}<tbody>${body}</tbody></table>`;
    }
    case 'rubric': {
      const COL = { exceeding: '--c-teal', meeting: '--c-green', approaching: '--c-amber', below: '--c-red' };
      const SYM = { exceeding: '★', meeting: '✓', approaching: '▲', below: '✕' };
      const rows = (section.items || []).map((it) => {
        const key = String(it.level || '').toLowerCase().replace(/[^a-z]/g, '');
        const c = COL[key] || accent; const sym = SYM[key] || '•';
        const lvl = cleanHeading(it.level || '').replace(/^[^\p{L}]+/u, ''); // drop any leading emoji/symbol (the badge already shows one)
        return `<div class="rrow"><div class="ric" style="background:var(${c})">${sym}</div>`
          + `<div><span class="rlevel">${esc(lvl)}:</span> `
          + `<span class="rdesc">${richText(it.desc || '', { engine: section.engine })}</span></div></div>`;
      }).join('');
      return `<div class="d-rubric">${rows}</div>`;
    }
    case 'bullets': {
      const km = section.marker || 'dot';
      const lis = (section.items || []).map((it, i) => {
        const tag = it.tag ? `<span class="d-tag" style="background:${soft};color:${ink}">${esc(it.tag)}</span>` : '';
        return `<li data-mark="${esc(mark(km, i))}">${richText(it.text, { engine: section.engine })}${tag}</li>`;
      }).join('');
      const lead = section.lead ? `<div class="d-lead">${esc(section.lead)}</div>` : '';
      return `${lead}<ul class="d-bullets">${lis}</ul>`;
    }
    case 'text':
      return `<div class="d-text">${richText(section.body, { engine: section.engine })}</div>`;
    case 'note': {
      const nt = section.label ? `<span class="nt" style="color:${ink}">${esc(cleanHeading(section.label))}</span>` : '';
      return `<div class="d-note" style="background:linear-gradient(90deg,${soft},#fff);border-inline-start:5px solid var(${accent})">${nt}${richText(section.body, { engine: section.engine })}</div>`;
    }
    case 'math':
      return `<div class="d-math">${(section.items || []).map((it) => `<div class="d-mrow">${it.label ? `<div class="d-mlabel">${esc(cleanHeading(it.label))}</div>` : ''}<div class="d-mformula">${renderMath(it.tex, { display: true, engine: section.engine })}</div></div>`).join('')}</div>`;
    case 'chips':
      return `<div class="d-chips">${(section.items || []).map((c) => `<span class="d-chip" style="background:${soft};color:${ink}">${esc(cleanHeading(c))}</span>`).join('')}</div>`;
    case 'steps':
      return `<div class="d-steps">${(section.items || []).map((s, i) => `<div class="d-step"><div class="n" style="background:var(${accent})">${i + 1}</div><div><div class="st-label">${richText(s.label, { engine: section.engine })}</div><div class="st-body">${richText(s.body, { engine: section.engine })}</div></div></div>`).join('')}</div>`;
    case 'qa': {
      const km = section.marker || 'alpha';
      return `<div class="d-qa">${(section.items || []).map((qa, i) => `<div class="d-qc"><div class="d-q" data-mark="${esc(mark(km, i))}" style="color:${ink}">${richText(qa.q, { engine: section.engine })}</div>${qa.a ? `<div class="d-a">${richText(qa.a, { engine: section.engine })}</div>` : ''}</div>`).join('')}</div>`;
    }
    case 'fields':
      return `<div class="d-fields">${(section.items || []).map((f) => `<div class="d-field"><b>${esc(cleanHeading(f.label))}</b>${esc(f.value || '')}</div>`).join('')}</div>`;
    case 'images': {
      const cards = (section.imageIds || [])
        .map((id) => images[id])
        .filter((im) => im && im.dataUri)
        .map((im) => `<div class="d-img${im.cover ? ' cover' : ''}"><img src="${im.dataUri}" alt="${esc(cleanHeading(im.label || ''))}"><div class="cap">${esc(cleanHeading(im.label || ''))}</div></div>`);
      if (!cards.length) return '';
      const n = Math.min(cards.length, 3);
      return `<div class="d-imgrow n${n}">${cards.join('')}</div>`;
    }
    default:
      return `<div class="d-text">${esc(section.body || '')}</div>`;
  }
}

const TEACHER_POOL = ['teacher', 'teacher_coral', 'teacher_purple'];

// Pick the first preferred character the cast has AND that this lesson hasn't used
// yet, so no two sections in one LP show the same figure (R9). Only if every option
// is already used do we allow a repeat.
function pickAvailable(prefs, cast, used) {
  for (const id of prefs) if (cast[id] && !used.has(id)) return id;
  for (const id of prefs) if (cast[id]) return id;
  return null;
}

// Decide which cast character (if any) accompanies a section that has no relevant
// real image (RULES R8, R9). Presentation varies by section, repeated teachers
// rotate colours, and the whole ordering is offset by a per-lesson seed so a maths
// plan and a science plan don't show the same faces. No figure repeats within one LP.
function pickCharacter(section, cast, rot, used) {
  if (section.character === false) return null;
  if (typeof section.character === 'string') return cast[section.character] ? section.character : null;
  if (section.type === 'images' || section.type === 'fields' || section.type === 'chips') return null;
  const h = String(section.heading || '');
  const isActivity = /activit|practic|experiment|partner|group|discuss/i.test(h);
  const eligible = section.type === 'text' || section.type === 'note' || section.type === 'steps' ||
    (section.type === 'bullets' && /activit|practic|experiment|assess|quiz|exam|partner|group|discuss/i.test(h));
  if (!eligible) return null;
  const teachers = rotate(TEACHER_POOL, rot.seed + rot.t++);     // varied per lesson
  const kids = rotate(['girl', 'boy'], rot.seed + rot.n++);
  let prefs;
  if (isActivity) prefs = ['students_pair', 'students_sitting', ...teachers, ...kids];
  else if (section.type === 'steps' || /develop|explanation|board|model answer|demonstrat/i.test(h)) prefs = ['teacher_board', ...teachers, 'students_sitting', ...kids];
  else if (/introduc/i.test(h)) prefs = ['students_sitting', ...kids, ...teachers];
  else if (/assess|quiz|exam/i.test(h)) prefs = [...kids, 'students_sitting', ...teachers];
  else prefs = [...kids, ...teachers, 'students_pair'];
  return pickAvailable(prefs, cast, used);
}

// Estimate a section's rendered content height so the character can be sized to
// fit within that boundary — never dwarfed, never overflowing (RULES R10).
function estimateHeight(section) {
  const items = (section.items || []).length;
  switch (section.type) {
    case 'steps': return items * 96;
    case 'bullets': return items * 46 + (section.lead ? 26 : 0);
    case 'qa': return Math.ceil(items / 2) * 74;
    case 'note':
    case 'text': return Math.max(74, Math.ceil(String(section.body || '').length / 58) * 24) + 22;
    default: return 150;
  }
}

// Given a section + chosen character, return inline sizes that respect the
// content boundary. Wider poses (pairs, sitting groups, board scenes) get a
// slightly wider box; tall content gets a taller figure.
function charSize(section, charId) {
  const wide = /pair|sitting|board/.test(charId); // multi-figure / scene poses need more room
  const floor = wide ? 152 : 124;
  const h = Math.max(floor, Math.min(310, estimateHeight(section) - 8));
  const w = Math.max(wide ? 132 : 104, Math.min(220, Math.round(h * (wide ? 0.82 : 0.66))));
  return { h, w };
}

// SVG fraction figure: square grids or circle pies, K of N shaded — exact by code.
function fractionGridSvg({ shape, parts, shaded }) {
  const W = 240, H = 200, FILL = '#f5c33b', EMPTY = '#ffffff', STROKE = '#2f3e63';
  if (shape === 'circle') {
    const cx = W / 2, cy = H / 2, r = 82;
    let paths = '';
    for (let i = 0; i < parts; i++) {
      const a0 = -Math.PI / 2 + (2 * Math.PI * i) / parts;
      const a1 = -Math.PI / 2 + (2 * Math.PI * (i + 1)) / parts;
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      paths += `<path d="M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z" fill="${i < shaded ? FILL : EMPTY}" stroke="${STROKE}" stroke-width="3"/>`;
    }
    return `<svg class="cf-svg" viewBox="0 0 ${W} ${H}">${paths}</svg>`;
  }
  const cols = parts === 2 ? 2 : parts === 3 ? 3 : parts <= 4 ? 2 : parts <= 6 ? 3 : 4;
  const rows = Math.ceil(parts / cols);
  const cw = 180 / cols, ch = 150 / rows, x0 = (W - 180) / 2, y0 = (H - 150) / 2;
  let rects = '';
  for (let i = 0; i < parts; i++) {
    const c = i % cols, rr = Math.floor(i / cols);
    rects += `<rect x="${x0 + c * cw}" y="${y0 + rr * ch}" width="${cw}" height="${ch}" fill="${i < shaded ? FILL : EMPTY}" stroke="${STROKE}" stroke-width="3"/>`;
  }
  return `<svg class="cf-svg" viewBox="0 0 ${W} ${H}">${rects}</svg>`;
}

function renderDecorativeLesson(content, images = {}, cast = {}) {
  const meta = content.meta || {};
  const chips = (meta.chips || []).map((c) => `<span><b>${esc(cleanHeading(c.label))}</b>${esc(cleanHeading(c.value))}</span>`).join('');
  const htext =
    `<h1>${esc(cleanHeading(meta.title))}</h1>` +
    (meta.subtitle ? `<div class="sub">${esc(cleanHeading(meta.subtitle))}</div>` : '') +
    (chips ? `<div class="meta">${chips}</div>` : '');
  // A banner image (meta.banner → an image id) becomes the hero background with the
  // title on a soft dark scrim; otherwise fall back to the warm gradient hero.
  const bannerImg = meta.banner && images[meta.banner] && images[meta.banner].dataUri;
  const headerHtml = bannerImg
    ? `<div class="lp-header banner" style="background-image:url('${bannerImg}')"><div class="lp-htext">${htext}</div></div>`
    : `<div class="lp-header">${headerBg()}${headerMotifs()}${htext}</div>`;

  // Track which images a section actually displays, so none are silently missing.
  const referenced = new Set();
  if (meta.banner) referenced.add(meta.banner); // shown in the hero, not as a card
  for (const s of (content.sections || [])) if (s && s.type === 'images' && Array.isArray(s.imageIds)) s.imageIds.forEach((id) => referenced.add(id));
  for (const s of (content.sections || [])) if (s && s.image) referenced.add(s.image); // in-panel figures (see below)
  for (const s of (content.sections || [])) { if (s && s.imageWrong) referenced.add(s.imageWrong); if (s && s.imageCorrect) referenced.add(s.imageCorrect); } // code-composed twin boards

  // Characters are a FALLBACK only (R23): if this lesson already shows real content
  // images, we add no characters at all — the informative images carry it.
  const hasContentImages = Object.values(images).some((im) => im && im.dataUri);

  const mg = !!meta.multigrade; // multigrade → navy headers + teal/gold grade columns
  let placed = 0;
  let prevHeading = '';
  const rot = { n: 0, t: 0, seed: seedOf(`${meta.id || ''}|${meta.subject || ''}|${meta.title || ''}`) };
  const used = new Set(); // no character repeats within one lesson
  const sections = (content.sections || []).map((section, i) => {
    // Admin blocks (Lesson Details) use a neutral slate tab, not a warm accent.
    const accent = section.type === 'fields' ? '--c-slate' : accentFor(i);
    // A section's id becomes a class (sec-<id>) so region packs can style specific
    // template roles order-independently. Additive: nothing targets these by default.
    const idCls = section.id ? ` sec-${String(section.id).toLowerCase().replace(/[^a-z0-9_-]/g, '')}` : '';
    let body = renderBody(section, accent, images);
    // Inline image (R32, upstream): in MULTIGRADE guides an explanatory picture sits
    // under the point it explains. In all other lessons section.image renders as the
    // in-panel side figure (design packs like Yemen's — see below); the mg gate keeps
    // both features exactly as their authors shipped them.
    if (mg && section.image && images[section.image] && images[section.image].dataUri) {
      referenced.add(section.image);
      body += inlineImage(section.image, images);
    }
    if (body === '') return '';
    // A heading that repeats the previous one (e.g. a phase split across structuring
    // chunks) is shown once — the rest render as a continuation, no repeated header.
    const title = cleanHeading(section.heading);
    const head = (title && title !== prevHeading) ? sectionHead(accent, section, i, mg) : '';
    if (title) prevHeading = title;
    // Optional in-panel illustration: `section.image` names a declared image id and the
    // figure renders INSIDE the section's panel beside the body (design sets like
    // Yemen's put an illustration in every stage card). Additive — no existing content
    // sets it, and sections without it render exactly as before.
    // Code-composed misconception board: the model draws two SINGLE-CONCEPT halves
    // (imageWrong / imageCorrect); the ✗/✓ marks, divider and side assignment are
    // rendered by CODE so the mapping can never invert (weak models scramble
    // relational binding when one image must contain the contrast).
    const twinW = !mg && section.imageWrong && images[section.imageWrong] && images[section.imageWrong].dataUri ? images[section.imageWrong] : null;
    const twinC = !mg && section.imageCorrect && images[section.imageCorrect] && images[section.imageCorrect].dataUri ? images[section.imageCorrect] : null;
    if (twinW && twinC) {
      const half = (im, mark, cls, lbl) => `<div class="tb-half ${cls}"><div class="tb-mark">${mark}</div><img src="${im.dataUri}" alt="${esc(cleanHeading(im.label || ''))}">${lbl ? `<div class="tb-label">${esc(cleanHeading(lbl))}</div>` : ''}</div>`;
      const fig = `<div class="d-twin-board">${half(twinW, '✗', 'tb-wrong', section.labelWrong)}<div class="tb-divider"></div>${half(twinC, '✓', 'tb-correct', section.labelCorrect)}</div>`;
      return `<section class="section${idCls}">${head}<div class="panel has-twin-board" style="border-color:var(${accent}-soft)"><div class="ii-body">${body}</div>${fig}</div></section>`;
    }
    // Code-drawn exact-math figure (fraction grids): parts/shading/label are
    // parameters, so the mathematics is pixel-exact by construction.
    if (!mg && section.codeFigure && section.codeFigure.kind === 'fraction-grid') {
      const cf = section.codeFigure;
      const fig = `<div class="d-inline-img d-code-fig">${fractionGridSvg(cf)}${cf.label ? `<div class="cf-label">${esc(cf.label)}</div>` : ''}${cf.caption ? `<div class="cap">${esc(cleanHeading(cf.caption))}</div>` : ''}</div>`;
      return `<section class="section${idCls}">${head}<div class="panel has-inline-img" style="border-color:var(${accent}-soft)"><div class="ii-body">${body}</div>${fig}</div></section>`;
    }
    const inlineIm = !mg && section.image && images[section.image] && images[section.image].dataUri ? images[section.image] : null;
    if (inlineIm) {
      // Labels are ALWAYS code-rendered on the image: use the model's overlay spec
      // when it gave one, otherwise derive a chip from the figure's own label so the
      // guarantee never depends on the model emitting the optional field.
      const lbl = cleanHeading(inlineIm.label || '');
      const ovs = (section.overlays || inlineIm.overlays
        || (lbl ? [{ text: lbl, pos: 'bottom-right', kind: /[٠-٩0-9]\s*\/\s*[٠-٩0-9]/.test(lbl) ? 'fraction' : 'chip' }] : []));
      const capBelow = !(ovs.length && ovs.some((o) => o.text === lbl));
      const ovHtml = ovs.map((o) => {
        const frac = o.kind === 'fraction' && /\//.test(o.text);
        const inner = frac ? `<span class="fr-n">${esc(o.text.split('/')[0])}</span><span class="fr-b"></span><span class="fr-d">${esc(o.text.split('/')[1])}</span>` : esc(o.text);
        return `<div class="ov ov-${o.pos} ov-${o.kind === 'fraction' ? 'fraction' : 'chip'}">${inner}</div>`;
      }).join('');
      const fig = `<div class="d-inline-img${ovHtml ? ' has-ov' : ''}"><div class="ov-wrap"><img src="${inlineIm.dataUri}" alt="${esc(lbl)}">${ovHtml}</div>${lbl && capBelow ? `<div class="cap">${esc(lbl)}</div>` : ''}</div>`;
      return `<section class="section${idCls}">${head}<div class="panel has-inline-img" style="border-color:var(${accent}-soft)"><div class="ii-body">${body}</div>${fig}</div></section>`;
    }
    const charId = hasContentImages ? null : pickCharacter(section, cast, rot, used);
    if (charId) {
      used.add(charId);
      const side = placed % 2 === 0 ? 'left' : 'right';
      placed++;
      const { h, w } = charSize(section, charId);
      const fig = `<div class="char-fig ${side}" style="width:${w}px"><img src="${cast[charId]}" alt="" style="max-height:${h}px"></div>`;
      const inner = side === 'left' ? `${fig}<div class="char-body">${body}</div>` : `<div class="char-body">${body}</div>${fig}`;
      return `<section class="section${idCls}">${head}<div class="panel has-char" style="border-color:var(${accent}-soft)">${inner}</div></section>`;
    }
    return `<section class="section${idCls}">${head}<div class="panel" style="border-color:var(${accent}-soft)">${body}</div></section>`;
  }).join('');

  // Safety net (R12): any generated image not shown by an images section is
  // appended, so a declared image is never silently missing from the render.
  const leftover = Object.keys(images).filter((id) => images[id] && images[id].dataUri && !referenced.has(id));
  let extra = '';
  if (leftover.length) {
    const body2 = renderBody({ type: 'images', imageIds: leftover }, accentFor((content.sections || []).length), images);
    if (body2) extra = `<section class="section"><div class="panel">${body2}</div></section>`;
  }

  // Multigrade legend — "what the symbols mean" (only when there is duo content to explain).
  const legend = (mg && /class="d-duo"/.test(sections))
    ? `<div class="mg-legend">`
      + `<span class="li"><span class="dot fill"></span>Teacher is here</span>`
      + `<span class="li"><span class="dot"></span>This class works on its own</span>`
      + `<span class="li"><span class="sw" style="background:var(--g-a)"></span>${esc(cleanHeading(meta.gradeA || 'Grade A'))}</span>`
      + `<span class="li"><span class="sw" style="background:var(--g-b)"></span>${esc(cleanHeading(meta.gradeB || 'Grade B'))}</span>`
      + `</div>`
    : '';
  const footer = meta.footer ? `<div class="lp-footer">${richText(String(meta.footer), {})}</div>` : '';
  const body = `<div class="body">${legend}${sections}${extra}</div>${footer}`;
  // KaTeX-rendered math needs its stylesheet; MathJax output is self-contained SVG.
  const headCss = /class="katex"/.test(body) ? katexCss() : '';
  return { headerHtml, bodyHtml: body, headCss };
}

module.exports = { renderDecorativeLesson };
