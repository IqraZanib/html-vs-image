'use strict';
// Yemen region design pack — the definitive theme (single source, no patch layers).
// Reference: the approved BLN pilot "دليل الدرس اليومي" (card PROJ-044), replicated by
// measurement (pixel-sampled colours; specimen-selected typography) through Iqra's
// review rounds of 2026-08-12. Content contract (section ids) in DESIGN.md.
const fs = require('node:fs');
const path = require('node:path');

// Typography: IBM Plex Sans Arabic (reviewer-selected). Embedded when the package is
// installed; silently falls back to Noto Naskh otherwise.
let FONT_FACES = '';
try {
  const dir = path.join(__dirname, '..', '..', '..', '..', 'node_modules', '@fontsource', 'ibm-plex-sans-arabic', 'files');
  for (const w of [400, 500, 700]) {
    const f = fs.readdirSync(dir).find((x) => x.endsWith('arabic-' + w + '-normal.woff2'));
    if (f) FONT_FACES += "@font-face{font-family:'IBM Plex Sans Arabic';font-weight:" + w +
      ";font-display:swap;src:url(data:font/woff2;base64," +
      fs.readFileSync(path.join(dir, f)).toString('base64') + ") format('woff2');}";
  }
} catch (_) { /* package not installed — default fonts apply */ }

