'use strict';
// Decorative SVG motifs — visual only, they carry no lesson meaning (RULES R3).

const star = (c = '#ffd34e') =>
  `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 2l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.8 6.1 20l1.3-6.6L2.5 8.9l6.6-.8z"/></svg>`;
const sparkle = (c = '#fff') =>
  `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 0c.6 5.4 2.6 7.4 8 8-5.4.6-7.4 2.6-8 8-.6-5.4-2.6-7.4-8-8 5.4-.6 7.4-2.6 8-8z"/></svg>`;
const butterfly = (a = '#ff8ec2', b = '#7cc7ff') =>
  `<svg viewBox="0 0 40 32"><path d="M20 16c-4-10-12-14-17-9-4 4 0 12 8 13 5 .6 7-1 9-4z" fill="${a}"/><path d="M20 16c4-10 12-14 17-9 4 4 0 12-8 13-5 .6-7-1-9-4z" fill="${b}"/><path d="M20 6v20" stroke="#5a4633" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="5" r="2.4" fill="#5a4633"/></svg>`;
const leaf = (c = '#5bbf7a') =>
  `<svg viewBox="0 0 32 32" fill="${c}"><path d="M28 4C14 4 6 12 5 26c10-1 19-6 23-22z"/><path d="M9 24C13 16 20 10 26 8" stroke="#3f9a5c" stroke-width="1.6" fill="none"/></svg>`;
const cloud = (c = '#fff') =>
  `<svg viewBox="0 0 64 40" fill="${c}"><path d="M20 34a12 12 0 0 1 .6-24 15 15 0 0 1 28 3 10 10 0 0 1-2 21z"/></svg>`;

// A small, deterministic scatter of header motifs. Monochrome soft-white on the blue
// hero (UI/UX restraint — no rainbow of colours); reads as subtle frosted texture.
function headerMotifs() {
  const w = 'rgba(255,255,255,.9)'; const w2 = 'rgba(255,255,255,.6)';
  return (
    `<div class="deco deco-cloud c1">${cloud('rgba(255,255,255,.85)')}</div>` +
    `<div class="deco deco-star s1">${star(w)}</div>` +
    `<div class="deco deco-bfly b1">${star(w2)}</div>` +
    `<div class="deco deco-spark k1">${sparkle(w)}</div><div class="deco deco-spark k2">${sparkle(w2)}</div>` +
    `<div class="deco deco-leaf l1">${sparkle(w2)}</div>`
  );
}

// Section headings stay clean — no decorative twinkle clutter next to the title.
function headTwinkle() { return ''; }

module.exports = { star, sparkle, butterfly, leaf, cloud, headerMotifs, headTwinkle };
