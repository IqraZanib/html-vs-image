'use strict';
// Code-drawn icons and pictures for the grades 6–12 page (secondary.js). Every one is SVG drawn
// here, so a lesson costs nothing and needs no model. They are this page's own: the Grades 1–5
// page has its own set (primary-art.js), and neither imports the other, so a change to one design
// can never move the other.
//
// The style is a step up from the primary page's picture book: flat duotone icons in the approved
// design's colours, and one subject picture for the title card.
const r1 = (v) => Math.round(v * 10) / 10;
const ic = (body, cls = 'sic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

// colours of the approved design (measured from ICT's production page) and a few accents
const K = {
  navy: '#0B2545', navy2: '#13315C', teal: '#0F6A73', green: '#1F7A4D', purple: '#584A93', slate: '#5B6472',
  amber: '#F2A20C', coral: '#E0533F', sky: '#3B82C4', mint: '#2BB673', gold: '#F6C343', paper: '#FFF8E8',
};

const ICON = {
  // resource rows
  video: () => ic('<rect x="2" y="5" width="20" height="14" rx="3.5" fill="#E0533F"/><path d="M10 9.2v5.6l5-2.8z" fill="#fff"/>'),
  materials: () => ic('<rect x="3" y="8" width="18" height="12" rx="2.5" fill="#2BB673"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="#1F7A4D" stroke-width="2" fill="none"/><rect x="3" y="12" width="18" height="2.4" fill="#1F7A4D"/><rect x="10.5" y="11.2" width="3" height="4" rx="1" fill="#F6C343"/>'),
  pacing: () => ic('<circle cx="12" cy="13.5" r="8.5" fill="#3B82C4"/><circle cx="12" cy="13.5" r="6.4" fill="#fff"/><path d="M12 9.5v4l2.8 1.8" stroke="#13315C" stroke-width="2" stroke-linecap="round" fill="none"/><rect x="10" y="2.5" width="4" height="2.6" rx="1" fill="#13315C"/>'),
  key: () => ic('<circle cx="8" cy="9" r="5.2" fill="#F6C343"/><circle cx="8" cy="9" r="1.9" fill="#fff"/><path d="M11.8 12.6 20 20.8M16.2 17l2.4-2.4M18.4 19.2l2.4-2.4" stroke="#B07D06" stroke-width="2.6" stroke-linecap="round"/>'),
  target: () => ic('<circle cx="12" cy="12" r="9.5" fill="#F2A20C"/><circle cx="12" cy="12" r="6.6" fill="#fff"/><circle cx="12" cy="12" r="3.6" fill="#F2A20C"/><path d="M12 12l7.5-7.5M17 4.3h2.8v2.8" stroke="#0B2545" stroke-width="1.8" stroke-linecap="round" fill="none"/>'),
  // lesson path
  past: () => ic('<circle cx="12" cy="12" r="8" fill="#C9D4E6"/><path d="M8 12.3l2.6 2.6L16 9.4" stroke="#13315C" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  today: () => ic('<circle cx="12" cy="12" r="10" fill="#13315C"/><path d="M12 6.2l1.7 3.6 3.9.5-2.9 2.7.8 3.9L12 15l-3.5 1.9.8-3.9-2.9-2.7 3.9-.5z" fill="#F6C343"/>'),
  flag: () => ic('<path d="M6 21V3" stroke="#5B6472" stroke-width="2" stroke-linecap="round"/><path d="M6.8 3.6h11.4l-2.6 3.7 2.6 3.7H6.8z" fill="#F2A20C"/>'),
  // teaching blocks
  warmup: () => ic('<path d="M13 2 5 13.5h5.5L9 22l9-12.5h-5.5z" fill="#F6C343" stroke="#B07D06" stroke-width="1.2" stroke-linejoin="round"/>'),
  question: () => ic('<path fill="#F6C343" d="M12 2.5a9 9 0 0 0-7.7 13.6L3 21l4.9-1.3A9 9 0 1 0 12 2.5z"/><path d="M9.5 9.3a2.6 2.6 0 1 1 3.8 2.3c-.8.4-1.3 1-1.3 1.8v.4" stroke="#0B2545" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="12" cy="16.6" r="1.2" fill="#0B2545"/>'),
  eye: () => ic('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="#fff" stroke="#F6C343" stroke-width="1.8"/><circle cx="12" cy="12" r="3.4" fill="#F6C343"/><circle cx="12" cy="12" r="1.4" fill="#0B2545"/>'),
  board: () => ic('<rect x="2" y="3" width="20" height="14" rx="2" fill="#2F5D50" stroke="#B88A5E" stroke-width="1.6"/><path d="M5.5 8h7M5.5 11.5h5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M8 17l-2 4.5M16 17l2 4.5" stroke="#B88A5E" stroke-width="1.8" stroke-linecap="round"/><rect x="15" y="12" width="4" height="2" rx=".8" fill="#fff"/>'),
  book: () => ic('<path d="M12 6.2C9.8 4.6 6.6 4.2 2.5 4.8v14c4.1-.6 7.3-.2 9.5 1.4z" fill="#3B82C4"/><path d="M12 6.2c2.2-1.6 5.4-2 9.5-1.4v14c-4.1-.6-7.3-.2-9.5 1.4z" fill="#13315C"/><path d="M5 8.5c2-.3 3.7 0 5 .7M5 11.5c2-.3 3.7 0 5 .7M14 9.2c1.3-.7 3-1 5-.7M14 12.2c1.3-.7 3-1 5-.7" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>'),
  bulb: () => ic('<path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.7.5 1.1 1.3 1.1 2.2v.5h5.4v-.5c0-.9.4-1.7 1.1-2.2A6.5 6.5 0 0 0 12 2.5z" fill="#F6C343"/><rect x="9.3" y="18" width="5.4" height="1.8" rx=".7" fill="#5B6472"/><rect x="10" y="20.4" width="4" height="1.6" rx=".7" fill="#5B6472"/><path d="M10.3 9.5l1.7 2 1.7-2" stroke="#B07D06" stroke-width="1.4" fill="none"/>'),
  teach: () => ic('<rect x="2" y="3" width="15" height="11" rx="1.5" fill="#2F5D50" stroke="#B88A5E" stroke-width="1.5"/><path d="M5 7h6M5 10h4" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><circle cx="19" cy="9" r="2.6" fill="#E0A97E"/><path d="M15.5 21c0-4 1.5-8 3.5-8s3.5 4 3.5 8z" fill="#F2A20C"/><path d="M17 14l-4-3" stroke="#F2A20C" stroke-width="1.8" stroke-linecap="round"/>'),
  group: () => ic('<circle cx="7.5" cy="8" r="3" fill="#E0A97E"/><circle cx="16.5" cy="8" r="3" fill="#C98C5E"/><path d="M2.5 20c0-4.5 2.2-7.5 5-7.5s5 3 5 7.5z" fill="#E0533F"/><path d="M11.5 20c0-4.5 2.2-7.5 5-7.5s5 3 5 7.5z" fill="#3B82C4"/>'),
  pencil: () => ic('<g transform="rotate(45 12 12)"><rect x="9" y="1.5" width="6" height="16" rx="1" fill="#F6C343"/><rect x="9" y="1.5" width="6" height="3.5" rx="1" fill="#E0533F"/><path d="M9 17.5h6l-3 5z" fill="#F1C27D"/><path d="M11 20.8h2l-1 1.7z" fill="#0B2545"/></g>'),
  warn: () => ic('<path fill="#F6C343" stroke="#B4531F" stroke-width="1.4" stroke-linejoin="round" d="M12 2.5 1.8 20.5h20.4z"/><rect x="11" y="8.5" width="2" height="6.5" rx="1" fill="#7A3410"/><circle cx="12" cy="17.6" r="1.25" fill="#7A3410"/>'),
  cross: () => ic('<circle cx="12" cy="12" r="10" fill="#E0533F"/><path d="M8.3 8.3l7.4 7.4M15.7 8.3l-7.4 7.4" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>'),
  tick: () => ic('<circle cx="12" cy="12" r="10" fill="#2BB673"/><path d="M7 12.4l3.3 3.3L17 9" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  star: () => ic('<path fill="#F6C343" stroke="#B07D06" stroke-width="1.2" stroke-linejoin="round" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>'),
  help: () => ic('<circle cx="12" cy="12" r="10" fill="#3B82C4"/><path d="M9.2 9.2a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1v.6" stroke="#fff" stroke-width="2.3" fill="none" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.4" fill="#fff"/>'),
  barrier: () => ic('<rect x="2" y="8" width="20" height="6" rx="1.5" fill="#fff" stroke="#584A93" stroke-width="1.6"/><path d="M6 8l-3 6M11 8l-3 6M16 8l-3 6M21 8l-3 6" stroke="#584A93" stroke-width="2.2"/><path d="M5 14v6M19 14v6" stroke="#5B6472" stroke-width="2" stroke-linecap="round"/>'),
  rocket: () => ic('<path d="M12 2c3.8 2.4 5.4 6.6 4.8 11.4L12 17l-4.8-3.6C6.6 8.6 8.2 4.4 12 2z" fill="#3B82C4"/><circle cx="12" cy="8.6" r="2" fill="#fff"/><path d="M7.2 13.4 4 15.8l1.4 3.4 3-2.2M16.8 13.4l3.2 2.4-1.4 3.4-3-2.2" fill="#E0533F"/><path d="M10 18.5c.6 2 1.2 3 2 3.5.8-.5 1.4-1.5 2-3.5" fill="#F6C343"/>'),
  ticket: () => ic('<path d="M3 6.5h18v3a2.5 2.5 0 0 0 0 5v3H3v-3a2.5 2.5 0 0 0 0-5z" fill="#2BB673"/><path d="M15 6.5v11" stroke="#fff" stroke-width="1.4" stroke-dasharray="1.6 1.6"/><path d="M6.5 12l1.6 1.6 3-3.2" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  medal: () => ic('<path d="M7 2h4l2 6H9zM13 2h4l-2 6h-4z" fill="#E0533F"/><circle cx="12" cy="15" r="6.5" fill="#F6C343"/><circle cx="12" cy="15" r="4.4" fill="#FDE29A"/><path d="M12 12.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="#B07D06"/>'),
  redo: () => ic('<path d="M20 12a8 8 0 1 1-2.4-5.7" stroke="#E0533F" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M19.8 3v4.6h-4.6z" fill="#E0533F"/>'),
  house: () => ic('<path fill="#E0533F" d="M12 2.5 1.5 11.5h3L12 5l7.5 6.5h3z"/><path fill="#F6C343" d="M4.5 11.5 12 5l7.5 6.5V21h-15z"/><rect x="10" y="14" width="4" height="7" rx="1" fill="#8A5A3B"/><rect x="6" y="12.5" width="3" height="3" rx=".6" fill="#3B82C4"/><rect x="15" y="12.5" width="3" height="3" rx=".6" fill="#3B82C4"/>'),
  clipboard: () => ic('<rect x="4" y="4" width="16" height="18" rx="2.5" fill="#fff" stroke="#F6C343" stroke-width="1.8"/><rect x="8" y="2" width="8" height="4" rx="1.5" fill="#F6C343"/><path d="M7.5 11l1.5 1.5 3-3M7.5 16.5l1.5 1.5 3-3" stroke="#2BB673" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M13.5 11h3.5M13.5 16.5h3.5" stroke="#C9D4E6" stroke-width="1.8" stroke-linecap="round"/>'),
  diagram: () => ic('<rect x="2" y="3" width="8" height="6" rx="1.5" fill="#3B82C4"/><rect x="14" y="3" width="8" height="6" rx="1.5" fill="#2BB673"/><rect x="8" y="15" width="8" height="6" rx="1.5" fill="#F2A20C"/><path d="M6 9v3h12V9M12 12v3" stroke="#5B6472" stroke-width="1.6" fill="none"/>'),
  exam: () => ic('<rect x="4" y="2.5" width="16" height="19" rx="2" fill="#fff" stroke="#13315C" stroke-width="1.6"/><path d="M7.5 7h9M7.5 10.5h9M7.5 14h5" stroke="#13315C" stroke-width="1.6" stroke-linecap="round"/><circle cx="16.5" cy="17" r="3.2" fill="#2BB673"/><path d="M15 17l1 1 2-2" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>'),
  mic: () => ic('<rect x="8.5" y="2" width="7" height="12.5" rx="3.5" fill="#F6C343"/><path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21.5h7"/>'),
  chat: () => ic('<path fill="#2BB673" d="M12 2.8a9.2 9.2 0 0 0-8 13.7L2.8 21.2l4.8-1.2A9.2 9.2 0 1 0 12 2.8z"/><path fill="#fff" d="M8.6 7.4c.3-.3.8-.3 1 .1l1 1.9c.2.3.1.7-.2 1l-.6.6c.6 1.3 1.6 2.3 2.9 2.9l.6-.6c.3-.3.7-.4 1-.2l1.9 1c.4.2.4.7.1 1l-.9 1c-.6.6-1.6.7-2.4.3-2.2-1.1-3.9-2.8-5-5-.4-.8-.3-1.8.3-2.4l.8-.8z"/>'),
  reply: () => ic('<path fill="#3B82C4" d="M10 5 3 11.5l7 6.5v-4c5 0 8.5 1.5 11 5-1-5.5-4.5-10-11-11V5z"/>'),
  coach: () => ic('<circle cx="12" cy="12" r="10" fill="#F6C343"/><path d="M8 10.5h8M8 13.5h5" stroke="#0B2545" stroke-width="1.8" stroke-linecap="round"/><path d="M12 22l-2.5-3h5z" fill="#F6C343"/>'),
};

// the stage bars' pictures, on a white disc
const STAGE_ICON = {
  introduction: () => ic('<circle cx="12" cy="12" r="5" fill="#F6C343"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="#F2A20C" stroke-width="2" stroke-linecap="round"/>'),
  development: () => ICON.bulb(),
  activity: () => ICON.group(),
  conclusion: () => ICON.ticket(),
  homework: () => ICON.house(),
};
const stageIcon = (s) => (STAGE_ICON[s] ? STAGE_ICON[s]() : '');

// ── THE SUBJECT PICTURE for the title card ────────────────────────────────────────────────
// One flat picture per subject family, in a round frame. Chosen from the lesson's subject, never
// from its content, so it can never say something the lesson does not.
const svg = (body, label) => `<svg class="ssubj" viewBox="0 0 120 120" role="img" aria-label="${label}">${body}</svg>`;
const bg = (c1, c2) => `<defs><linearGradient id="sbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="120" height="120" fill="url(#sbg)"/>`;
const SUBJECT = {
  maths: () => svg(bg('#FFF3D6', '#FFE3A3')
    + '<path d="M18 92 L62 92 L18 40 Z" fill="#3B82C4" opacity=".9"/><path d="M26 84 L46 84 L26 60 Z" fill="#FFF3D6"/>'
    + '<path d="M58 88a30 30 0 0 1 48 0z" fill="#2BB673" opacity=".85"/><path d="M82 88V62" stroke="#0B2545" stroke-width="2"/>'
    + '<text x="78" y="44" font-family="Inter,sans-serif" font-weight="800" font-size="26" fill="#E0533F">π</text>'
    + '<text x="52" y="30" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#13315C">Σ</text>'
    + '<text x="92" y="30" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#584A93">√</text>'
    + '<text x="30" y="30" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#F2A20C">+</text>', 'mathematics'),
  english: () => svg(bg('#E6F0FF', '#CFE0FB')
    + '<path d="M60 36c-12-8-28-9-44-6v58c16-3 32-2 44 6z" fill="#fff" stroke="#3B82C4" stroke-width="3"/>'
    + '<path d="M60 36c12-8 28-9 44-6v58c-16-3-32-2-44 6z" fill="#fff" stroke="#3B82C4" stroke-width="3"/><path d="M60 36v58" stroke="#3B82C4" stroke-width="3"/>'
    + '<text x="24" y="66" font-family="Inter,sans-serif" font-weight="800" font-size="24" fill="#E0533F">Aa</text>'
    + '<path d="M68 52h28M68 62h24M68 72h28M24 78h28" stroke="#9DB6D9" stroke-width="3" stroke-linecap="round"/>'
    + '<text x="78" y="28" font-family="Georgia,serif" font-weight="800" font-size="34" fill="#F2A20C">“</text>', 'English'),
  urdu: () => svg(bg('#EAF7EF', '#CDEFD9')
    + '<path d="M30 96h46c4 0 6-3 6-6V70c0-4-3-6-6-6H30c-3 0-6 2-6 6v20c0 3 3 6 6 6z" fill="#13315C"/><ellipse cx="53" cy="64" rx="26" ry="6" fill="#2F5D50"/>'
    + '<path d="M88 20 64 70" stroke="#8A5A3B" stroke-width="5" stroke-linecap="round"/><path d="M64 70l-3 7 6-4z" fill="#0B2545"/>'
    + '<text x="78" y="60" font-family="\'Noto Nastaliq Urdu\',serif" font-size="24" fill="#1F7A4D">ب</text>'
    + '<text x="28" y="44" font-family="\'Noto Nastaliq Urdu\',serif" font-size="26" fill="#E0533F">ا</text>', 'Urdu'),
  science: () => svg(bg('#EAF7EF', '#D3F0E0')
    + '<path d="M50 22h20M54 22v28L32 92c-2 5 1 8 6 8h44c5 0 8-3 6-8L66 50V22" fill="#fff" stroke="#13315C" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M40 78h40l8 14c1 4-1 6-5 6H37c-4 0-6-2-5-6z" fill="#2BB673"/>'
    + '<circle cx="52" cy="70" r="4" fill="#fff" opacity=".8"/><circle cx="64" cy="62" r="3" fill="#fff" opacity=".8"/><circle cx="70" cy="74" r="3.5" fill="#fff" opacity=".8"/>'
    + '<path d="M86 30c10 2 14 12 10 22-10-2-14-12-10-22z" fill="#1F7A4D"/><path d="M88 32c3 6 5 12 6 18" stroke="#EAF7EF" stroke-width="1.6"/>', 'science'),
  chemistry: () => svg(bg('#F1ECFB', '#E0D6F7')
    + '<path d="M44 20h20M48 20v30L30 88c-2 6 1 10 7 10h34c6 0 9-4 7-10L60 50V20" fill="#fff" stroke="#584A93" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M36 76h36l6 12c1 5-2 8-6 8H36c-4 0-7-3-6-8z" fill="#3B82C4"/>'
    + '<circle cx="90" cy="34" r="8" fill="#E0533F"/><circle cx="102" cy="54" r="6" fill="#F6C343"/><circle cx="84" cy="58" r="6" fill="#2BB673"/>'
    + '<path d="M90 34l12 20M90 34l-6 24M84 58h18" stroke="#584A93" stroke-width="2.4"/>', 'chemistry'),
  physics: () => svg(bg('#E6F0FF', '#D2E3FB')
    + '<ellipse cx="60" cy="60" rx="40" ry="14" fill="none" stroke="#3B82C4" stroke-width="3"/>'
    + '<ellipse cx="60" cy="60" rx="40" ry="14" fill="none" stroke="#E0533F" stroke-width="3" transform="rotate(60 60 60)"/>'
    + '<ellipse cx="60" cy="60" rx="40" ry="14" fill="none" stroke="#2BB673" stroke-width="3" transform="rotate(-60 60 60)"/>'
    + '<circle cx="60" cy="60" r="8" fill="#F2A20C"/><circle cx="100" cy="60" r="4.5" fill="#13315C"/><circle cx="40" cy="25" r="4.5" fill="#13315C"/>', 'physics'),
  biology: () => svg(bg('#EAF7EF', '#D3F0E0')
    + '<path d="M40 18c30 12 30 72 0 84M80 18c-30 12-30 72 0 84" stroke="#2BB673" stroke-width="4" fill="none"/>'
    + '<path d="M44 30h32M50 44h20M50 60h20M50 76h20M44 90h32" stroke="#E0533F" stroke-width="3.5" stroke-linecap="round"/>'
    + '<path d="M90 70c14 0 20 12 16 26-14 0-20-12-16-26z" fill="#1F7A4D"/>', 'biology'),
  islamiat: () => svg(bg('#EAF7EF', '#CDEFD9')
    // an open book on a wooden stand (rehal), under an eight-pointed star — no figures
    + '<path d="M60 18l6 9 10-2-2 10 9 6-9 6 2 10-10-2-6 9-6-9-10 2 2-10-9-6 9-6-2-10 10 2z" fill="#F6C343" opacity=".9"/>'
    + '<path d="M60 62c-10-6-24-7-36-4v22c12-3 26-2 36 4z" fill="#fff" stroke="#1F7A4D" stroke-width="2.6"/>'
    + '<path d="M60 62c10-6 24-7 36-4v22c-12-3-26-2-36 4z" fill="#fff" stroke="#1F7A4D" stroke-width="2.6"/>'
    + '<path d="M24 84l36 18 36-18M36 108l24-12 24 12" stroke="#8A5A3B" stroke-width="5" stroke-linecap="round" fill="none"/>', 'Islamiat'),
  social: () => svg(bg('#E6F0FF', '#D2E3FB')
    + '<circle cx="60" cy="60" r="36" fill="#3B82C4"/><path d="M38 44c8-2 14 2 16 8s-4 10-2 16-6 8-10 4-8-10-8-16 0-10 4-12zM70 32c8 2 14 8 16 16-6 2-10-2-14 0s-6-8-2-16zM74 70c6-2 12 2 12 8s-6 12-12 10-6-16 0-18z" fill="#2BB673"/>'
    + '<path d="M60 24v72M24 60h72" stroke="#fff" stroke-width="1.2" opacity=".5"/>', 'social studies'),
  computer: () => svg(bg('#E6F0FF', '#D2E3FB')
    + '<rect x="22" y="28" width="76" height="50" rx="5" fill="#13315C"/><rect x="28" y="34" width="64" height="38" rx="2" fill="#E6F0FF"/>'
    + '<text x="36" y="60" font-family="monospace" font-weight="800" font-size="18" fill="#1F7A4D">&lt;/&gt;</text><path d="M50 78v12h20V78M38 94h44" stroke="#13315C" stroke-width="5" stroke-linecap="round"/>', 'computer'),
  general: () => svg(bg('#FFF3D6', '#FFE3A3')
    + '<path d="M60 36c-12-8-28-9-44-6v58c16-3 32-2 44 6z" fill="#fff" stroke="#F2A20C" stroke-width="3"/><path d="M60 36c12-8 28-9 44-6v58c-16-3-32-2-44 6z" fill="#fff" stroke="#F2A20C" stroke-width="3"/>'
    + '<g transform="translate(78 14) rotate(35)"><rect width="10" height="44" rx="2" fill="#3B82C4"/><path d="M0 44h10l-5 10z" fill="#F1C27D"/></g>', 'lesson'),
};
function subjectKind(subject) {
  const s = String(subject || '').toLowerCase();
  if (/math/.test(s)) return 'maths';
  if (/urdu|اردو/.test(s)) return 'urdu';
  if (/english/.test(s)) return 'english';
  if (/chem/.test(s)) return 'chemistry';
  if (/phys/.test(s)) return 'physics';
  if (/bio/.test(s)) return 'biology';
  if (/islam|quran|nazra|اسلام/.test(s)) return 'islamiat';
  if (/history|geograph|social|pakistan stud|civic/.test(s)) return 'social';
  if (/computer|ict\b/.test(s)) return 'computer';
  if (/science/.test(s)) return 'science';
  return 'general';
}
const subjectPicture = (subject) => SUBJECT[subjectKind(subject)]();

// ── THE PACING BAR ────────────────────────────────────────────────────────────────────────
// The lesson's own pacing line ("10 + 12 + 12 + 4 + 2 = 40 min"), drawn as one bar cut into its
// stages, each in its stage's colour. Only drawn when the numbers add up to the stated total and
// there is one number per stage, so the bar can never disagree with the line it illustrates.
const STAGE_COLOUR = { introduction: '#0F6A73', development: '#0B2545', activity: '#1F7A4D', conclusion: '#584A93', homework: '#5B6472' };
const STAGE_LETTER = { introduction: 'I', development: 'D', activity: 'A', conclusion: 'C', homework: 'H' };
function pacingBar(line, stages) {
  const m = /^([\d+\s.]+)=\s*(\d+)/.exec(String(line).replace(/[^\d+=.\s]/g, ' ').trim());
  if (!m) return '';
  const parts = m[1].split('+').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x) && x >= 0);
  const total = Number(m[2]);
  if (!parts.some((p) => p > 0) || parts.length !== stages.length || Math.abs(parts.reduce((a, b) => a + b, 0) - total) > 0.01) return '';
  const W = 476; const gap = 3; const usable = W - gap * (parts.filter((p) => p > 0).length - 1);
  let x = 0; let s = '';
  parts.forEach((p, i) => {
    if (!p) return;   // a stage of 0 minutes takes no room on the bar
    const w = (usable * p) / total; const col = STAGE_COLOUR[stages[i]] || '#5B6472';
    s += `<rect x="${r1(x)}" y="0" width="${r1(w)}" height="26" rx="6" fill="${col}"/>`;
    if (w > 26) s += `<text x="${r1(x + w / 2)}" y="17.5" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="13" fill="#fff">${STAGE_LETTER[stages[i]] || ''} ${p}</text>`;
    x += w + gap;
  });
  return `<svg class="space-bar" viewBox="0 0 ${W} 26" role="img" aria-label="pacing ${parts.join(' + ')} = ${total} minutes">${s}</svg>`;
}

module.exports = { ICON, stageIcon, subjectPicture, subjectKind, pacingBar, STAGE_COLOUR, STAGE_LETTER, K };
