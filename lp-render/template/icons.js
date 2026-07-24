'use strict';

// name -> inner SVG markup (viewBox 0 0 64 64)
const BODY = {
  // --- section-type icons ---
  target: `<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="5"/><circle cx="32" cy="32" r="12" fill="none" stroke="#fff" stroke-width="5"/><circle cx="32" cy="32" r="4" fill="#fff"/>`,
  toolbox: `<rect x="10" y="24" width="44" height="26" rx="4" fill="#fff"/><rect x="22" y="16" width="20" height="9" rx="3" fill="none" stroke="#fff" stroke-width="4"/><rect x="10" y="33" width="44" height="6" fill="rgba(0,0,0,.15)"/>`,
  rocket: `<path d="M32 6c9 6 12 16 12 26l-6 8H26l-6-8C20 22 23 12 32 6z" fill="#fff"/><circle cx="32" cy="26" r="5" fill="rgba(0,0,0,.2)"/><path d="M26 40l-6 12 10-5M38 40l6 12-10-5" fill="#fff"/>`,
  lightbulb: `<circle cx="32" cy="26" r="16" fill="#fff"/><rect x="25" y="40" width="14" height="8" rx="2" fill="#fff"/><rect x="27" y="50" width="10" height="4" rx="2" fill="#fff"/>`,
  pencil: `<path d="M14 50l4-12 26-26 8 8-26 26z" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/><path d="M40 12l8 8" stroke="#fff" stroke-width="3.5"/><path d="M14 50l4-12 8 8z" fill="#fff"/>`,
  checklist: `<rect x="14" y="10" width="36" height="46" rx="4" fill="none" stroke="#fff" stroke-width="3.5"/><path d="M20 24l4 4 7-8M20 38l4 4 7-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M38 24h8M38 38h8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  ladder: `<path d="M22 8v48M42 8v48M22 20h20M22 32h20M22 44h20" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
  board: `<rect x="8" y="10" width="48" height="36" rx="4" fill="#2f6b4f"/><rect x="8" y="10" width="48" height="36" rx="4" fill="none" stroke="#fff" stroke-width="4"/><path d="M18 22h20M18 30h26M18 38h14" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><rect x="24" y="48" width="16" height="6" fill="#fff"/>`,
  // --- item icons ---
  person: `<circle cx="32" cy="22" r="11" fill="#fff"/><path d="M14 54c0-11 8-16 18-16s18 5 18 16z" fill="#fff"/>`,
  cake: `<path d="M16 34h32l-4 18a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" fill="#ff9a8b"/><path d="M14 34c0-9 8-14 18-14s18 5 18 14z" fill="#fff3c9" stroke="#f0a500" stroke-width="3"/><circle cx="24" cy="30" r="3" fill="#ff6f61"/><circle cx="34" cy="27" r="3" fill="#9b6bff"/><circle cx="42" cy="31" r="3" fill="#2fd0a6"/><rect x="30" y="8" width="4" height="12" fill="#5ec6ff"/><path d="M32 2c3 3 3 6 0 8-3-2-3-5 0-8z" fill="#ffcf33"/>`,
  family: `<circle cx="16" cy="18" r="8" fill="#fff"/><path d="M8 50c0-9 6-13 12-13s12 4 12 13z" fill="#fff"/><circle cx="48" cy="18" r="8" fill="#fff"/><path d="M32 50c0-9 6-13 12-13s12 4 12 13z" fill="#fff"/><circle cx="32" cy="34" r="6" fill="#fff"/><path d="M23 54c0-6 4-9 9-9s9 3 9 9z" fill="#fff"/>`,
  heart: `<path d="M32 54S8 40 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 16-24 30-24 30z" fill="#ff6f61"/><path d="M20 26a8 8 0 0 1 8-6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  school: `<rect x="14" y="30" width="36" height="24" rx="3" fill="#2fd0a6"/><path d="M10 30L32 14l22 16z" fill="#ff6f61"/><rect x="28" y="40" width="8" height="14" fill="#fff"/><rect x="18" y="35" width="7" height="7" rx="1.5" fill="#fff"/><rect x="39" y="35" width="7" height="7" rx="1.5" fill="#fff"/><rect x="31" y="6" width="2.5" height="9" fill="#33334d"/><path d="M33.5 6l8 3-8 3z" fill="#ffcf33"/>`,
  nametag: `<rect x="8" y="16" width="48" height="34" rx="7" fill="#5ec6ff"/><rect x="8" y="16" width="48" height="11" rx="6" fill="#3aa8e8"/><circle cx="25" cy="33" r="5" fill="#fff"/><path d="M18 42a7 7 0 0 1 14 0" fill="#fff"/><line x1="38" y1="32" x2="50" y2="32" stroke="#fff" stroke-width="3" stroke-linecap="round"/><line x1="38" y1="40" x2="47" y2="40" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  apple: `<path d="M32 20c-4-6-14-6-18 0-5 8-1 26 6 32 3 3 5 3 8 1 3 2 5 2 8-1 7-6 11-24 6-32-4-6-14-6-18 0z" fill="#ff6f61"/><rect x="30" y="10" width="3" height="10" rx="1.5" fill="#8a5a2b"/><path d="M33 14c5-4 9-2 9-2s-2 6-8 6z" fill="#2fd0a6"/>`,
  star: `<path d="M32 4l8 18 20 2-15 13 5 20-18-11-18 11 5-20L4 24l20-2z" fill="#ffcf33" stroke="#f0a500" stroke-width="3"/>`,
  thumbup: `<path d="M20 28h6v28h-6z" fill="#fff"/><path d="M28 28l4-14a4 4 0 0 1 8 0l-2 12h14a5 5 0 0 1 5 6l-4 18a6 6 0 0 1-6 5H28z" fill="#fff"/>`,
  thumbdown: `<path d="M44 36h-6V8h6z" fill="#fff"/><path d="M36 36l-4 14a4 4 0 0 1-8 0l2-12H12a5 5 0 0 1-5-6l4-18a6 6 0 0 1 6-5h19z" fill="#fff"/>`,
};

const ICON_NAMES = Object.keys(BODY);

function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(BODY, name);
}

function icon(name, size = 24) {
  if (!hasIcon(name)) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${BODY[name]}</svg>`;
}

module.exports = { icon, hasIcon, ICON_NAMES };
