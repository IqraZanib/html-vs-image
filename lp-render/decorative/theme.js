'use strict';
// Decorative theme CSS. Locked colour theme (reference-matched): a warm four-accent
// palette rotated per section — amber / red / teal / green — on a clean white ground,
// with navy body text. Section headers are coloured "tabs" (accent icon disc + accent
// title + accent underline); the 30-second summary is a cream card; the rubric uses
// coloured level badges; the hero is a full-width scene-image banner. (RULES R26.)

const THEME_CSS = `
:root{
  /* Warm four-accent palette. Each hue has: bright (icon disc / badge), ink (title text
     on white — dark enough to read), soft (borders, tints). */
  --c-amber:#f0a51e; --c-amber-ink:#a96c07; --c-amber-soft:#fdeecd;
  --c-red:#e0553a;   --c-red-ink:#c23e26;   --c-red-soft:#fbe0d8;
  --c-teal:#1f9091;  --c-teal-ink:#116f6f;  --c-teal-soft:#d5efef;
  --c-green:#7ab23f; --c-green-ink:#568726; --c-green-soft:#e7f3d6;
  --cream:#fdf6e6; --cream-line:#efd9a4;
  /* neutral "slate" pseudo-accent for admin blocks (e.g. Lesson Details) */
  --c-slate:#8590a4; --c-slate-ink:#5a6478; --c-slate-soft:#eef0f4;
  --ink:#23314e; --muted:#6b7688; --line:#e9edf3;
  --grey-mark:#aab2bf;
}
body{background:#eef1f7;color:var(--ink);font-family:var(--font),'Baloo 2','Poppins',sans-serif}
.sheet{padding:0 0 26px;background:#eef1f7}

/* hero — a full-width scene-image banner with the title on a soft dark scrim.
   Falls back to a warm sunset gradient when no banner image is supplied. */
.lp-header{position:relative;overflow:hidden;margin:0;padding:28px 34px 24px;border:0;border-radius:0 0 26px 26px;
  background:linear-gradient(135deg,#f6b64a 0%,#ef7f3c 52%,#e0553a 100%);color:#fff}
.lp-header.banner{padding:0;min-height:250px;display:flex;flex-direction:column;justify-content:flex-end;
  background-size:cover;background-position:center 32%}
.lp-header.banner::after{content:'';position:absolute;inset:0;z-index:1;
  background:linear-gradient(180deg,rgba(15,23,42,.02) 0%,rgba(15,23,42,.12) 45%,rgba(15,23,42,.66) 100%)}
.lp-header.banner .lp-htext{position:relative;z-index:2;padding:22px 30px 20px}
.lp-header h1{position:relative;z-index:2;margin:0 0 5px;font-size:33px;font-weight:800;line-height:1.1;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.4)}
.lp-header .sub{position:relative;z-index:2;font-size:15px;opacity:.97;font-weight:600;color:#fff;margin-top:2px;text-shadow:0 1px 8px rgba(0,0,0,.4)}
.lp-header .meta{position:relative;z-index:2;display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.lp-header .meta span{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);border-radius:999px;
  padding:6px 14px;font-size:12.5px;font-weight:600;backdrop-filter:blur(2px)}
.lp-header .meta b{font-weight:800;margin-inline-end:5px;opacity:.9;color:#fff}
/* faint letterhead icons (gradient hero only) */
.hbwrap{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.hb{position:absolute;opacity:.1}.hb svg{width:60px;height:60px}
.hb svg *{fill:#fff !important;stroke:#fff !important}
.hb.b1{top:14px;inset-inline-end:26px;transform:rotate(-6deg)}
.hb.b2{bottom:8px;inset-inline-end:130px;transform:rotate(7deg)}
.hb.b3{top:30px;inset-inline-end:230px}.hb.b4{bottom:16px;inset-inline-end:40px;transform:rotate(-10deg);opacity:.08}
.deco{position:absolute;opacity:.9;pointer-events:none}.deco svg{display:block}
.lp-header.banner .hbwrap,.lp-header.banner .deco{display:none}
.deco-leaf{width:32px}.deco-leaf.l1{top:14px;inset-inline-end:150px;transform:rotate(-18deg)}
.deco-cloud{width:66px}.deco-cloud.c1{top:20px;inset-inline-end:34px;opacity:.5}
.deco-star{width:20px}.deco-star.s1{top:110px;inset-inline-end:110px}
.deco-spark{width:16px}.deco-spark.k1{top:26px;inset-inline-start:46%}.deco-spark.k2{bottom:26px;inset-inline-start:40%;width:13px}
.deco-bfly{width:40px}.deco-bfly.b1{top:70px;inset-inline-end:200px}

/* sections */
.body{padding:16px 26px 2px}
.section{margin:0 0 14px;break-inside:avoid;page-break-inside:avoid}
.s-head{break-after:avoid;page-break-after:avoid}
.panel{break-inside:avoid;page-break-inside:avoid}
.d-img,.d-mrow,.d-step,.d-qc,.d-field,.d-bullets li,.char-fig,.d-chip,.rrow,.srow{break-inside:avoid;page-break-inside:avoid}

/* section header = a solid coloured tab (accent box, WHITE icon + WHITE title) */
.s-head{display:flex;align-items:center;gap:10px;margin:0 0 10px}
.s-tab{display:inline-flex;align-items:center;gap:9px;border-radius:12px;padding:8px 16px 8px 12px;
  color:#fff;box-shadow:0 4px 11px rgba(0,0,0,.13)}
.s-ic{flex:0 0 auto;width:22px;height:22px;display:flex;align-items:center;justify-content:center}
.s-ic svg{width:20px;height:20px;fill:#fff}
.s-ic svg [fill]:not([fill="none"]){fill:#fff}
.s-ic svg [stroke]:not([stroke="none"]){stroke:#fff}
.s-title{font-size:17px;font-weight:800;letter-spacing:.2px;color:#fff}
.s-time{margin-inline-start:auto;background:#fff;border:1px solid var(--line);color:var(--muted);font-size:12px;
  font-weight:700;padding:4px 12px;border-radius:999px;white-space:nowrap}
.panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 18px;box-shadow:0 6px 18px rgba(40,60,120,.06)}

/* 30-second summary — cream card */
.d-summary{background:var(--cream);border:1.5px solid var(--cream-line);border-radius:16px;padding:16px 20px}
.d-summary .srow{display:flex;gap:13px;align-items:flex-start;margin:0 0 13px}
.d-summary .srow:last-child{margin:0}
.d-summary .sic{flex:0 0 auto;font-size:22px;line-height:1;width:26px;text-align:center}
.d-summary .stext{font-size:14px;line-height:1.5;color:var(--ink)}
.d-summary .stext b{color:var(--c-amber-ink);font-weight:800}

/* bullets — plain, black text, small neutral markers */
.d-lead{font-size:14px;font-weight:700;color:var(--muted);margin-bottom:8px}
.d-bullets{margin:0;padding:0;list-style:none;display:grid;gap:6px}
.d-bullets li{position:relative;padding:2px 2px 2px 24px;font-size:14.5px;font-weight:600;line-height:1.55;color:var(--ink)}
/* plain marker in the gutter — never a filled disc over the text */
.d-bullets li::before{content:attr(data-mark);position:absolute;inset-inline-start:2px;top:2px;
  font-size:13px;font-weight:800;color:var(--muted);line-height:1.55}
.d-tag{display:inline-block;margin-inline-start:8px;font-size:10.5px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;border-radius:999px;padding:2px 9px;vertical-align:middle}

/* plain text / note banner */
.d-text{font-size:14.5px;font-weight:600;line-height:1.55}
.d-note{border-radius:12px;padding:12px 16px;font-size:14.5px;font-weight:600;line-height:1.55}
.d-note .nt{display:block;font-size:12px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;margin-bottom:4px}

/* chips (resources) */
.d-chips{display:flex;flex-wrap:wrap;gap:9px}
.d-chip{border-radius:999px;padding:8px 15px;font-size:13px;font-weight:700}

/* steps */
.d-steps{display:grid;gap:11px}
.d-step{display:flex;gap:13px;align-items:flex-start;background:#fbfcfe;border:1px solid var(--line);border-radius:13px;padding:13px 15px}
.d-step .n{flex:0 0 auto;width:30px;height:30px;border-radius:50%;color:#fff;font-weight:800;font-size:14px;
  display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.13)}
.d-step .st-label{font-weight:800;font-size:14.5px;margin-bottom:3px;color:var(--ink)}
.d-step .st-body{font-size:13.5px;color:#3f4a63;font-weight:600;line-height:1.5}

/* Q & A */
.d-qa{display:grid;grid-template-columns:repeat(2,1fr);gap:11px}
.d-qc{background:#fbfcfe;border:1px solid var(--line);border-radius:12px;padding:11px 14px}
.d-q{font-weight:800;font-size:13.5px;margin-bottom:5px;color:var(--ink)}
.d-q::before{content:attr(data-mark)" ";font-weight:800}
.d-a{font-size:12.5px;color:var(--muted);font-weight:600}
.d-a::before{content:"→ ";color:var(--c-teal-ink);font-weight:800}

/* admin fields — clean form grid (Lesson Details) */
.d-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 20px}
.d-field{font-size:13.5px;font-weight:700;color:var(--ink);min-width:0}
.d-field b{color:var(--muted);font-weight:800;text-transform:uppercase;font-size:10px;letter-spacing:.5px;display:block;margin-bottom:3px}

/* assessment rubric — coloured level badges */
.d-rubric{display:grid;gap:9px}
.rrow{display:flex;gap:12px;align-items:flex-start;background:#fbfcfe;border:1px solid var(--line);border-radius:12px;padding:11px 14px}
.rrow .ric{flex:0 0 auto;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;line-height:1}
.rrow .rlevel{font-weight:800;color:var(--ink);margin-inline-end:6px}
.rrow .rdesc{font-size:13.5px;color:#3f4a63;font-weight:600;line-height:1.45}

/* character cast (fallback visual) */
.panel.has-char{display:flex;gap:18px;align-items:center}
.char-fig{flex:0 0 auto;width:112px;align-self:center;display:flex;align-items:center;justify-content:center;
  isolation:isolate;border-radius:18px;padding:8px;background:#f4f6fb;box-shadow:0 4px 12px rgba(40,60,120,.07)}
.char-fig img{display:block;width:100%;height:auto;max-height:186px;object-fit:contain;mix-blend-mode:multiply}
.char-fig.right img{transform:scaleX(-1)}
.char-body{flex:1;min-width:0}

/* math */
.d-math{display:grid;gap:11px}
.d-mrow{background:#fbfcfe;border:1px solid var(--line);border-radius:12px;padding:15px 16px;text-align:center}
.d-mlabel{font-size:12px;font-weight:800;color:var(--muted);margin-bottom:9px;text-transform:uppercase;letter-spacing:.03em}
.d-mformula{overflow-x:auto}.d-mformula .katex{font-size:1.5em}.d-mformula svg{max-width:100%;height:auto;vertical-align:middle}
.d-text .katex,.d-note .katex{font-size:1.05em}

/* images */
.d-imgrow{display:grid;gap:14px}
.d-imgrow.n1{grid-template-columns:1fr}.d-imgrow.n2{grid-template-columns:1fr 1fr}.d-imgrow.n3{grid-template-columns:1fr 1fr 1fr}
.d-img{border:1px solid var(--line);border-radius:15px;overflow:hidden;background:#fff;box-shadow:0 6px 16px rgba(40,60,120,.07)}
.d-img img{display:block;width:100%;height:225px;object-fit:contain;background:#fff}
.d-img.cover img{object-fit:cover}
.d-img .cap{padding:9px 13px;font-size:13px;font-weight:700;color:var(--ink);text-align:center}

/* footer */
.lp-footer{margin:18px 30px 0;padding-top:11px;border-top:1px solid var(--line);font-size:11px;color:var(--muted);line-height:1.7;text-align:right}
.lp-footer b{color:var(--c-teal-ink)}

/* R27 — no empty pages: grow images to fill in the PDF only (PNG/goldens unaffected) */
@media print{
  .d-imgrow{gap:16px}
  .d-img img{height:36vh;min-height:250px;max-height:420px;object-fit:contain}
}
`;

// Warm four-accent palette, rotated per section (amber → red → teal → green).
const ACCENTS = ['--c-amber', '--c-red', '--c-teal', '--c-green'];
const accentFor = (i) => ACCENTS[((i % ACCENTS.length) + ACCENTS.length) % ACCENTS.length];

module.exports = { THEME_CSS, accentFor };
