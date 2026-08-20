'use strict';
// Figure validation — the accuracy net for the AI-artwork + code-visual split.
//
// A code-rendered SVG draws exactly what it is told, so correctness moves upstream:
// the VALUES must be right. These checks run on a condensed guide (optionally with
// the source lesson and the generated image dimensions) and return findings the
// caller logs, surfaces to the reviewer, or fails on.
//
// Levels: 'fail' = ship-blocking (wrong mathematics, unreadable figure),
//         'warn' = review-worthy (value not corroborated by the source, small art).
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toLatinDigits = (s) => String(s == null ? '' : s).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
const hasArabicLetters = (s) => /[ء-غف-ي]/.test(String(s || ''));
// A label may legitimately be a number («٦», «٢/٤») — Eastern numerals count as
// Arabic script for label checks, so a numeric label is not flagged as non-Arabic.
const isArabicLabel = (s) => /[ء-غف-ي٠-٩]/.test(String(s || ''));

// Every "a/b" pair in a string, as numbers (Eastern or Latin digits).
function fractionsIn(text) {
  const t = toLatinDigits(text);
  const out = [];
  for (const m of t.matchAll(/(\d+)\s*\/\s*(\d+)/g)) out.push([Number(m[1]), Number(m[2])]);
  return out;
}
// All standalone integers in a string (Eastern or Latin digits).
function numbersIn(text) {
  return (toLatinDigits(text).match(/\d+/g) || []).map(Number);
}
// The text a lesson could legitimately draw its values from.
function sourceText(source) {
  if (!source) return '';
  const parts = [];
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === 'string') { parts.push(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object') { Object.values(v).forEach(walk); return; }
    parts.push(String(v));
  };
  walk(source.sections);
  walk(source.meta);
  if (typeof source === 'string') parts.push(source);
  return parts.join(' \n ');
}

const MIN_ART_WIDTH = 700; // px: below this, artwork visibly softens at LP print size

