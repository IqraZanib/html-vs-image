'use strict';
// ICT (NIETE) design pack — grades 6–12, Islamabad Capital Territory.
//
// The look is ICT's own PRODUCTION template (NIETE-Rumi bot/vendor/lp-v9, v9.3 "phone page",
// with the v6 two-page print the operator approved on 2026-09-24), re-expressed as a skin over
// this renderer. The numbers below are MEASURED from ICT's own renderer, not chosen: its HTML
// was laid out at 520px and every size, weight, colour and gap read back with
// getComputedStyle. See DESIGN.md for the table and the method.
//
// Nothing here is imported from the Yemen, Kenya or Tanzania packs, and nothing in those packs
// can see these rules: every selector below is scoped to a class only the lp_doc adapter emits
// (ict, ict-st-*, ict-r-*) or to the page chrome of a page that loaded this pack, and the pack is
// loaded only for meta.region "ict".
//
// WHERE THE CLASSES COME FROM. lp-render/guide/from-lpdoc.js tags each card with
//   ict                 every card this adapter made
//   ict-st ict-st-<s>   the stage it belongs to (introduction … homework, or p2 on the
//                       support page), which picks the band colour
//   ict-r-<role>        the lp_doc block it came from (hook, watch, worked, practice …),
//                       which picks the surface
//
// GOTCHA (see the repo CLAUDE.md; it bit Yemen and Kenya): render.js stamps INLINE styles on
// the section tab (background), every .panel (border-color), every .d-note (gradient and
// start border), every .d-tag and every duo column. Inline beats a stylesheet, so each of
// those needs !important here. Never put a backtick in a comment inside this template
// literal: it ends the string and the pack fails to load.

// INTER, EMBEDDED HERE AND NOWHERE ELSE. ICT's page is set in Inter. Adding it to the shared
// font loader would put ~70 KB of base64 into every region's page; carried in this pack, it
// reaches ICT's pages only. Read once at load from @fontsource/inter (latin 400/600/700 — the
// three weights ICT itself embeds).
const fs = require('node:fs');
const path = require('node:path');
function interFaces() {
  const dir = path.join(__dirname, '..', '..', '..', '..', 'node_modules', '@fontsource', 'inter', 'files');
  return [400, 600, 700].map((w) => {
    const f = path.join(dir, `inter-latin-${w}-normal.woff2`);
    if (!fs.existsSync(f)) return '';
    return `@font-face{font-family:'Inter';font-weight:${w};font-display:swap;`
      + `src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')}) format('woff2');}`;
  }).join('');
}
// THE ﷺ LIGATURE (U+FDFA) paints about 3.2em of ink in Nastaliq — more than any line box can
// hold, so it lands on the lines above and below. ICT wraps it in a span scaled to 0.61em
// (lib/rich.js, bd-oak77); this renderer escapes all markup, so the same scale is applied as a
// font face that covers that ONE code point: the bundled Naskh face at size-adjust 85% (Naskh
// draws it more compactly than Nastaliq, so 0.61em read too small). Every other character falls
// through to the page's own font.
function salawatFace() {
  const f = path.join(__dirname, '..', '..', '..', '..', 'node_modules', '@fontsource', 'noto-naskh-arabic', 'files',
    'noto-naskh-arabic-arabic-400-normal.woff2');
  if (!fs.existsSync(f)) return '';
  return `@font-face{font-family:'ICT Salawat';font-display:block;unicode-range:U+FDFA;size-adjust:85%;`
    + `src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')}) format('woff2');}`;
}

// ICT's delivery page: 520px wide (v9.3 PAGE_FORMATS.phone), and the PDF prints each PART —
// the lesson, then the teacher support — on one page as tall as the part (v6, lib/continuous.js).
const PAGE_WIDTH = 520;

