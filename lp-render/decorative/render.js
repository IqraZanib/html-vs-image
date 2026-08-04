'use strict';
// Generic, content-driven decorative renderer (RULES R1–R7).
// It ONLY styles what the content JSON gives it. It never rewords, summarizes,
// translates, or invents lesson content. Every string rendered is escaped
// content taken verbatim from the JSON.
const { esc } = require('../template/shell');
const { icon, hasIcon } = require('../template/icons');
const { headerMotifs, headTwinkle, sparkle } = require('./motifs');
const { accentFor } = require('./theme');

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const mark = (kind, i) => (kind === 'alpha' ? ALPHA[i] + ')' : kind === 'num' ? String(i + 1) : '•');

function disc(accent, section, i) {
  const inner = section.icon && hasIcon(section.icon) ? icon(section.icon, 24) : sparkle('#fff');
  return `<div class="s-disc" style="background:var(${accent})">${inner}</div>`;
}

function sectionHead(accent, section, i) {
  const time = section.time ? `<div class="s-time">${esc(section.time)}</div>` : '';
  const twinkle = `<div class="s-deco">${headTwinkle(i)}</div>`;
  return `<div class="s-head">${disc(accent, section, i)}<div class="s-title">${esc(section.heading || '')}</div>${twinkle}${time}</div>`;
}

function renderBody(section, accent, images) {
  const soft = `var(${accent}-soft)`;
  switch (section.type) {
    case 'bullets': {
      const km = section.marker || 'dot';
      const lis = (section.items || []).map((it, i) => {
        const tag = it.tag ? `<span class="d-tag" style="background:${soft};color:var(${accent})">${esc(it.tag)}</span>` : '';
        return `<li data-mark="${esc(mark(km, i))}" style="background:${soft}">${esc(it.text)}${tag}</li>`;
      }).join('');
      const lead = section.lead ? `<div class="d-lead">${esc(section.lead)}</div>` : '';
      return `${lead}<ul class="d-bullets" style="--m:var(${accent})">${lis}</ul>`;
    }
    case 'text':
      return `<div class="d-text">${esc(section.body || '')}</div>`;
    case 'note': {
      const nt = section.label ? `<span class="nt" style="color:var(${accent})">${esc(section.label)}</span>` : '';
      return `<div class="d-note" style="background:linear-gradient(90deg,${soft},#fff);border-inline-start:5px solid var(${accent})">${nt}${esc(section.body || '')}</div>`;
    }
    case 'chips':
      return `<div class="d-chips">${(section.items || []).map((c) => `<span class="d-chip" style="background:${soft};color:var(${accent})">${esc(c)}</span>`).join('')}</div>`;
    case 'steps':
      return `<div class="d-steps">${(section.items || []).map((s, i) => `<div class="d-step"><div class="n" style="background:var(${accent})">${i + 1}</div><div><div class="st-label">${esc(s.label || '')}</div><div class="st-body">${esc(s.body || '')}</div></div></div>`).join('')}</div>`;
    case 'qa': {
      const km = section.marker || 'alpha';
      return `<div class="d-qa">${(section.items || []).map((qa, i) => `<div class="d-qc"><div class="d-q" data-mark="${esc(mark(km, i))}" style="color:var(${accent})">${esc(qa.q)}</div>${qa.a ? `<div class="d-a">${esc(qa.a)}</div>` : ''}</div>`).join('')}</div>`;
    }
    case 'fields':
      return `<div class="d-fields">${(section.items || []).map((f) => `<div class="d-field"><b>${esc(f.label)}</b>${esc(f.value || '')}</div>`).join('')}</div>`;
    case 'images': {
      const cards = (section.imageIds || [])
        .map((id) => images[id])
        .filter((im) => im && im.dataUri)
        .map((im) => `<div class="d-img${im.cover ? ' cover' : ''}"><img src="${im.dataUri}" alt="${esc(im.label || '')}"><div class="cap">${esc(im.label || '')}</div></div>`);
      if (!cards.length) return '';
      const n = Math.min(cards.length, 3);
      return `<div class="d-imgrow n${n}">${cards.join('')}</div>`;
    }
    default:
      return `<div class="d-text">${esc(section.body || '')}</div>`;
  }
}