function validateFigures(guide, { source = null, imageDims = {}, log = null, mode = process.env.LP_FIGURE_MODE || 'labeled' } = {}) {
  const hybrid = mode === 'hybrid'; // textless-artwork checks apply to hybrid only
  const findings = [];
  const add = (level, code, message, section) => findings.push({ level, code, message, section: section || null });
  const src = sourceText(source);
  const srcFractions = fractionsIn(src);
  const srcNumbers = new Set(numbersIn(src));

  // Language sanity: Arabic text with a non-Arabic locale renders the page LTR and
  // asks the image model for English labels — a whole-page failure, so it fails hard.
  {
    const AR = ['ar', 'ur', 'sd', 'fa', 'ps'];
    const loc = String((guide && guide.meta && guide.meta.locale) || '').toLowerCase();
    if (/[\u0621-\u064A]/.test(JSON.stringify((guide && guide.sections) || [])) && !AR.includes(loc)) {
      add('fail', 'locale_mismatch', `guide text is Arabic but meta.locale is "${loc || 'missing'}" — the page would render left-to-right with English figure labels`, null);
    }
  }
  const sections = Array.isArray(guide && guide.sections) ? guide.sections : [];
  const images = Array.isArray(guide && guide.images) ? guide.images : [];
  const imById = new Map(images.map((im) => [im.id, im]));

  // ── AI artwork: briefs must be artwork-only, and the art must be big enough ──
  for (const im of images) {
    const p = String(im.prompt || '');
    if (hybrid) {
      if (!/no text|no letters|wordless/i.test(p)) {
        add('fail', 'art_not_textless', `image "${im.id}": brief does not forbid text — artwork must be wordless in hybrid mode`, null);
      }
      if (hasArabicLetters(p)) {
        add('warn', 'art_brief_has_arabic', `image "${im.id}": brief contains Arabic — a wordless brief should be English-only`, null);
      }
      if (/labeled infographic|label every part|labels must be spelled/i.test(p)) {
        add('fail', 'art_asks_labels', `image "${im.id}": brief asks for labels while claiming to be textless (contradictory contract)`, null);
      }
      if (/blank cards?|empty box|placeholder|answer slot|counters visible|blank slots?/i.test(p)) {
        add('warn', 'brief_invites_placeholders', `image "${im.id}": brief asks for blank cards/boxes/placeholders — the model draws those, and boxes and = signs are teaching content that belongs in code`, null);
      }
    } else if (/no text|no letters|wordless/i.test(p)) {
      // Labeled mode: the figure is supposed to carry its own Arabic labels.
      add('warn', 'art_forbids_text_in_labeled_mode', `image "${im.id}": brief forbids text while the design set expects in-image Arabic labels`, null);
    }
    const dim = imageDims[im.id];
    if (dim && dim.width && dim.width < MIN_ART_WIDTH) {
      add('warn', 'art_low_res', `image "${im.id}": ${dim.width}×${dim.height}px is small for its printed size — may look soft`, null);
    }
    if (!String(im.label || '').trim()) {
      add('warn', 'art_no_label', `image "${im.id}": no Arabic caption supplied for the code-rendered label`, null);
    }
  }

  // ── Code visuals: internal consistency, then agreement with the source ──
  const checkCodeFigure = (cf, sectionId, where) => {
    const at = `${sectionId}${where ? ' (' + where + ')' : ''}`;
    switch (cf.kind) {
      case 'fraction-grid': {
        if (!(cf.shaded <= cf.parts)) add('fail', 'shaded_gt_parts', `${at}: ${cf.shaded} shaded of ${cf.parts} parts is impossible`, sectionId);
        const labelFr = fractionsIn(cf.label);
        for (const [n, d] of labelFr) {
          if (d !== cf.parts || n !== cf.shaded) {
            add('fail', 'label_mismatch', `${at}: label "${cf.label}" disagrees with the drawing (${cf.shaded} of ${cf.parts})`, sectionId);
          }
        }
        if (labelFr.length && srcFractions.length) {
          const [n, d] = labelFr[0];
          if (!srcFractions.some(([sn, sd]) => sn === n && sd === d)) {
            add('warn', 'value_not_in_source', `${at}: fraction ${n}/${d} does not appear in the lesson source — verify against the textbook`, sectionId);
          }
        }
        break;
      }
      case 'count-set': {
        if (!(cf.shaded <= cf.total)) add('fail', 'shaded_gt_total', `${at}: ${cf.shaded} highlighted of ${cf.total} objects is impossible`, sectionId);
        for (const [n, d] of fractionsIn(cf.label)) {
          if (d !== cf.total || n !== cf.shaded) {
            add('fail', 'label_mismatch', `${at}: label "${cf.label}" disagrees with the drawing (${cf.shaded} of ${cf.total})`, sectionId);
          }
        }
        if (srcNumbers.size && !srcNumbers.has(cf.total)) {
          add('warn', 'count_not_in_source', `${at}: total ${cf.total} does not appear in the lesson source`, sectionId);
        }
        break;
      }
      case 'compass': {
        const labels = [cf.north, cf.east, cf.south, cf.west].map((s) => String(s || '').trim());
        if (labels.some((s) => !s)) add('fail', 'compass_missing_label', `${at}: all four directions need a label`, sectionId);
        if (new Set(labels.filter(Boolean)).size !== labels.filter(Boolean).length) {
          add('fail', 'compass_duplicate_label', `${at}: two directions carry the same label`, sectionId);
        }
        for (const s of labels) if (s && !isArabicLabel(s)) add('warn', 'compass_label_not_arabic', `${at}: direction label "${s}" is not Arabic`, sectionId);
        break;
      }
      case 'compare': {
        const items = Array.isArray(cf.items) ? cf.items : [];
        if (items.length < 2) add('fail', 'compare_too_few', `${at}: a comparison needs at least two bars`, sectionId);
        if (items.length >= 2 && items.every((it) => Math.abs(it.len - items[0].len) < 0.02)) {
          add('fail', 'compare_no_contrast', `${at}: all bars are the same length — nothing is being compared`, sectionId);
        }
        for (const it of items) if (!isArabicLabel(it.label)) add('warn', 'compare_label_not_arabic', `${at}: bar label "${it.label}" is not Arabic`, sectionId);
        break;
      }
      case 'process': {
        const st = Array.isArray(cf.stages) ? cf.stages : [];
        if (st.length < 3 || st.length > 6) add('fail', 'process_stage_count', `${at}: a process needs 3–6 stages, got ${st.length}`, sectionId);
        const labels = st.map((x) => String((x && x.label) || '').trim());
        if (labels.some((l) => !l)) add('fail', 'process_stage_unlabelled', `${at}: every stage needs a label`, sectionId);
        if (new Set(labels).size !== labels.length) add('fail', 'process_stage_duplicate', `${at}: a stage label is repeated — the sequence would loop on itself`, sectionId);
        for (const l of labels) if (l && !isArabicLabel(l)) add('warn', 'process_label_not_arabic', `${at}: stage label "${l}" is not Arabic`, sectionId);
        // Stage names must come from the lesson, and in the lesson's own order.
        if (src) {
          const missing = labels.filter((l) => l && !src.includes(l));
          if (missing.length) add('warn', 'process_stage_not_in_source', `${at}: stage(s) ${missing.map((m) => '«' + m + '»').join(', ')} do not appear in the lesson source — verify against the textbook`, sectionId);
          const pos = labels.map((l) => src.indexOf(l)).filter((i) => i >= 0);
          const ordered = pos.every((p, i) => i === 0 || p >= pos[i - 1]);
          if (pos.length >= 3 && !ordered) add('warn', 'process_order_differs', `${at}: the stage order differs from the order they appear in the source — check the sequence`, sectionId);
        }
        break;
      }
      case 'expression': {
        if (!String(cf.text || '').trim()) add('fail', 'expression_empty', `${at}: expression has no text`, sectionId);
        const fr = fractionsIn(cf.text);
        if (fr.length && srcFractions.length) {
          const [n, d] = fr[0];
          if (!srcFractions.some(([sn, sd]) => sn === n && sd === d)) {
            add('warn', 'value_not_in_source', `${at}: expression ${n}/${d} does not appear in the lesson source — verify it`, sectionId);
          }
        }
        break;
      }
      default:
        add('fail', 'unknown_kind', `${at}: unknown visual kind "${cf.kind}"`, sectionId);
    }
  };

  for (const s of sections) {
    if (!s) continue;
    if (s.codeFigure) {
      const cf = s.codeFigure;
      if (cf.kind === 'error-board') {
        if (!cf.wrong || !cf.correct) add('fail', 'board_incomplete', `${s.id}: the board needs both a wrong and a correct side`, s.id);
        else {
          if (JSON.stringify(cf.wrong) === JSON.stringify(cf.correct)) {
            add('fail', 'board_identical', `${s.id}: both halves of the board are identical — the mistake is not contrasted`, s.id);
          }
          checkCodeFigure(cf.wrong, s.id, 'wrong side');
          checkCodeFigure(cf.correct, s.id, 'correct side');
          // The ✓ side must be the one the source supports.
          const cFr = fractionsIn(cf.correct.text || cf.correct.label);
          const wFr = fractionsIn(cf.wrong.text || cf.wrong.label);
          if (cFr.length && wFr.length && srcFractions.length) {
            const inSrc = ([n, d]) => srcFractions.some(([sn, sd]) => sn === n && sd === d);
            if (!inSrc(cFr[0]) && inSrc(wFr[0])) {
              add('fail', 'board_reversed', `${s.id}: the ✓ side (${cFr[0].join('/')}) is not in the source but the ✗ side (${wFr[0].join('/')}) is — the sides look reversed`, s.id);
            }
          }
          if (!String(cf.labelWrong || '').trim() || !String(cf.labelCorrect || '').trim()) {
            add('warn', 'board_no_captions', `${s.id}: board halves have no Arabic captions`, s.id);
          }
        }
      } else {
        checkCodeFigure(cf, s.id, '');
      }
    }
    for (const f of ['image', 'imageWrong', 'imageCorrect']) {
      if (s[f] && !imById.has(s[f])) add('fail', 'dangling_image_ref', `${s.id}: references image "${s[f]}" which is not declared`, s.id);
    }
  }

  // ── Teacher-review gates (Yemen A/B study, 15 teachers) ────────────────────
  // Only meaningful for a COMPLETE guide: a fixture or partial object has no stages.
  // A real guide has all twelve template sections; a focused fixture has a few.
  if (sections.length >= 6 && sections.some((s) => s && /^stage-/.test(String(s.id || '')))) {
    // 1. A missing answer key was one of the study's hard failures.
    const sol = sections.find((s) => s && s.id === 'solutions');
    const solItems = sol && Array.isArray(sol.items) ? sol.items.filter((it) => it && (it.text || it.body)) : [];
    if (!sol) add('fail', 'answers_missing', 'no solutions section — the lesson ships without an answer key', 'solutions');
    else if (!solItems.length) add('fail', 'answers_empty', 'the solutions section carries no answers', 'solutions');

    // 2. Mixed numerals: teachers flagged ١٢٣ appearing beside 123.
    const readable = sections.filter((s) => s && s.id !== 'lesson-line')
      .map((s) => JSON.stringify(s)).join(' ');
    const hasEastern = /[٠-٩]/.test(readable);
    const latinInArabic = (readable.match(/[ء-ي][^"]{0,12}?\d/g) || []).length;
    if (hasEastern && latinInArabic > 0) {
      add('warn', 'mixed_numerals', `Arabic text mixes Latin digits with Eastern numerals in ${latinInArabic} place(s) — teachers flagged this as confusing`, null);
    }

    // 3. A figure with no caption leaves the pupil guessing what it shows.
    for (const s of sections) {
      if (s && s.codeFigure && s.codeFigure.kind !== 'error-board'
          && !String(s.codeFigure.caption || '').trim() && !String(s.codeFigure.label || '').trim()) {
        add('warn', 'figure_no_caption', `${s.id}: code figure has neither a label nor a caption`, s.id);
      }
    }
  }
  const fails = findings.filter((f) => f.level === 'fail');
  if (log) {
    if (!findings.length) log('  ✓ figure validation: no findings');
    else for (const f of findings) log(`  ${f.level === 'fail' ? '✗' : '⚠'} ${f.code}: ${f.message}`);
  }
  return { ok: fails.length === 0, findings, fails: fails.length, warns: findings.length - fails.length };
}

module.exports = { validateFigures, fractionsIn, numbersIn, toLatinDigits, MIN_ART_WIDTH };