const THEME_OVERRIDE_CSS = interFaces() + salawatFace() + `
:root{
  --navy:#0B2545; --navy2:#13315C; --amber:#F2A20C; --amber-soft:#FDEBC8;
  --ict-ink:#1a2233; --mut:#5b6472; --ict-line:#e5e9f0; --leaf:#1F7A4D; --warn:#B4531F;
  --s-teach:#F2F6FC; --s-teach-line:#CBD8E8; --s-teach-ink:#13315C;
  --s-do:#EFF7F2;    --s-do-line:#BFE3CD;    --s-do-ink:#14603A;
  --s-watch:#FCEDE6; --s-watch-line:#F2C4AD; --s-watch-ink:#B4531F;
  --s-note:#FFF8E8;  --s-note-line:#F0DFB4;  --s-note-ink:#8A5F04;
  --s-quiet:#F5F7FA; --s-quiet-line:#E1E6EE; --s-quiet-ink:#414A57;
  --r-1:6px; --r-2:9px;
  /* ICT's type ladder at the phone page: body 21, list rows 19.25, chrome 16.33 */
  --fs-body:21px; --fs-row:19.25px; --fs-lbl:16.33px; --lh:1.55;
}
/* ── the page: one 520px column, white, 21px margins ─────────────────────────────── */
html,body{overflow-x:hidden;background:#fff}
.sheet{width:${PAGE_WIDTH}px;max-width:100%;margin:0 auto;padding:10px 0 4px;background:#fff;box-sizing:border-box}
html[lang="en"] body{font-family:'ICT Salawat',Inter,'Noto Sans',system-ui,sans-serif}
html[lang="ur"] body{font-family:'ICT Salawat','Noto Nastaliq Urdu',Inter,sans-serif}
body{color:var(--ict-ink);font-size:var(--fs-body)}
.body{padding:0 21px}
.section{margin:8px 0 0}
/* ── hero: navy block, amber kicker over the title, then the locator lines and the exam chip ── */
.lp-header{background:var(--navy) !important;border-radius:var(--r-2);margin:0 21px;padding:8px 14px;box-shadow:none;
  display:flex;flex-direction:column;align-items:stretch;min-height:0}
.lp-header .hbwrap,.lp-header .deco{display:none !important}
.lp-header .sub{order:-1;color:var(--amber);font-size:var(--fs-lbl);font-weight:800;letter-spacing:.13em;text-transform:uppercase;
  line-height:1.3;text-shadow:none;opacity:1;margin:0}
.lp-header h1{font-size:33.25px;font-weight:800;line-height:1.05;letter-spacing:0;text-shadow:none;color:#fff;margin:3px 0 0}
.lp-header .meta{display:flex;flex-direction:column;align-items:flex-start;gap:0;margin:6px 0 0}
.lp-header .meta span{background:none;border:0;padding:0;border-radius:0;font-size:16.92px;font-weight:400;line-height:1.55;color:#C9D4E6}
.lp-header .meta span:nth-child(3){margin:3px 0 2px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.35);
  color:#DBE5F3;border-radius:999px;padding:3px 9px;font-size:var(--fs-lbl);font-weight:800;letter-spacing:.06em;line-height:1.35}
.lp-header .meta b{display:none}
/* ── section bars: a solid block in the section's own colour, a letter badge, the minutes ── */
.ict-st-introduction{--band:#0F6A73;--letter:'I'}
.ict-st-development{--band:#0B2545;--letter:'D'}
.ict-st-activity{--band:#1F7A4D;--letter:'A'}
.ict-st-conclusion{--band:#584A93;--letter:'C'}
.ict-st-homework{--band:#5b6472;--letter:'H'}
.ict-st > .s-head{background:var(--band);border-radius:var(--r-1);padding:4px 11px;margin:8px 0 8px;gap:8px;min-height:36px;box-sizing:border-box}
.ict-st .s-tab{background:transparent !important;box-shadow:none;padding:0;gap:8px;border-radius:0}
.ict-st .s-ic{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.22)}
.ict-st .s-ic svg{display:none}
.ict-st .s-ic::before{content:var(--letter);color:#fff;font-weight:800;font-size:15px;line-height:1}
.ict-st .s-title{color:#fff;font-size:20.42px;font-weight:800;letter-spacing:.02em;line-height:1.3}
.ict-st .s-time{background:none;border:0;padding:0;color:#fff;font-size:18.08px;font-weight:800;letter-spacing:.03em}
/* support page: a lettered navy badge and the name in capitals, a hairline after it */
.ict-p2-a{--letter:'A'} .ict-p2-b{--letter:'B'} .ict-p2-c{--letter:'C'} .ict-p2-d{--letter:'D'}
.ict-p2-e{--letter:'E'} .ict-p2-f{--letter:'F'} .ict-p2-g{--letter:'G'}
.ict-st-p2 > .s-head{background:none;padding:0;margin:8px 0 6px;min-height:0;border-radius:0}
.ict-st-p2 > .s-head::after{content:'';flex:1;height:2px;background:var(--ict-line)}
.ict-st-p2 .s-ic{width:21px;height:21px;background:var(--navy);border-radius:var(--r-1)}
.ict-st-p2 .s-ic::before{font-size:14px}
.ict-st-p2 .s-title{color:var(--navy);text-transform:uppercase;font-size:19.83px;letter-spacing:.03em}
/* ── cards: one hairline, one radius; the ROLE picks the surface ─────────────────── */
.ict .panel{border:1px solid var(--ict-line) !important;border-radius:var(--r-2);padding:7px 12px;box-shadow:none;background:#fff}
.ict .d-note{background:none !important;border-inline-start:0 !important;border-radius:0;padding:0}
.ict .d-text,.ict .d-note,.ict .d-bullets li,.ict .cc-b,.ict .d-q,.ict .d-a{font-size:var(--fs-body);font-weight:400;line-height:var(--lh);color:var(--ict-ink)}
.ict .d-text b,.ict .d-note b,.ict .d-bullets li b{font-weight:700}
/* a card's label: small capitals in the role's ink */
.ict .d-note .nt{display:block;color:var(--navy2) !important;font-size:var(--fs-lbl);font-weight:800;letter-spacing:.09em;
  text-transform:uppercase;line-height:1.35;margin:0 0 2px}
/* a group's label, above the cards it heads: the same capitals with an amber rule */
.ict .d-lead,.ict-r-grouplabel .d-text{color:var(--navy2);font-size:var(--fs-lbl);font-weight:800;letter-spacing:.09em;text-transform:uppercase;
  line-height:1.35;border-inline-start:3px solid var(--amber);padding-inline-start:7px;margin:0 0 4px}
.ict-r-grouplabel .panel{border:0 !important;background:none;padding:0}
.ict .d-bullets{gap:4px}
.ict .d-bullets li{padding-inline-start:19px}
.ict .d-bullets li::before{color:var(--navy2);font-weight:800;font-size:var(--fs-row);line-height:1.55}
/* a numbered row reads "1." as ICT prints it, with room for two digits and the stop */
.ict-r-warmup .d-bullets li::before,.ict-r-practice .d-bullets li::before,.ict-r-hw .d-bullets li::before,
.ict-r-exit .d-bullets li::before,.ict-r-draworder .d-bullets li::before{content:attr(data-mark) "."}
.ict-r-practice .d-bullets li,.ict-r-exit .d-bullets li{padding-inline-start:27px}
/* a row's tag (the warm-up kind, the practice tier) sits at the end of the row's last line when it
   fits there, and on a line of its own at the end side when it does not — ICT's wrapping row */
.ict .d-bullets li:has(> .d-tag){display:flow-root}
.ict .d-tag{display:inline-block;float:inline-end;background:none !important;color:var(--mut) !important;font-size:var(--fs-lbl);font-weight:700;
  letter-spacing:.02em;text-transform:none;padding:0;margin:0;margin-inline-start:9px;border-radius:0;line-height:1.95}
/* A bolded first line is set as a block, so the line break after it would open a blank line. */
.ict-r-outcome .d-note > b:first-of-type + br,.ict-r-hook .d-note > b:first-of-type + br,
.ict-r-ask .d-note > b:first-of-type + br,.ict-r-checkpoint .d-note > b:first-of-type + br,
.ict-r-mistakes .d-q > b:first-child + br,.ict-r-mistakes .d-a > b:first-child + br,
.ict-r-diff .d-bullets li > b:first-child + br,.ict-r-p2head .d-text > br,
.d-sub.ict-r-figure .d-note > b:first-of-type + br{display:none}
/* ── page 1 furniture ──────────────────────────────────────────────────────────────── */
/* the sequence strip: where the class came from, this lesson (in navy), the checkpoint */
.ict-r-seq .panel{background:var(--s-quiet);border-color:var(--s-quiet-line) !important;padding:5px 12px}
.ict-r-seq .d-text{font-size:18.67px;line-height:1.5;color:var(--mut)}
.ict-r-seq .d-text b{color:var(--navy2);font-weight:800}
/* the outcome: amber, a thick amber edge, the outcome itself larger, the promise under it */
.ict-r-outcome .panel{background:var(--amber-soft);border:0 !important;border-inline-start:6px solid var(--amber) !important;padding:8px 14px}
.ict-r-outcome .d-note{font-size:19.83px;font-weight:600;color:#6B5312}
.ict-r-outcome .d-note .nt{color:var(--s-note-ink) !important}
.ict-r-outcome .d-note > b:first-of-type{display:block;font-size:21.58px;font-weight:600;color:#3A2C0A;margin:1px 0 2px}
.ict-r-outcome .d-note b{font-weight:900}
/* the resource rows: video amber, materials green, pacing blue, key words grey — icon, label, value */
.ict-r-rvideo,.ict-r-rmat,.ict-r-rpace{margin-top:6px}
.ict-r-rvideo .panel,.ict-r-rmat .panel,.ict-r-rpace .panel{padding:6px 11px}
.ict-r-rvideo .panel{background:var(--s-note);border-color:var(--s-note-line) !important}
.ict-r-rmat .panel{background:var(--s-do);border-color:var(--s-do-line) !important}
.ict-r-rpace .panel{background:var(--s-teach);border-color:var(--s-teach-line) !important}
.ict-r-rvideo .d-text,.ict-r-rmat .d-text,.ict-r-rpace .d-text{font-size:var(--fs-row);line-height:1.55}
.ict-r-rvideo .d-text b,.ict-r-rmat .d-text b,.ict-r-rpace .d-text b{font-size:var(--fs-lbl);font-weight:700;letter-spacing:.09em;
  text-transform:uppercase;margin:0 6px}
.ict-r-rvideo .d-text b{color:var(--s-note-ink)} .ict-r-rmat .d-text b{color:var(--s-do-ink)} .ict-r-rpace .d-text b{color:var(--s-teach-ink)}
.ict-r-rvideo .d-text{color:var(--s-note-ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
.ict-r-rvideo .d-text b{text-decoration:none;display:inline-block}
.ict-r-keywords{margin-top:6px}
.ict-r-keywords .panel{background:var(--s-quiet);border-color:var(--s-quiet-line) !important;padding:6px 11px}
.ict-r-keywords .d-lead{color:var(--s-quiet-ink);font-weight:700}
.ict-r-keywords .d-bullets{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin-top:4px}
.ict-r-keywords .d-bullets li{padding:2px 11px;border:1px solid var(--s-quiet-line);border-radius:var(--r-1);background:#fff;
  font-size:var(--fs-row);color:var(--mut)}
.ict-r-keywords .d-bullets li::before{display:none}
.ict-r-keywords .d-bullets li b{color:var(--navy2);font-weight:800}
/* ── the teaching blocks ─────────────────────────────────────────────────────────── */
/* the warm-up: one amber row per question, the number in amber, the answer in green */
.ict-r-warmup .panel,.ict-r-hw .panel,.ict-r-practice .panel,.ict-r-exit .panel{border:0 !important;background:none;padding:0}
.ict-r-warmup .d-bullets li{background:var(--s-note);border:1px solid var(--s-note-line);border-radius:var(--r-1);padding:3px 10px;padding-inline-start:36px}
.ict-r-warmup .d-bullets li::before{color:var(--s-note-ink);inset-inline-start:10px;top:3px}
.ict-r-warmup .d-bullets li b,.ict-r-practice .d-bullets li b,.ict-r-exit .d-bullets li b,.ict-r-hwkey .d-bullets li b,
.ict-r-faded .d-note b{color:var(--leaf)}
/* the hook and the checkpoint: the two navy landmarks of page 1 */
.ict-r-hook .panel,.ict-r-checkpoint .panel,.ict-r-coach .panel,.ict-r-srq .panel{background:var(--navy);border:0 !important;padding:9px 14px}
.ict-r-hook{margin-top:12px} .ict-r-checkpoint{margin-top:12px}
.ict-r-hook .d-note,.ict-r-checkpoint .d-note,.ict-r-srq .d-note{color:#C9D4E6;font-size:18.67px}
.ict-r-hook .d-note .nt,.ict-r-checkpoint .d-note .nt,.ict-r-srq .d-note .nt{color:var(--amber) !important}
.ict-r-hook .d-note b,.ict-r-checkpoint .d-note b,.ict-r-srq .d-note b{color:#fff}
.ict-r-hook .d-note > b:first-of-type,.ict-r-checkpoint .d-note > b:first-of-type{display:block;
  font-size:22.17px;font-weight:700;line-height:1.55;margin:3px 0 2px}
.ict-r-checkpoint .d-note{color:#fff;font-size:var(--fs-body)}
/* the short-response card holds the question alone, set bold in white, maths included */
.ict-r-srq .d-note{color:#fff;font-size:var(--fs-body);font-weight:700}
/* the plain question: blue, a navy edge */
.ict-r-ask .panel{background:var(--s-teach);border:0 !important;border-inline-start:4px solid var(--navy2) !important}
.ict-r-ask .d-note > b:first-of-type{display:block;font-size:var(--fs-body);color:var(--navy2)}
/* the textbook citation: a small blue pill */
.ict-r-cite .panel{display:inline-block;background:var(--s-teach);border:0 !important;border-radius:999px;padding:2px 9px}
.ict-r-cite .d-text{font-size:var(--fs-lbl);font-weight:700;letter-spacing:.01em;color:var(--navy2);line-height:1.55}
/* warnings, misconceptions, the re-teach rule: terracotta */
.ict-r-watch{margin-top:12px}
.ict-r-watch .panel,.ict-r-reteach .panel,.d-sub.ict-r-watch{background:var(--s-watch);border-color:var(--s-watch-line) !important}
.ict-r-watch .d-note .nt,.ict-r-reteach .d-note .nt{color:var(--s-watch-ink) !important}
/* the board: grey, a slate edge */
.ict-r-board .panel{background:var(--s-quiet);border:0 !important;border-inline-start:4px solid var(--s-quiet-ink) !important;padding:7px 13px}
.ict-r-board .d-note .nt{color:var(--s-quiet-ink) !important}
/* key points: a labelled list, no card */
.ict-r-keypoints .panel,.ict-r-para .panel{border:0 !important;background:none;padding:0}
.ict-r-draworder .panel{border:1px solid var(--ict-line) !important;border-radius:var(--r-1);padding:3px 10px}
.ict-r-draworder .d-lead{border:0;padding:0;margin:0 0 4px}
.ict-r-draworder .d-bullets li{padding-inline-start:27px}
/* worked example (amber) and the faded one (green): a pill label */
.ict-r-worked .panel{background:var(--s-note);border-color:var(--s-note-line) !important;padding:7px 12px}
.ict-r-faded .panel,.ict-r-chem .panel,.ict-r-latex .panel{background:var(--s-do);border-color:var(--s-do-line) !important;padding:6px 11px}
.ict-r-worked .d-note .nt,.ict-r-faded .d-note .nt{display:table;color:#fff !important;background:var(--amber);letter-spacing:.06em;
  border-radius:999px;padding:3px 11px;margin:0 0 6px}
.ict-r-faded .d-note .nt{background:var(--leaf)}
.ict-r-worked .d-note b{color:var(--leaf)}
/* display maths: a green block, the formula centred and a little larger */
.ict-r-latex{margin-top:12px}
.ict .d-mrow{background:none;border:0;padding:4px 0 0;display:flex;flex-direction:column-reverse;gap:4px}
/* a flex item's min-width is its content by default, which let a long formula push the card
   past the page edge; the formula stays inside its card and scrolls nothing */
.ict .d-mformula{min-width:0;max-width:100%}
.ict .d-mformula .katex{font-size:1.24em}
.ict-math-wrap .d-text{text-align:center;line-height:1.45}
.ict-math-wrap .d-text .katex{font-size:1.24em}
.ict .d-mlabel{text-transform:none;letter-spacing:0;font-size:15.5px;font-weight:500;color:#3F6B53;margin:0}
.ict .d-mformula svg{max-width:100%}
/* practice and the exit ticket: a pill label, answers in green */
.ict-r-practice .d-lead,.ict-r-exit .d-lead,.ict-r-hw .d-lead{display:inline-block;border:1px solid var(--s-do-line);background:var(--s-do);
  color:var(--s-do-ink);border-radius:999px;padding:2px 11px;margin-bottom:6px}
.ict-r-exit .panel{background:var(--s-do);border:1px solid var(--s-do-line) !important;padding:6px 12px}
.ict-r-exit .d-lead{border:0;background:none;padding:0;border-radius:0}
.ict-r-practice .d-bullets{gap:8px}
/* misconceptions: one card each, what the pupil writes over the question you ask back */
.ict-r-mistakes .panel{border:0 !important;background:none;padding:0}
.ict-r-mistakes .d-qa{display:flex;flex-direction:column;gap:8px}
.ict-r-mistakes .d-qc{background:#fff;border:1px solid var(--ict-line);border-radius:var(--r-2);padding:0;overflow:hidden}
.ict-r-mistakes .d-q,.ict-r-mistakes .d-a{margin:0;padding:4px 10px}
.ict-r-mistakes .d-q{background:var(--s-watch)} .ict-r-mistakes .d-a{background:var(--s-do)}
.ict-r-mistakes .d-q,.ict-r-mistakes .d-a{color:var(--ict-ink) !important}
.ict-r-mistakes .d-q::before,.ict-r-mistakes .d-a::before{content:none;display:none}
.ict-r-mistakes .d-q > b:first-child,.ict-r-mistakes .d-a > b:first-child{display:block;font-size:var(--fs-lbl);font-weight:800;
  letter-spacing:.09em;text-transform:uppercase;line-height:1.35}
.ict-r-mistakes .d-q > b:first-child{color:var(--s-watch-ink)} .ict-r-mistakes .d-a > b:first-child{color:var(--s-do-ink)}
/* differentiation and the homework key: one bordered row each, stacked (one column on a phone) */
.ict-r-diff .panel,.ict-r-hwkey .panel{border:0 !important;padding:0;background:none}
.ict-r-diff .d-bullets,.ict-r-hwkey .d-bullets{display:flex;flex-direction:column;gap:6px}
.ict-r-diff .d-bullets li,.ict-r-hwkey .d-bullets li,.ict-r-hw .d-bullets li{border:1px solid var(--ict-line);border-radius:var(--r-1);padding:3px 10px;background:#fff}
.ict-r-diff .d-bullets li::before,.ict-r-hwkey .d-bullets li::before{display:none}
.ict-r-hw .d-bullets li{padding-inline-start:36px}
.ict-r-hw .d-bullets li::before{inset-inline-start:10px;top:3px}
.ict-r-diff .d-bullets li > b:first-child,.ict-r-hwkey .d-bullets li > b:first-child{display:block;color:var(--navy2);font-size:var(--fs-lbl);
  font-weight:800;letter-spacing:.09em;text-transform:uppercase;line-height:1.35}
.ict-r-hwkey .d-bullets li > b:first-child + br{display:none}
.ict-r-hwkey .d-bullets li{font-size:18.67px;font-weight:600;color:var(--navy2);padding:4px 10px}
.ict-r-hwkey .d-bullets li b{color:var(--leaf)}
/* support and extension: two cards, one under the other */
.ict .d-duo{display:flex !important;flex-direction:column;gap:8px}
.ict .d-col{border:1px solid var(--s-teach-line) !important;background:var(--s-teach) !important;border-radius:var(--r-2)}
.ict .d-col + .d-col{border-color:var(--s-do-line) !important;background:var(--s-do) !important}
.ict .d-col .cc-h{background:none !important;color:var(--navy2);justify-content:flex-start;text-transform:uppercase;
  letter-spacing:.09em;font-size:var(--fs-lbl);padding:6px 11px 0}
.ict .d-col + .d-col .cc-h{color:var(--s-do-ink)}
.ict .d-col .cc-b{padding:2px 11px 7px}
/* a figure beside its points on A4 is a figure ABOVE its points on a phone */
.ict .d-split{display:flex !important;flex-direction:column;gap:8px !important}
.ict .d-split > div{min-width:0}
.ict .d-sub + .d-sub{margin-top:8px}
.d-sub.ict-r-figure{border:1px solid var(--s-teach-line);border-radius:var(--r-2);padding:7px 12px;background:var(--s-teach)}
.d-sub.ict-r-figure .d-note .nt{display:table;margin-bottom:6px;color:#fff !important;background:var(--navy);border-radius:999px;
  padding:3px 10px;letter-spacing:.02em;text-transform:none}
.d-sub.ict-r-figure .d-note > b:first-of-type{display:block;color:var(--leaf);font-size:var(--fs-lbl)}
.d-sub.ict-r-watch{border:1px solid;border-radius:var(--r-2);padding:7px 12px}
.d-sub.ict-r-watch .d-note .nt{color:var(--s-watch-ink) !important}
/* ── diagrams: ICT's engine draws the figure AND its caption strip; the card adds the badge ── */
.ict-r-diagram{margin-top:12px}
.ict-r-diagram .panel,.d-sub.ict-r-diagram{border:1.5px solid var(--ict-line) !important;border-radius:var(--r-2);padding:9px 11px;background:#fff}
.ict .d-imgrow{gap:10px}
.ict .d-img{border:0;box-shadow:none;border-radius:0;background:none;display:flex;flex-direction:column}
/* each SVG carries ICT's own slot as its size (from-lpdoc.js sizedSvg): drawn at that width, centred */
.ict .d-img img{width:auto;max-width:100%;height:auto;display:block;margin:0 auto;object-fit:contain;background:none}
.ict .d-img .cap{order:-1;align-self:flex-start;background:var(--navy);color:#fff;border-radius:999px;padding:3px 10px;margin:0 0 4px;
  font-size:var(--fs-lbl);font-weight:800;letter-spacing:.02em;line-height:1.55}
.ict .d-img .cap:empty{display:none}
.ict .d-split > div:empty{display:none}
/* ── the exam bank (grade 9 and up) ──────────────────────────────────────────────── */
.ict-r-mcq{margin-top:4px}
.ict-r-mcq .panel{border:1px solid var(--ict-line) !important;padding:4px 10px}
.ict-r-mcq .d-split{gap:4px !important}
.d-sub.ict-r-mcqq .d-text{font-weight:700;color:var(--navy2)}
.d-sub.ict-r-mcqq .d-text b{font-weight:700}
.d-sub.ict-r-mcqopts .d-bullets{display:flex;flex-wrap:wrap;gap:4px 6px}
.d-sub.ict-r-mcqopts .d-bullets li{padding:2px 8px;border:1px solid var(--s-quiet-line);border-radius:var(--r-1);background:var(--s-quiet);
  font-size:18.67px;line-height:1.55}
.d-sub.ict-r-mcqopts .d-bullets li::before,.d-sub.ict-r-mcqopts .d-tag{display:none}
.d-sub.ict-r-mcqopts .d-bullets li:has(.d-tag){background:var(--s-do);border-color:var(--s-do-line);color:var(--s-do-ink);font-weight:700}
.d-sub.ict-r-mcqopts .d-bullets li:has(.d-tag) b{color:var(--s-do-ink)}
.d-sub.ict-r-mcqnote{background:var(--s-note);border-radius:var(--r-1);padding:4px 10px}
.d-sub.ict-r-mcqnote .d-text{font-size:16.92px;line-height:1.5;color:#7D6425}
.d-sub.ict-r-mcqnote .d-text b{color:#7D6425}
.ict-r-srq{margin-top:8px}
.ict-r-srqms .panel{background:var(--s-do);border-color:var(--s-do-line) !important;padding:6px 12px}
.ict-r-srqms .d-lead{border:0;padding:0;color:var(--s-do-ink)}
.ict-r-erq .panel{border-color:var(--s-teach-line) !important;padding:6px 12px}
.d-sub.ict-r-erqq .d-note > b:first-of-type{display:block;margin:4px 0 8px}
.d-sub.ict-r-erqq .d-note > b:first-of-type + br{display:none}
.d-sub.ict-r-erqplan .d-bullets li,.d-sub.ict-r-erqplan .d-bullets li:has(> .d-tag){padding-inline-start:0;display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.d-sub.ict-r-erqplan .d-tag{float:none}
.d-sub.ict-r-erqplan .d-bullets li::before{display:none}
.d-sub.ict-r-erqplan .d-tag{display:inline;flex:0 0 auto;color:var(--amber) !important;font-size:18.08px;font-weight:800}
.ict-r-boardcap .panel{border:0 !important;background:none;padding:0 2px}
.ict-r-boardcap .d-text{font-size:15.5px;font-weight:600;color:var(--mut);text-align:center}
/* ── the close of the lesson and the support page ──────────────────────────────────── */
.ict-r-continues .panel{border:0 !important;background:none;padding:6px 0 0}
.ict-r-continues .d-text{font-size:var(--fs-lbl);font-style:italic;color:var(--mut);line-height:1.55}
.ict-r-p2head{margin-top:0}
.ict-r-p2head .panel{border:0 !important;border-bottom:3px solid var(--navy) !important;border-radius:0;padding:0 0 8px;background:none}
.ict-r-p2head .d-text{font-size:18.08px;font-weight:600;color:var(--mut);line-height:1.45}
.ict-r-p2head .d-text b:first-of-type{display:inline-block;background:var(--navy);color:#fff;border-radius:999px;padding:5px 14px;
  margin-inline-end:9px;letter-spacing:.11em;text-transform:uppercase;font-size:var(--fs-lbl);font-weight:800}
.ict-r-p2head .d-text b:last-of-type{display:block;font-size:23.92px;font-weight:800;color:var(--navy);margin-top:4px;line-height:1.3}
.ict-r-mcq .panel,.ict-r-erq .panel,.ict-r-howmarked .panel{border-color:var(--ict-line) !important;padding:4px 10px}
.ict-r-howmarked .panel{border:0 !important;padding:0}
.ict-r-howmarked .d-text{font-size:16.92px;color:var(--mut)}
.ict-r-howmarked .d-text b{color:var(--ict-ink)}
.ict-r-coach .d-text{color:#fff}
.ict-r-coach .d-text b{color:var(--amber);font-size:var(--fs-lbl);font-weight:800;letter-spacing:.09em;text-transform:uppercase}
/* The locator prints in each page's footer (the part printer adds it), so the end-of-document
   footer line would only repeat it. */
.lp-footer{display:none}
/* each part's footer: a hairline, the locator on one line, "page N of M" under it */
.lp-partfoot{margin:12px 21px 0;padding:8px 0 1px;border-top:1px solid var(--ict-line);font-size:var(--fs-lbl);line-height:1.4;color:var(--mut)}
.lp-partfoot .pf-l{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* ── Urdu (R6): right-to-left, Nastaliq, a tall unitless line-height ─────────────── */
html[lang="ur"]{--lh:2.05}
html[lang="ur"] .ict .d-text,html[lang="ur"] .ict .d-note,html[lang="ur"] .ict .d-bullets li,html[lang="ur"] .ict .cc-b,
html[lang="ur"] .ict .d-q,html[lang="ur"] .ict .d-a{line-height:var(--lh)}
html[lang="ur"] .lp-header h1{line-height:1.7}
html[lang="ur"] .lp-header .meta span{line-height:1.9}
html[lang="ur"] .ict .d-lead,html[lang="ur"] .ict .d-note .nt,html[lang="ur"] .ict-st-p2 .s-title,html[lang="ur"] .lp-header .sub,
html[lang="ur"] .ict .d-tag,html[lang="ur"] .ict-r-grouplabel .d-text,html[lang="ur"] .ict .d-img .cap,
html[lang="ur"] .ict-r-mistakes .d-q > b:first-child,html[lang="ur"] .ict-r-mistakes .d-a > b:first-child,
html[lang="ur"] .ict-r-diff .d-bullets li > b:first-child,html[lang="ur"] .ict-r-p2head .d-text b:first-of-type,
html[lang="ur"] .ict-r-rvideo .d-text b,html[lang="ur"] .ict-r-rmat .d-text b,html[lang="ur"] .ict-r-rpace .d-text b,
html[lang="ur"] .ict-r-coach .d-text b,html[lang="ur"] .ict .d-col .cc-h{letter-spacing:0;text-transform:none;line-height:1.35}
/* ICT's own Urdu line-heights: labels 1.35 (measured, lp-v9 at 520px), tags 1.55 */
html[lang="ur"] .ict .d-tag{line-height:1.55}
html[lang="ur"] .ict-st .s-title,html[lang="ur"] .ict-st .s-time{letter-spacing:0;line-height:1.8}
/* Nastaliq's tall ascenders need room under a display formula. */
html[lang="ur"] .ict .d-mlabel{line-height:2.05;padding-top:8px}
`;

module.exports = {
  THEME_OVERRIDE_CSS,
  REGION_NAME: 'ICT (NIETE)',
  // ICT's delivery format: a 520px phone page, printed as one page per part — the whole lesson
  // on page 1, the teacher support on page 2, each as tall as its content (lp-render/render/
  // part-pages-pdf.js). The pipeline reads this; no other pack declares it.
  PAGE_LAYOUT: { width: PAGE_WIDTH, onePagePerPart: true },
  // ICT's plans carry no decorative characters; the cast is also a paid generator.
  CHARACTER_CAST: false,
};