const THEME_OVERRIDE_CSS = FONT_FACES + `
:root{
  --c-amber:#e3a23c; --c-amber-ink:#9a6a12; --c-amber-soft:#fcf0d8;
  --c-red:#e0705a;   --c-red-ink:#c0392b;   --c-red-soft:#fbdfdf;
  --c-teal:#18a4a4;  --c-teal-ink:#0e7a7a;  --c-teal-soft:#dcf2f2;
  --c-green:#4b8a3f; --c-green-ink:#38682e; --c-green-soft:#e4f0e4;
  --c-blue:#4479ad;  --c-blue-ink:#2f5a88;  --c-blue-soft:#dfe9f5;
  --navy:#182448;
  --cream:#fcf0d8; --cream-line:#ecd9a0;
  --ink:#1f2a44; --muted:#6b7280; --line:#e5e7eb;
}
/* measured: WHITE page ground; IBM Plex everywhere */
body{background:#fcfcfc;font-family:'IBM Plex Sans Arabic','Noto Naskh Arabic','Noto Sans',sans-serif}
.sheet{background:#fcfcfc}
.s-title,.lp-header h1,.lp-header .sub,.d-step .st-label,.d-q,.d-note,.d-text,.d-bullets li,
.d-field,.d-chip,.st-body,.d-a,.d-img .cap,.d-inline-img .cap,.lp-footer,.s-time{
  font-family:'IBM Plex Sans Arabic','Noto Naskh Arabic','Noto Sans',sans-serif}

/* header: #182448 ministry strip (~78px) — title at RTL start, ministry lines opposite.
   The design set has NO hero banner: banner mode is suppressed. */
.lp-header{background:var(--navy);border-radius:0;border-bottom:4px solid #e3a23c;
  padding:24px 28px 22px;min-height:78px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.lp-header h1{font-size:25px;font-weight:700;margin:0;text-shadow:none;order:1;white-space:nowrap}
.lp-header .sub{font-size:12px;font-weight:600;opacity:.92;margin:0;text-shadow:none;order:2;text-align:start;line-height:1.7;max-width:60%}
.lp-header .meta{display:none}
.lp-header.banner{background-image:none !important;min-height:78px;padding:24px 28px 22px}
.lp-header.banner::after{display:none}
.lp-header.banner .lp-htext{position:static;padding:0;display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%}
.lp-header.banner h1{white-space:normal;font-size:19px;line-height:1.45}
.hbwrap,.deco{display:none}

/* rhythm */
.body{padding:8px 22px 2px}
.section{margin:0 0 6px}

/* section anatomy: the title sits ON the card; white pill carries time + GRR marker */
.s-head{position:relative;gap:8px;margin:0 0 -32px;z-index:2;padding:0 14px;align-items:center;height:32px}
.s-tab{flex:0 1 auto;background:transparent !important;box-shadow:none;padding:6px 2px}
.s-title{font-size:15px;font-weight:700}
.s-ic{display:none}
.s-time{position:static;margin-inline-start:auto;background:#fff;border:1px solid var(--line);
  color:var(--navy);font-weight:700;font-size:11px;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.panel{background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:34px 15px 9px;box-shadow:none}

/* in-card figures: HERO-sized like the pilot — the illustration IS the card's
   main content and the text is the sidebar, not the other way round. Labels
   inside the image must stay readable at print size. */
.panel.has-inline-img{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.panel.has-inline-img .ii-body{flex:1 1 46%;min-width:0}
.d-inline-img{flex:0 0 47%;max-width:380px;border:1.5px solid #fff;border-radius:10px;background:#fff;box-shadow:0 2px 8px rgba(20,30,60,.10)}
.d-inline-img img{background:#fff;max-height:174px}
.d-inline-img .cap{background:#fff;color:var(--muted);border-top:1px solid var(--line);font-size:10.5px;padding:4px 8px}

/* stage steps: no numbered circles; the LAST item is the amber checkpoint strip */
.d-steps{gap:6px}
.d-step{background:transparent;border:0;padding:2px 0}
.d-step .n{display:none}
.d-step .st-label{color:var(--navy);font-size:13.5px}
.d-step .st-body{font-size:13.5px;line-height:1.55}
.d-step:last-child{background:var(--cream);border:1px solid var(--cream-line);border-radius:9px;padding:7px 11px;flex-basis:100%}
.d-step:last-child .st-label{color:#8a6d1d}
.d-step:last-child .st-label::before{content:"✔ "}

/* twins: white cards, coloured borders, centred coloured headers */
.d-qa{grid-template-columns:1fr 1fr;gap:10px}
.d-qc{border-radius:12px;padding:10px 12px;background:#fff}
.d-qc:first-child{border:2px solid var(--c-red)}
.d-qc:last-child{border:2px solid #35a06a}
.d-qc .d-q{font-size:13.5px;text-align:center;margin-bottom:6px}
.d-qc:first-child .d-q{color:var(--c-red-ink) !important}
.d-qc:last-child .d-q{color:#2c7d52 !important}
.d-qc .d-q::before{content:""}
.d-qc .d-a{color:var(--ink);font-size:13.5px;line-height:1.55}
.d-qc .d-a::before{content:""}
.d-note{border-radius:10px;padding:9px 13px;font-size:14px}
.d-bullets li{font-size:13.5px;line-height:1.5}

/* ── template ROLE map — order-independent via sec-<id> classes (see DESIGN.md).
      Sections without contract ids get only the base skin above. ── */
.section.sec-lesson-line .s-head{display:none}
.section.sec-lesson-line .panel{background:transparent;border:0;box-shadow:none;padding:2px 4px 0}
.section.sec-lesson-line .d-text{font-size:13.5px;font-weight:700;color:var(--navy)}
.section.sec-goal .s-head{display:none}
.section.sec-goal .panel{border:2px solid var(--c-teal);background:#fff;padding:12px 16px}
.section.sec-goal .d-note{background:none !important;border:0 !important;color:var(--ink);padding:0;font-size:14px}
.section.sec-goal .d-note .nt{display:none}
.section.sec-goal .d-note b{color:var(--c-teal-ink)}
.section.sec-errors .s-title{color:#c0392b}
.section.sec-errors .panel{border:2px solid var(--c-red);background:#fff}
.section.sec-errors .d-qc{border-width:1.5px;border-radius:10px}
/* Illustrated errors strip (pilot): the خطأ/صواب twin-board figure spans the card
   width BELOW the twins instead of squeezing them into a side column. */
.section.sec-errors .panel.has-inline-img{flex-direction:column}
.section.sec-errors .panel.has-inline-img .ii-body{flex:none;width:100%}
.section.sec-errors .d-inline-img{flex:none;width:100%;max-width:100%;display:flex;flex-direction:column;align-items:center;box-shadow:none;border:0;background:transparent}
.section.sec-errors .d-inline-img img{max-height:126px;width:auto;max-width:96%;border:1px solid var(--line);border-radius:10px}
.section.sec-errors .d-inline-img .cap{border-top:0;background:transparent}
.section.sec-errors-caption .s-head{display:none}
.section.sec-errors-caption .panel{background:transparent;border:0;box-shadow:none;padding:0 6px}
.section.sec-errors-caption .d-text{font-size:12px;color:var(--muted);text-align:center;font-weight:600}
.section.sec-stage-tamhid .s-title{color:#b23a48}
.section.sec-stage-tamhid .panel{background:#fcd8d8;border-color:#f2c0c0}
.section.sec-stage-tamhid .panel.has-inline-img{flex-direction:row-reverse}
.section.sec-stage-arad .s-title{color:var(--c-blue-ink)}
.section.sec-stage-arad .panel{background:#e7eef8;border-color:#c9d9ee}
.section.sec-stage-tatbiq .s-title{color:var(--c-green-ink)}
/* practice/assessment figures a notch smaller than the intro heroes: keeps the
   guide to its 2-page promise while every card stays figure-led */
.section.sec-stage-tatbiq .d-inline-img img,.section.sec-stage-taqwim .d-inline-img img{max-height:156px}
.section.sec-stage-tatbiq .panel{background:#e9f2e5;border-color:#cde3c5}
.section.sec-stage-taqwim .s-title{color:#8a6d1d}
.section.sec-stage-taqwim .panel{background:var(--cream);border-color:var(--cream-line)}
.section.sec-stage-taqwim .d-step:last-child{background:#fff;border-color:var(--cream-line)}
.section.sec-solutions .s-title{color:var(--c-teal-ink)}
.section.sec-glossary .s-title{color:#5a6478}
.section.sec-multigrade .s-title{color:var(--c-green-ink)}
.section.sec-homework .s-title{color:var(--c-amber-ink)}
.section.sec-homework .panel{background:var(--cream);border-color:var(--cream-line)}
.section.sec-homework .d-note{background:none !important;border:0 !important}

/* misc */
.d-img{border-color:var(--line);border-radius:10px;box-shadow:none;background:#fff}
.d-img img{height:130px;background:#fff}
.d-img .cap{background:#fff;color:var(--muted);padding:5px 10px;font-size:11px;border-top:1px solid var(--line)}
.char-fig{background:#f6f7f9}
.d-mrow{background:#fff;border-color:var(--line)}
.d-fields{gap:8px 14px}
.d-field{font-size:13px}
.d-field b{font-size:9px}

/* footer: plain thin navy rule (the design set has NO dark footer band) */
.lp-footer{margin:8px 22px 0;padding:6px 4px 0;background:none;border-top:1.5px solid var(--navy);
  color:var(--navy);font-size:10.5px;text-align:center;font-weight:700}
.lp-footer b{color:var(--navy)}
`;

module.exports = { THEME_OVERRIDE_CSS, REGION_NAME: 'Yemen' };
