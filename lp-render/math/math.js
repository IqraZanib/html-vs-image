'use strict';
// Formula rendering by code (never image-gen — image models drift on notation).
// Two engines: KaTeX (server-side HTML + inlined fonts, default) and MathJax
// (self-contained SVG, no fonts to embed). Both produce deterministic, crisp math.
const fs = require('node:fs');
const path = require('node:path');
const katex = require('katex');
const { esc } = require('../template/shell');

const KATEX_DIST = path.join(__dirname, '..', '..', 'node_modules', 'katex', 'dist');

// ---- KaTeX ----------------------------------------------------------------
function renderKatex(tex, display) {
  return katex.renderToString(String(tex), { displayMode: !!display, throwOnError: false, output: 'html' });
}

// KaTeX needs its stylesheet + fonts. Inline the CSS with every woff2 font as a
// data URI (dropping the woff/ttf fallbacks) so the page is fully self-contained.
let _katexCss = null;
function katexCss() {
  if (_katexCss) return _katexCss;
  let css = fs.readFileSync(path.join(KATEX_DIST, 'katex.min.css'), 'utf8');
  css = css.replace(/,url\(fonts\/[^)]+\.(?:woff|ttf)\)\s*format\("(?:woff|truetype)"\)/g, '');
  css = css.replace(/url\(fonts\/([^)]+\.woff2)\)/g, (_m, f) => {
    const b64 = fs.readFileSync(path.join(KATEX_DIST, 'fonts', f)).toString('base64');
    return `url(data:font/woff2;base64,${b64})`;
  });
  _katexCss = css;
  return _katexCss;
}

// ---- MathJax (tex -> self-contained SVG) ----------------------------------
let _mj = null;
function mj() {
  if (_mj) return _mj;
  const { mathjax } = require('mathjax-full/js/mathjax.js');
  const { TeX } = require('mathjax-full/js/input/tex.js');
  const { SVG } = require('mathjax-full/js/output/svg.js');
  const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
  const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
  const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const doc = mathjax.document('', { InputJax: new TeX({ packages: AllPackages }), OutputJax: new SVG({ fontCache: 'none' }) });
  _mj = { adaptor, doc };
  return _mj;
}
function renderMathjaxSvg(tex, display) {
  const { adaptor, doc } = mj();
  const node = doc.convert(String(tex), { display: !!display });
  return adaptor.innerHTML(node); // the self-contained <svg>
}

// ---- dispatch + inline ----------------------------------------------------
function renderMath(tex, { display = true, engine = 'katex' } = {}) {
  return engine === 'mathjax' ? renderMathjaxSvg(tex, display) : renderKatex(tex, display);
}

// Render a string that may contain inline $...$ / display $$...$$ math; the
// non-math parts are HTML-escaped, the math parts are rendered by the engine.
function richText(raw, { engine = 'katex' } = {}) {
  const s = String(raw == null ? '' : raw);
  return s.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g).map((p) => {
    if (/^\$\$[^$]+\$\$$/.test(p)) return renderMath(p.slice(2, -2), { display: true, engine });
    if (/^\$[^$]+\$$/.test(p)) return renderMath(p.slice(1, -1), { display: false, engine });
    return esc(p);
  }).join('');
}

module.exports = { renderMath, renderKatex, renderMathjaxSvg, katexCss, richText };