const TEACHER_POOL = ['teacher', 'teacher_coral', 'teacher_purple'];
const first = (ids, cast) => ids.find((x) => cast[x]) || null;

// Decide which cast character (if any) accompanies a section that has no relevant
// real image (RULES R8, R9). Presentation varies by section: a teacher at the
// board for step-by-step development, students sitting and listening for the
// intro, a discussing pair for activities, simple pointing figures elsewhere —
// and repeated teachers rotate through colour variants so they never look the same.
function pickCharacter(section, cast, rot) {
  if (section.character === false) return null;
  if (typeof section.character === 'string') return cast[section.character] ? section.character : null;
  if (section.type === 'images' || section.type === 'fields' || section.type === 'chips') return null;
  const h = String(section.heading || '');
  const isActivity = /activit|practic|experiment|partner|group|discuss/i.test(h);
  const eligible = section.type === 'text' || section.type === 'note' || section.type === 'steps' ||
    (section.type === 'bullets' && /activit|practic|experiment|assess|quiz|exam|partner|group|discuss/i.test(h));
  if (!eligible) return null;
  const teacher = () => { const p = TEACHER_POOL.filter((x) => cast[x]); return p.length ? p[(rot.t++) % p.length] : null; };
  let id = null;
  if (isActivity) id = first(['students_pair', 'students_sitting'], cast);
  else if (section.type === 'steps' || /develop|explanation|board|model answer|demonstrat/i.test(h)) id = cast.teacher_board ? 'teacher_board' : teacher();
  else if (/introduc/i.test(h)) id = cast.students_sitting ? 'students_sitting' : teacher();
  else if (/assess|quiz|exam/i.test(h)) id = first(['boy', 'girl', 'students_sitting'], cast);
  else { const opt = ['girl', 'boy'][(rot.n++) % 2]; id = cast[opt] ? opt : teacher(); }
  return id || first(['teacher', 'girl', 'boy', 'students_pair'], cast);
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

function renderDecorativeLesson(content, images = {}, cast = {}) {
  const meta = content.meta || {};
  const chips = (meta.chips || []).map((c) => `<span><b>${esc(c.label)}</b>${esc(c.value)}</span>`).join('');
  const headerHtml =
    `<div class="lp-header">${headerMotifs()}` +
    `<h1>${esc(meta.title || '')}</h1>` +
    (meta.subtitle ? `<div class="sub">${esc(meta.subtitle)}</div>` : '') +
    (chips ? `<div class="meta">${chips}</div>` : '') +
    `</div>`;

  let placed = 0;
  const rot = { n: 0, t: 0 };
  const sections = (content.sections || []).map((section, i) => {
    const accent = accentFor(i);
    const body = renderBody(section, accent, images);
    if (body === '') return '';
    const charId = pickCharacter(section, cast, rot);
    if (charId) {
      const side = placed % 2 === 0 ? 'left' : 'right';
      placed++;
      const { h, w } = charSize(section, charId);
      const fig = `<div class="char-fig ${side}" style="width:${w}px"><img src="${cast[charId]}" alt="" style="max-height:${h}px"></div>`;
      const inner = side === 'left' ? `${fig}<div class="char-body">${body}</div>` : `<div class="char-body">${body}</div>${fig}`;
      return `<section class="section">${sectionHead(accent, section, i)}<div class="panel has-char" style="--acc:var(${accent})">${inner}</div></section>`;
    }
    return `<section class="section">${sectionHead(accent, section, i)}<div class="panel" style="--acc:var(${accent})">${body}</div></section>`;
  }).join('');

  return { headerHtml, bodyHtml: `<div class="body">${sections}</div>` };
}

module.exports = { renderDecorativeLesson };
