'use strict';
// Decorative theme CSS — generic, section-type agnostic (RULES R7).
// Palette is rotated per section so the whole plan feels coherent but varied.

const THEME_CSS = `
:root{
  --coral:#ff7a6b; --coral-soft:#ffe4df;
  --sky:#4aa8ff; --sky-soft:#dcefff;
  --grape:#9b7bff; --grape-soft:#ece5ff;
  --mint:#2fc79a; --mint-soft:#d6f6ec;
  --sun:#ffb43d; --sun-soft:#fff0d6;
  --amber:#f39320; --amber-soft:#ffe7c7;
  --ink:#2b2f3a; --muted:#6b7280; --line:#eef0f5;
}
body{background:#eef2fb;color:var(--ink);font-family:var(--font),'Baloo 2','Poppins',sans-serif}
.sheet{padding:0 0 30px;background:#eef2fb}

/* hero */
.lp-header{position:relative;overflow:hidden;margin:0;padding:30px 36px 26px;border:0;border-radius:0 0 28px 28px;
  background:linear-gradient(125deg,#3a63ff 0%,#6a4bff 52%,#a24bff 100%);color:#fff}
.lp-header h1{position:relative;z-index:2;margin:0 0 6px;font-size:38px;font-weight:800;line-height:1.08;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.18)}
.lp-header .sub{position:relative;z-index:2;font-size:16px;opacity:.95;font-weight:600;color:#fff;margin-top:2px}
.lp-header .meta{position:relative;z-index:2;display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
/* faint letterhead icons behind the title */
.hbwrap{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.hb{position:absolute;opacity:.11}
.hb svg{width:62px;height:62px}
.hb svg *{fill:#fff !important;stroke:#fff !important}
.hb.b1{top:14px;inset-inline-end:26px;transform:rotate(-6deg)}
.hb.b2{bottom:8px;inset-inline-end:130px;transform:rotate(7deg)}
.hb.b3{top:30px;inset-inline-end:230px}
.hb.b4{bottom:16px;inset-inline-end:40px;transform:rotate(-10deg);opacity:.09}
.lp-header .meta span{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);border-radius:999px;
  padding:6px 14px;font-size:12.5px;font-weight:600}
.lp-header .meta b{font-weight:800;margin-inline-end:5px;opacity:.85;color:#fff}
.deco{position:absolute;opacity:.9;pointer-events:none}
.deco svg{display:block}
.deco-leaf{width:34px}.deco-leaf.l1{top:14px;inset-inline-end:150px;transform:rotate(-18deg)}
.deco-leaf.l2{bottom:16px;inset-inline-end:60px;transform:rotate(28deg);width:26px;opacity:.8}
.deco-cloud{width:70px}.deco-cloud.c1{top:20px;inset-inline-end:34px;opacity:.5}
.deco-bfly{width:44px}.deco-bfly.b1{top:74px;inset-inline-end:210px;transform:rotate(8deg)}
.deco-star{width:22px}.deco-star.s1{top:120px;inset-inline-end:110px;transform:rotate(12deg)}
.deco-spark{width:18px}.deco-spark.k1{top:26px;inset-inline-start:46%}.deco-spark.k2{bottom:26px;inset-inline-start:40%;width:14px}

/* sections */
.body{padding:18px 26px 2px}
.section{margin:0 0 15px;break-inside:avoid;page-break-inside:avoid}
.s-head{display:flex;align-items:center;gap:11px;margin:0 0 8px}
.s-disc{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;
  box-shadow:0 6px 14px rgba(0,0,0,.14);flex:0 0 auto;font-size:22px}
.s-disc svg{width:24px;height:24px;fill:#fff}
.s-title{font-size:21px;font-weight:800;letter-spacing:.2px}
.s-time{margin-inline-start:auto;background:#fff;border:1px solid var(--line);color:var(--muted);font-size:12px;
  font-weight:700;padding:4px 12px;border-radius:999px;white-space:nowrap}
.s-deco{display:flex;gap:6px;align-items:center;opacity:.9}
.s-deco svg{width:18px;height:18px}
.panel{background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px 18px;box-shadow:0 8px 22px rgba(40,60,120,.07)}

/* bullets */
.d-lead{font-size:14px;font-weight:700;color:var(--muted);margin-bottom:10px}
.d-bullets{margin:0;padding:0;list-style:none;display:grid;gap:9px}
.d-bullets li{position:relative;padding:10px 14px 10px 40px;border-radius:12px;font-size:14.5px;font-weight:600;line-height:1.4}
.d-bullets li::before{content:attr(data-mark);position:absolute;inset-inline-start:12px;top:10px;width:22px;height:22px;
  border-radius:50%;background:var(--m,var(--sky));color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
.d-tag{display:inline-block;margin-inline-start:8px;font-size:10.5px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;
  border-radius:999px;padding:2px 9px;vertical-align:middle}

/* plain text / note banner */
.d-text{font-size:14.5px;font-weight:600;line-height:1.5}
.d-note{border-radius:12px;padding:12px 16px;font-size:14.5px;font-weight:600;line-height:1.5}
.d-note .nt{display:block;font-size:12px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;margin-bottom:4px}

/* chips (resources) */
.d-chips{display:flex;flex-wrap:wrap;gap:9px}
.d-chip{border-radius:999px;padding:9px 16px;font-size:13px;font-weight:700}

/* steps */
.d-steps{display:grid;gap:12px}
.d-step{display:flex;gap:14px;align-items:flex-start;background:#fbfcff;border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.d-step .n{flex:0 0 auto;width:34px;height:34px;border-radius:50%;color:#fff;font-weight:800;font-size:15px;
  display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,.14)}
.d-step .st-label{font-weight:800;font-size:15px;margin-bottom:3px}
.d-step .st-body{font-size:13.5px;color:#454b59;font-weight:600;line-height:1.45}

/* Q & A */
.d-qa{display:grid;grid-template-columns:repeat(2,1fr);gap:11px}
.d-qc{background:#fbfcff;border:1px solid var(--line);border-radius:13px;padding:12px 14px}
.d-q{font-weight:800;font-size:13.5px;margin-bottom:5px}
.d-q::before{content:attr(data-mark)" ";font-weight:800}
.d-a{font-size:12.5px;color:var(--muted);font-weight:600}
.d-a::before{content:"→ ";color:var(--mint);font-weight:800}

/* admin fields */
.d-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.d-field{background:#fbfcff;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:600}
.d-field b{color:var(--muted);font-weight:800;text-transform:uppercase;font-size:10.5px;letter-spacing:.3px;display:block;margin-bottom:2px}

/* character cast (fallback visual — points inward at the content) */
.panel.has-char{display:flex;gap:18px;align-items:center}
.char-fig{flex:0 0 auto;width:118px;align-self:center;display:flex;align-items:center;justify-content:center;
  isolation:isolate;border-radius:20px;padding:8px;background:#eef1f8;box-shadow:0 4px 12px rgba(40,60,120,.08)}
.char-fig img{display:block;width:100%;height:auto;max-height:190px;object-fit:contain;mix-blend-mode:multiply}
.char-fig.right img{transform:scaleX(-1)}
.char-body{flex:1;min-width:0}

/* math (KaTeX / MathJax — code-rendered, never image-gen) */
.d-math{display:grid;gap:12px}
.d-mrow{background:#fbfcff;border:1px solid var(--line);border-radius:12px;padding:15px 16px;text-align:center}
.d-mlabel{font-size:12px;font-weight:800;color:var(--muted);margin-bottom:9px;text-transform:uppercase;letter-spacing:.03em}
.d-mformula{overflow-x:auto}
.d-mformula .katex{font-size:1.5em}
.d-mformula svg{max-width:100%;height:auto;vertical-align:middle}
.d-text .katex,.d-note .katex{font-size:1.05em}

/* images */
.d-imgrow{display:grid;gap:14px}
.d-imgrow.n1{grid-template-columns:1fr}
.d-imgrow.n2{grid-template-columns:1fr 1fr}
.d-imgrow.n3{grid-template-columns:1fr 1fr 1fr}
.d-img{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 6px 16px rgba(40,60,120,.08)}
.d-img img{display:block;width:100%;height:230px;object-fit:contain;background:#fff}
.d-img.cover img{object-fit:cover}
.d-img .cap{padding:9px 13px;font-size:13px;font-weight:700;color:var(--ink);text-align:center}
`;

// Section accent palette, rotated by index.
const ACCENTS = ['--coral', '--sky', '--grape', '--mint', '--sun', '--amber'];
const accentFor = (i) => ACCENTS[i % ACCENTS.length];

module.exports = { THEME_CSS, accentFor };
