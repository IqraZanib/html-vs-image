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
// non-math parts are HTML-escaped, then light markdown is applied: **bold** (an
// inline sub-heading in the same size), stripped # heading markers, "- " list
// dashes to bullets, and real line breaks for \n. The math parts are rendered by
// the engine.
function mdInline(escaped) {
  let s = escaped
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')      // **bold** -> bold (inline sub-heading)
    .replace(/(^|\n)\s*#{1,6}\s*/g, '$1')            // drop leading #, ##, … heading markers
    .replace(/(^|\n)\s*[-*]\s+/g, '$1• ')            // "- item" / "* item" -> bullet
    .replace(/\n/g, '<br>');                          // newlines -> line breaks
  // A short "Label:" at the start of a line is a sub-heading — bold the label.
  // (Requires whitespace/end after the colon, so times "40:00" and urls "http://" don't match.)
  s = s.replace(/(^|<br>)(\s*)([^:<>\n]{2,42}):(?=\s|<br>|$)/g, '$1$2<b>$3:</b>');
  return s;
}
// An arithmetic run inside RTL Arabic is laid out mirrored: the digits are strong
// Arabic-Number characters but the operators between them are NEUTRAL, so they take
// the paragraph's right-to-left direction and «١٥ ÷ ٥ = ٣» renders as «٣ = ٥ ÷ ١٥».
// The equation on the page then disagrees with the equation the lesson means.
//
// So every arithmetic run gets its own left-to-right, bidi-isolated container. Digits
// on their own (a page number, a count of minutes) are left alone — only a run with an
// operator or an equals sign is maths.
const MATH_RUN = /[٠-٩0-9]+(?:\s*[+\-×÷*/]\s*[٠-٩0-9]+)*\s*=\s*[٠-٩0-9]+|[٠-٩0-9]+\s*[+\-×÷*/]\s*[٠-٩0-9]+/g;

// Belt and braces. CSS direction/unicode-bidi depends on the stylesheet reaching the
// element and on the renderer honouring it; the Unicode isolate characters do not.
// U+2066 LEFT-TO-RIGHT ISOLATE … U+2069 POP DIRECTIONAL ISOLATE force the run to be
// laid out left-to-right as its own isolated unit, whatever the surrounding paragraph
// direction is, and they survive into any consumer of the HTML.
const LRI = '\u2066';
const PDI = '\u2069';

function isolateMath(html) {
  // Runs on ESCAPED html, so it must not break entities or tags: the pattern only
  // matches digits, operators and spaces, none of which appear inside a tag name.
  // NOTE: do NOT add U+2066/U+2069 here. Measured: a Unicode isolate INSIDE an
  // isolate-override container re-enables normal bidi resolution for its content, and
  // Arabic-Indic digits then order right-to-left again — it reverses the equation.
  // The CSS override alone is what produces the correct order.
  return html.replace(MATH_RUN, (m) => `<bdi class="ltr-math" dir="ltr">${m}</bdi>`);
}

function richText(raw, { engine = 'katex' } = {}) {
  const s = String(raw == null ? '' : raw);
  return s.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g).map((p) => {
    if (/^\$\$[^$]+\$\$$/.test(p)) return renderMath(p.slice(2, -2), { display: true, engine });
    if (/^\$[^$]+\$$/.test(p)) return renderMath(p.slice(1, -1), { display: false, engine });
    return isolateMath(mdInline(esc(p)));
  }).join('');
}

// Strip markdown noise from a heading/label so "## **Journey**" renders as "Journey".
function cleanHeading(raw) {
  return String(raw == null ? '' : raw).replace(/[*_`#]+/g, '').replace(/\s+/g, ' ').trim();
}

module.exports = { renderMath, renderKatex, renderMathjaxSvg, katexCss, richText, cleanHeading, isolateMath, MATH_RUN, LRI, PDI };
