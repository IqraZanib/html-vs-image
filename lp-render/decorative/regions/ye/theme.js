'use strict';
// Yemen region theme v4 — full anatomy replication of the approved BLN pilot
// ("دليل الدرس اليومي", card PROJ-044): thin ministry header strip (no chips), goal
// text inside a single teal band, خطأ/صواب twins with no heading band + caption line,
// compact right-anchored stage tabs with FIXED per-stage colours (coral/blue/green/navy
// — the design set assigns colours by stage, it does not rotate), amber تحقق strips,
// framed in-card figures, and a full-width footer band. Requires the Yemen guide
// template section ORDER (see the nth-of-type map below) — reorder sections and the
// stage colours shift. Loaded only when meta.region === 'ye'; default theme untouched.

// Cairo — the geometric Arabic sans the approved pilot is set in. Embedded from
// @fontsource/cairo when installed; silently absent otherwise (fonts then fall back
// to the default Noto Naskh, so machines without the package still render).
const fs = require('node:fs');
const path = require('node:path');
let CAIRO_FACES = '';
// Typography: IBM Plex Sans Arabic (reviewer-selected against the pilot from a
// 5-font specimen). Embedded when the package is installed; silently falls back
// to Noto Naskh otherwise.
try {
  const nm = path.join(__dirname, '..', '..', '..', '..', 'node_modules', '@fontsource');
  for (const [family, pkg, weights] of [
    ['IBM Plex Sans Arabic', 'ibm-plex-sans-arabic', [400, 500, 700]],
  ]) {
    const dir = path.join(nm, pkg, 'files');
    for (const w of weights) {
      const f = fs.readdirSync(dir).find((x) => x.match(new RegExp(`arabic-${w}-normal\\.woff2$`)));
      if (f) CAIRO_FACES += `@font-face{font-family:'${family}';font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}) format('woff2');}`;
    }
  }
} catch (_) { /* packages not installed — keep default fonts */ }

const THEME_OVERRIDE_CSS = CAIRO_FACES + `
/* the pilot is set in Cairo (geometric Arabic sans), not Naskh */
body, .s-title, .lp-header h1, .d-step .st-label, .d-q, .d-note, .d-text, .d-bullets li,
.d-field, .d-chip, .st-body, .d-a, .d-img .cap, .d-inline-img .cap, .lp-footer, .s-time{
  font-family:'Cairo','Noto Naskh Arabic','Noto Sans',sans-serif}

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
/* measured: the pilot page ground is WHITE, cards are white/tinted with borders */
body{background:#fcfcfc}
.sheet{background:#fcfcfc}

/* header: measured #182448 navy — big title one side, ministry lines the other.
   The design set has NO hero banner: banner mode is suppressed (navy strip always). */
.lp-header.banner{background-image:none !important;min-height:0;display:flex}
.lp-header.banner::after{display:none}
.lp-header.banner .lp-htext{position:static;padding:0;display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%}

.lp-header{background:var(--navy);border-radius:0;border-bottom:0;padding:24px 28px 22px;min-height:78px;
  display:flex;align-items:center;justify-content:space-between;gap:16px}
.lp-header h1{font-size:21px;font-weight:800;margin:0;text-shadow:none;order:1;white-space:nowrap}
.lp-header .sub{font-size:12px;font-weight:600;opacity:.92;margin:0;text-shadow:none;order:2;text-align:start;line-height:1.7;max-width:60%}
.lp-header .meta{display:none}
.hbwrap,.deco{display:none}

.body{padding:12px 22px 2px}
.section{margin:0 0 10px}

/* section title sits ON the card (pilot anatomy): transparent head row overlapping */
.s-head{position:relative;gap:8px;margin:0 0 -34px;z-index:2;padding:0 14px;align-items:center;height:34px}
.s-tab{flex:0 1 auto;background:transparent !important;box-shadow:none;padding:6px 2px}
.s-title{font-size:15px;font-weight:800}
.s-ic{display:none}
.s-time{position:static;margin-inline-start:auto;background:#fff;border:1px solid var(--line);
  color:var(--navy);font-weight:800;font-size:11px;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.panel{background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:40px 16px 12px;box-shadow:none}

/* stage interiors: white inner cards on the tinted stage card */
.panel.has-inline-img{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}
.panel.has-inline-img .ii-body{flex:1 1 55%;min-width:0}
.d-inline-img{flex:0 0 36%;max-width:270px;border:1.5px solid #fff;border-radius:10px;background:#fff;box-shadow:0 2px 8px rgba(20,30,60,.10)}
.d-inline-img img{background:#fff;max-height:160px}
.d-inline-img .cap{background:#fff;color:var(--muted);border-top:1px solid var(--line);font-size:10.5px;padding:4px 8px}

.d-steps{gap:6px}
.d-step{background:transparent;border:0;padding:2px 0}
.d-step .n{display:none}
.d-step .st-label{color:var(--navy);font-size:13.5px}
.d-step .st-body{font-size:13.5px;line-height:1.55}
/* تحقق strip: measured amber tint #fcf0d8, white pill feel */
.d-step:last-child{background:var(--cream);border:1px solid var(--cream-line);border-radius:9px;padding:7px 11px;flex-basis:100%}
.d-step:last-child .st-label{color:#8a6d1d}
.d-step:last-child .st-label::before{content:"✔ "}

/* أخطاء شائعة twins: white cards, coloured borders + centred coloured headers */
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
.d-bullets li{font-size:13.5px;line-height:1.55}

/* ── template ROLE map — order-independent: sections are targeted by their id
      (rendered as a sec-<id> class). The Yemen content contract (DESIGN.md):
      lesson-line · goal · errors · errors-caption · stage-tamhid · stage-arad ·
      stage-tatbiq · stage-taqwim · solutions · glossary · multigrade · homework.
      Sections without these ids get the base Yemen skin only. ── */
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
.section.sec-errors-caption .s-head{display:none}
.section.sec-errors-caption .panel{background:transparent;border:0;box-shadow:none;padding:0 6px}
.section.sec-errors-caption .d-text{font-size:12px;color:var(--muted);text-align:center;font-weight:600}
.section.sec-stage-tamhid .s-title{color:#b23a48}
.section.sec-stage-tamhid .panel{background:#fcd8d8;border-color:#f2c0c0}
.section.sec-stage-tamhid .panel.has-inline-img{flex-direction:row-reverse}
.section.sec-stage-arad .s-title{color:var(--c-blue-ink)}
.section.sec-stage-arad .panel{background:#e7eef8;border-color:#c9d9ee}
.section.sec-stage-tatbiq .s-title{color:var(--c-green-ink)}
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

/* footer: plain thin-rule line (measured — the pilot has NO dark footer band) */
.lp-footer{margin:12px 22px 0;padding:8px 4px 0;background:none;border-top:1.5px solid var(--navy);
  color:var(--navy);font-size:10.5px;text-align:center;font-weight:700}
.lp-footer b{color:var(--navy)}
`;

module.exports = { THEME_OVERRIDE_CSS, REGION_NAME: 'Yemen' };
