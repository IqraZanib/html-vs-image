'use strict';
const { fontFaceCss } = require('../fonts/load');
const { tokensCss } = require('./tokens');
const { resolveDirection } = require('./direction');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const LAYOUT_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);color:var(--ink);background:#fff;line-height:1.55;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-font-smoothing:antialiased}
b{font-weight:700;color:var(--coral)}
.sheet{padding:12mm 12mm 14mm}
.lp-header{background:linear-gradient(225deg,var(--sky-soft),#f3fbff);border:3px solid var(--sky-bd);
  border-radius:22px;padding:18px 22px;margin-bottom:16px}
.lp-header h1{font-size:30px;line-height:1.3}
.lp-header .sub{font-size:15px;color:var(--ink-soft);font-weight:700;margin-top:4px}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.meta span{background:#fff;border:2px solid var(--sky-bd);font-size:13px;font-weight:700;padding:4px 11px;border-radius:14px}
.meta span b{color:var(--sky)}
.section{margin-top:18px;break-inside:avoid;page-break-inside:avoid}
.sec-head{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.sec-disc{width:40px;height:40px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;color:#fff}
.sec-title{font-size:22px;font-weight:800}
.time{margin-inline-start:auto;background:#fff;border:2px solid #e7dcb6;color:var(--ink-soft);
  font-size:13px;font-weight:700;padding:4px 12px;border-radius:16px;white-space:nowrap}
.panel{background:#fff;border:3px solid #f0e8cd;border-radius:18px;padding:16px 18px}
.panel + .panel{margin-top:10px}
.lead{font-size:16px;font-weight:600}
.tag{display:inline-block;background:var(--grape);color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;margin-inline-start:6px}
.list{list-style:none}
.list li{font-size:15px;padding-inline-start:22px;position:relative;margin-bottom:6px;font-weight:600;color:#44445c}
.list li::before{content:"\\25CF";position:absolute;inset-inline-start:4px;color:var(--sky);font-size:10px;top:6px}
.note{background:var(--sun-soft);border:2px solid var(--sun-bd);border-inline-start:7px solid var(--sun);
  border-radius:14px;padding:12px 16px;margin-top:12px}
.note .nt{font-size:14px;font-weight:800;color:#8a6d00;margin-bottom:5px}
.note p{font-size:14px;font-weight:600;color:#5f5320}
.subh{font-size:15px;font-weight:800;margin-bottom:8px}
.story{display:flex;gap:14px;align-items:center}
.story + .story{margin-top:10px}
.story .pic{flex:0 0 auto;width:70px;height:70px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:var(--sky-soft)}
.story .bubble{flex:1;background:#fff;border:2.5px solid #eee3c4;border-radius:16px;padding:12px 16px;font-size:15px;font-weight:600}
.grid5{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.wcard{border-radius:18px;padding:14px 8px;text-align:center;border:3px solid var(--sky-bd);background:var(--sky-soft)}
.wcard .disc{width:52px;height:52px;border-radius:50%;background:#fff;margin:0 auto 8px;display:flex;align-items:center;justify-content:center}
.wcard .w{font-size:18px;font-weight:800}
.wcard .m{font-size:12px;color:var(--ink-soft);margin-top:4px;font-weight:600}
.formula{display:flex;align-items:center;justify-content:center;gap:9px;flex-wrap:wrap;background:#fff;border:3px dashed var(--sky);border-radius:16px;padding:14px;margin-top:10px}
.fb{color:#fff;border-radius:14px;padding:9px 16px;text-align:center;background:var(--sky)}
.fb .l{font-size:10px;font-weight:800;opacity:.9}.fb .v{font-size:15px;font-weight:800;margin-top:2px}
.plus{font-size:22px;font-weight:900;color:var(--sun)}
.step{display:flex;gap:12px;margin-top:10px}
.step .badge{flex:0 0 auto;min-width:84px;padding:8px;border-radius:12px;color:#fff;font-size:12px;font-weight:800;
  display:flex;align-items:center;justify-content:center;text-align:center;background:var(--grape)}
.step .body{flex:1;background:#faf7ee;border:2px solid #eee3c4;border-radius:14px;padding:10px 14px;font-size:14px;font-weight:600}
.qa3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}
.qa{background:#fff;border:2.5px solid var(--sky-bd);border-radius:16px;padding:12px}
.qa .q{font-size:13px;font-weight:700}.qa .a{margin-top:8px;background:var(--mint);color:#fff;font-size:13px;font-weight:800;border-radius:10px;padding:6px 10px;text-align:center}
.grid5 .scard{background:#fff;border:2.5px solid #eee3c4;border-radius:16px;overflow:hidden;text-align:center}
.scard .top{height:52px;display:flex;align-items:center;justify-content:center}
.scard .s{font-size:13px;font-weight:700;padding:8px 6px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
.diff{border-radius:16px;padding:14px 16px}
.diff.s{background:var(--sky-soft);border:2.5px solid var(--sky-bd)}.diff.a{background:var(--grape-soft);border:2.5px solid var(--grape-bd)}
.diff p{font-size:14px;font-weight:600}
.afl-note{font-size:14px;font-weight:600;color:var(--ink-soft);margin-bottom:10px}
.grow{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:14px;margin-bottom:8px}
.grow.up{background:var(--mint-soft)}.grow.down{background:var(--coral-soft)}
.grow .t{flex:1;font-size:15px;font-weight:700}
.vb{flex:0 0 auto;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.vb.u{background:var(--mint)}.vb.d{background:var(--coral)}
`;

function buildShell({ headerHtml = '', bodyHtml = '', locale = 'en', title = '' } = {}) {
  const { dir, fontFamily } = resolveDirection(locale);
  return `<!DOCTYPE html><html lang="${esc(locale)}" dir="${dir}"><head><meta charset="UTF-8">` +
    `<title>${esc(title)}</title><style>` +
    `@page{size:A4;margin:0}` +
    fontFaceCss() + '\n' +
    tokensCss() + '\n' +
    `:root{--font:${fontFamily}}` +
    LAYOUT_CSS +
    `</style></head><body><div class="sheet">${headerHtml}${bodyHtml}</div></body></html>`;
}

module.exports = { buildShell, esc };
