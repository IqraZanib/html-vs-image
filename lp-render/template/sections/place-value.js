'use strict';
const { esc } = require('../shell');
const { sectionShell } = require('./index');

// Hand-drawn base-ten blocks (deterministic SVG — exact, never AI/photo).
function hundredFlat() {
  let g = '';
  for (let i = 1; i < 10; i++) {
    g += `<line x1="${i * 4}" y1="0" x2="${i * 4}" y2="40" stroke="#1e3a8a" stroke-width="0.5"/>`;
    g += `<line x1="0" y1="${i * 4}" x2="40" y2="${i * 4}" stroke="#1e3a8a" stroke-width="0.5"/>`;
  }
  return `<svg width="40" height="40" viewBox="0 0 40 40" style="display:block"><rect width="40" height="40" fill="#3b82f6" stroke="#1e40af" stroke-width="1.5"/>${g}</svg>`;
}
function tenRod() {
  let g = '';
  for (let i = 1; i < 10; i++) g += `<line x1="0" y1="${i * 4}" x2="9" y2="${i * 4}" stroke="#8a6d00" stroke-width="0.5"/>`;
  return `<svg width="9" height="40" viewBox="0 0 9 40" style="display:block"><rect width="9" height="40" fill="#f5c518" stroke="#b8860b" stroke-width="1.2"/>${g}</svg>`;
}
function oneCube() {
  return `<svg width="10" height="10" viewBox="0 0 10 10" style="display:block"><rect width="10" height="10" fill="#ef4444" stroke="#991b1b" stroke-width="1"/></svg>`;
}

// Place columns: base-ten-block styles for H/T/O; all seven carry a place value
// and colour so the disc style can render Ones … Millions.
const COLS = {
  M:   { label: 'Millions',          place: 1000000, color: '#7c3aed', gap: '4px' },
  HTh: { label: 'Hundred Thousands', place: 100000,  color: '#2563eb', gap: '4px' },
  TTh: { label: 'Ten Thousands',     place: 10000,   color: '#0891b2', gap: '4px' },
  Th:  { label: 'Thousands',         place: 1000,    color: '#059669', gap: '4px' },
  H:   { label: 'Hundreds',          place: 100,     color: '#3b82f6', make: hundredFlat, gap: '4px' },
  T:   { label: 'Tens',              place: 10,      color: '#d99e00', make: tenRod, gap: '5px' },
  O:   { label: 'Ones',              place: 1,       color: '#ef4444', make: oneCube, gap: '4px' },
};
const MAX_ITEMS = 30; // keep a column readable

function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function digitFor(value, col) {
  const v = Math.max(0, Math.floor(Number(value) || 0));
  const m = COLS[col];
  return m ? Math.floor(v / m.place) % 10 : 0;
}

function blockCol(col, n) {
  const m = COLS[col];
  const items = Array.from({ length: Math.min(n, MAX_ITEMS) }, () => m.make()).join('');
  return `<div class="pv-col"><div class="pv-h" style="background:${m.color}">${esc(m.label)}</div>`
    + `<div class="pv-blocks" style="gap:${m.gap};${col === 'O' ? 'flex-wrap:wrap;max-width:64px;align-content:flex-start' : ''}">${items || '<span class="pv-empty">0</span>'}</div>`
    + `<div class="pv-d">${esc(String(n))}</div></div>`;
}
function discCol(col, n) {
  const m = COLS[col];
  const discs = Array.from({ length: Math.min(n, MAX_ITEMS) }, () => `<span class="pv-disc" style="background:${m.color}"></span>`).join('');
  return `<div class="pv-col disc"><div class="pv-h dh" style="background:${m.color}">${esc(m.label)}</div>`
    + `<div class="pv-discs">${discs || '<span class="pv-empty">0</span>'}</div>`
    + `<div class="pv-d">${esc(String(n))}</div></div>`;
}

// Standard expanded form (non-zero terms), e.g. 5,000,000 + 200,000 + … = 5,234,678
function expandedForm(value, cols) {
  const terms = cols.map((c) => {
    const m = COLS[c]; if (!m) return null;
    const t = digitFor(value, c) * m.place;
    return t > 0 ? fmt(t) : null;
  }).filter(Boolean);
  if (!terms.length) return '';
  return `${terms.join(' + ')} = <b>${fmt(Math.max(0, Math.floor(Number(value) || 0)))}</b>`;
}

function table(num, style) {
  const cols = (Array.isArray(num.columns) && num.columns.length ? num.columns : ['H', 'T', 'O'])
    .filter((c) => COLS[c]);
  const cell = style === 'discs' ? discCol : blockCol;
  const cells = cols.map((c) => cell(c, digitFor(num.value, c))).join('');
  const eq = (style === 'discs' || num.expanded) ? `<div class="pv-eq">${expandedForm(num.value, cols)}</div>` : '';
  const cap = num.caption ? `<div class="pv-cap">${esc(num.caption)}</div>` : '';
  return `<div class="pv-wrap${style === 'discs' ? ' discs' : ''}"><div class="pv-table">${cells}</div>${cap}${eq}</div>`;
}

module.exports = function placeValue(section, ctx) {
  const style = section.style === 'discs' ? 'discs' : 'blocks';
  const nums = Array.isArray(section.numbers) ? section.numbers : [];
  const legend = style === 'discs'
    ? '<div class="pv-legend">Each <span style="display:inline-block;width:15px;height:15px;border-radius:50%;background:#2563eb;vertical-align:middle"></span> is one unit of its column (e.g. one hundred thousand = 100,000).</div>'
    : '<div class="pv-legend">'
      + '<span><span class="pv-sw" style="background:#3b82f6"></span>hundred (100)</span>'
      + '<span><span class="pv-sw" style="background:#f5c518"></span>ten (10)</span>'
      + '<span><span class="pv-sw" style="background:#ef4444"></span>one (1)</span></div>';
  const inner = `<div class="panel"><div class="pv-grid">${nums.map((n) => table(n, style)).join('')}</div>${legend}</div>`;
  return sectionShell(section, 'blackboard', inner, ctx);
};
