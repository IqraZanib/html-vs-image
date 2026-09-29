'use strict';
// ICT (NIETE) design pack — grades 6–12, Islamabad Capital Territory.
//
// Status: PHASE 1, not partner-approved. See DESIGN.md. The look is ICT's own production
// template (niete/bot/vendor/lp-v9, v9.3), re-expressed as a skin over this renderer: the
// same palette tokens, the same five surface ROLES, the same solid section bands. Nothing
// here is imported from the Yemen, Kenya or Tanzania packs, and nothing in those packs can
// see these rules: every selector below is scoped to a class only the lp_doc adapter emits
// (ict, ict-st-*, ict-r-*), and the pack is loaded only for meta.region "ict".
//
// WHERE THE CLASSES COME FROM. lp-render/guide/from-lpdoc.js tags each card with
//   ict                 every card this adapter made
//   ict-st ict-st-<s>   the stage it belongs to (introduction … homework, or p2 on the
//                       support pages), which picks the band colour
//   ict-r-<role>        the lp_doc block it came from (hook, watch, worked, practice …),
//                       which picks the surface
//
// GOTCHA (see the repo CLAUDE.md; it bit Yemen and Kenya): render.js stamps INLINE styles on
// the section tab (background), every .panel (border-color), every .d-note (gradient and
// start border), every .d-tag and every duo column. Inline beats a stylesheet, so each of
// those needs !important here. Never put a backtick in a comment inside this template
// literal: it ends the string and the pack fails to load.

const THEME_OVERRIDE_CSS = `
:root{
  --navy:#0B2545; --navy2:#13315C; --amber:#F2A20C; --amber-soft:#FDEBC8;
  --ict-ink:#1a2233; --mut:#5b6472; --ict-line:#e5e9f0; --leaf:#1F7A4D; --warn:#B4531F;
  --s-teach:#F2F6FC; --s-teach-line:#CBD8E8; --s-teach-ink:#13315C;
  --s-do:#EFF7F2;    --s-do-line:#BFE3CD;    --s-do-ink:#14603A;
  --s-watch:#FCEDE6; --s-watch-line:#F2C4AD; --s-watch-ink:#B4531F;
  --s-note:#FFF8E8;  --s-note-line:#F0DFB4;  --s-note-ink:#8A5F04;
  --s-quiet:#F5F7FA; --s-quiet-line:#E1E6EE; --s-quiet-ink:#414A57;
  --r-1:6px; --r-2:9px;
}

/* ── page ─────────────────────────────────────────────────────────────────────────── */
body,.sheet{background:#fff}
html[lang="en"] body{font-family:Inter,'Noto Sans',system-ui,sans-serif}
body{color:var(--ict-ink)}
.body{padding:12px 24px 2px}
.section{margin:0 0 10px}

/* ── hero: navy block, amber kicker, the locator on the end side ────────────────── */
.lp-header{background:var(--navy) !important;border-radius:var(--r-2);margin:16px 24px 0;padding:14px 20px 14px;
  display:grid;grid-template-columns:1fr auto;grid-template-areas:"sub meta" "title meta";column-gap:18px;align-items:start}
.lp-header .hbwrap,.lp-header .deco{display:none !important}
.lp-header .sub{grid-area:sub;color:var(--amber);font-size:14.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;
  text-shadow:none;opacity:1;margin:0 0 2px}
.lp-header h1{grid-area:title;font-size:32px;font-weight:800;letter-spacing:-.2px;line-height:1.15;text-shadow:none;margin:0}
.lp-header .meta{grid-area:meta;display:flex;flex-direction:column;align-items:flex-end;gap:3px;margin:0}
.lp-header .meta span{background:none;border:0;padding:0;font-size:15px;font-weight:600;color:#DCE4F0;border-radius:0}
.lp-header .meta span:last-child{margin-top:5px;background:rgba(242,162,12,.17);border:1.5px solid var(--amber);
  color:#FFD98A;border-radius:999px;padding:2px 12px;font-weight:800;letter-spacing:.04em}
.lp-header .meta b{display:none}

/* ── section bands: a solid block in the section's own colour, a letter chip ─────── */
.ict-st-introduction{--band:#0F6A73;--letter:'I'}
.ict-st-development{--band:#0B2545;--letter:'D'}
.ict-st-activity{--band:#1F7A4D;--letter:'A'}
.ict-st-conclusion{--band:#584A93;--letter:'C'}
.ict-st-homework{--band:#5b6472;--letter:'H'}
.ict-st .s-head{background:var(--band);border-radius:var(--r-1);padding:5px 12px;margin:6px 0 8px}
.ict-st .s-tab{background:transparent !important;box-shadow:none;padding:0;gap:9px;border-radius:0}
.ict-st .s-ic{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.22)}
.ict-st .s-ic svg{display:none}
.ict-st .s-ic::before{content:var(--letter);color:#fff;font-weight:800;font-size:16px;line-height:1}
.ict-st .s-title{color:#fff;font-size:19px;letter-spacing:.02em}
.ict-st .s-time{background:none;border:0;padding:0;color:#fff;font-size:16px;font-weight:800;letter-spacing:.03em}

/* support pages: a lettered rule, not a band */
.ict-p2-a{--letter:'A'} .ict-p2-b{--letter:'B'} .ict-p2-c{--letter:'C'} .ict-p2-d{--letter:'D'}
.ict-p2-e{--letter:'E'} .ict-p2-f{--letter:'F'} .ict-p2-g{--letter:'G'}
.ict-st-p2 .s-head{background:none;padding:0 0 4px;margin:10px 0 8px;border-bottom:2px solid var(--ict-line);border-radius:0}
.ict-st-p2 .s-ic{background:var(--navy);border-radius:5px}
.ict-st-p2 .s-title{color:var(--navy);text-transform:uppercase;font-size:17.5px;letter-spacing:.04em}

/* ── cards: one hairline, one radius; the ROLE picks the surface ─────────────────── */
.ict .panel{border:1px solid var(--ict-line) !important;border-radius:var(--r-2);padding:11px 14px;box-shadow:none;background:#fff}
.ict .d-note{background:none !important;border-inline-start:0 !important;border-radius:0;padding:0}
.ict .d-note .nt{color:var(--navy2) !important;font-size:13.5px;letter-spacing:.1em;margin-bottom:3px}
.ict .d-text,.ict .d-note,.ict .d-bullets li,.ict .cc-b{font-size:18px;font-weight:500;line-height:1.5;color:var(--ict-ink)}
.ict .d-text b,.ict .d-note b,.ict .d-bullets li b{font-weight:700}
.ict .d-lead{color:var(--navy2);font-size:14px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  border-inline-start:3px solid var(--amber);padding-inline-start:7px;margin-bottom:7px}
.ict .d-bullets{gap:4px}
.ict .d-bullets li{padding-inline-start:26px}
.ict .d-bullets li::before{color:var(--navy2);font-weight:800}
.ict .d-tag{background:none !important;color:var(--mut) !important;float:inline-end;font-size:13px;letter-spacing:.06em;
  padding:3px 0 0;margin-inline-start:10px}

/* A bolded first line is set as a block, so the line break after it would open a blank line. */
.ict .d-note > b:first-of-type + br{display:none}

/* note role (amber): outcome, warm-up, worked example, coaching */
.ict-r-outcome .panel{background:var(--amber-soft);border:0 !important;border-inline-start:6px solid var(--amber) !important}
.ict-r-outcome .d-note .nt{color:var(--s-note-ink) !important}
.ict-r-outcome .d-note > b:first-of-type{display:block;font-size:20px;line-height:1.4;color:#2b2106}
.ict-r-warmup .panel,.ict-r-worked .panel,.ict-r-coach .panel{background:var(--s-note);border-color:var(--s-note-line) !important}
.ict-r-warmup .d-bullets li b,.ict-r-practice .d-bullets li b,.ict-r-exit .d-bullets li b,.ict-r-hwkey .d-bullets li b{color:var(--leaf)}

/* teach role (blue): the plain question, the citation */
.ict-r-ask .panel{background:var(--s-teach);border:0 !important;border-inline-start:4px solid var(--navy2) !important}
.ict-r-ask .d-note > b:first-of-type{display:block;font-size:19px;color:var(--navy2)}
.ict-r-cite .panel{background:var(--s-teach);border-color:var(--s-teach-line) !important;padding:6px 12px}
.ict-r-cite .d-text{font-size:15px;font-weight:700;color:var(--navy2)}

/* emphasis surfaces (navy): the hook and the checkpoint are the loudest things on page 1 */
.ict-r-hook .panel,.ict-r-checkpoint .panel{background:var(--navy);border:0 !important}
.ict-r-hook .d-note,.ict-r-checkpoint .d-note{color:#DCE4F0}
.ict-r-hook .d-note .nt,.ict-r-checkpoint .d-note .nt{color:var(--amber) !important}
.ict-r-hook .d-note b,.ict-r-checkpoint .d-note b{color:#fff}
.ict-r-hook .d-note > b:first-of-type,.ict-r-checkpoint .d-note > b:first-of-type{display:block;font-size:20.5px;line-height:1.4;margin-bottom:3px}

/* watch role (terracotta): warnings, misconceptions, the re-teach rule */
.ict-r-watch .panel,.ict-r-reteach .panel,.d-sub.ict-r-watch{background:var(--s-watch);border-color:var(--s-watch-line) !important}
.ict-r-watch .d-note .nt,.ict-r-reteach .d-note .nt{color:var(--s-watch-ink) !important}

/* quiet role (grey): the resources line, the board */
.ict-r-resources .panel,.ict-r-seq .panel{background:var(--s-quiet);border-color:var(--s-quiet-line) !important;padding:8px 14px}
.ict-r-resources .d-text,.ict-r-seq .d-text{font-size:15.5px}
.ict-r-resources .d-text b,.ict-r-seq .d-text b{color:var(--navy2)}
.ict-r-board .panel{background:var(--s-quiet);border:0 !important;border-inline-start:4px solid var(--s-quiet-ink) !important}

/* do role (green): the faded example, maths and chemistry, the extension */
.ict-r-faded .panel,.ict-r-chem .panel,.ict-r-latex .panel{background:var(--s-do);border-color:var(--s-do-line) !important}
.ict-r-worked .d-note .nt,.ict-r-faded .d-note .nt{display:table;color:#fff !important;background:var(--amber);
  border-radius:999px;padding:2px 11px;font-size:13px;margin-bottom:6px}
.ict-r-faded .d-note .nt{background:var(--leaf)}
.ict-r-worked .d-note b,.ict-r-faded .d-note b{color:var(--leaf)}
.ict .d-mrow{background:none;border:0;padding:4px 0 0;display:flex;flex-direction:column-reverse;gap:6px}
.ict .d-mlabel{text-transform:none;letter-spacing:0;font-size:15.5px;font-weight:500;color:var(--s-do-ink);margin:0}
.ict .d-mformula svg{max-width:100%}

/* the figure beside the points it illustrates */
.ict .d-split{gap:16px !important}
.ict .d-sub + .d-sub{margin-top:10px}
.d-sub.ict-r-figure{border:1px solid var(--s-teach-line);border-radius:var(--r-2);padding:10px 12px}
.d-sub.ict-r-figure .d-note .nt{display:table;margin-bottom:6px;color:#fff !important;background:var(--navy);border-radius:999px;
  padding:3px 12px;font-size:13.5px;letter-spacing:.06em}
.d-sub.ict-r-figure .d-note{font-size:16px}
.d-sub.ict-r-figure .d-note > b:first-of-type{display:block;color:var(--leaf);font-size:15px}
.d-sub.ict-r-watch{border:1px solid;border-radius:var(--r-2);padding:9px 12px}
.d-sub.ict-r-watch .d-note .nt{color:var(--s-watch-ink) !important}

/* key words: chips, not a list */
.ict-r-keywords .panel{border:0 !important;background:none;padding:0 2px}
.ict-r-keywords .d-bullets{display:flex;flex-wrap:wrap;gap:6px}
.ict-r-keywords .d-bullets li{padding:3px 12px;border:1px solid var(--s-quiet-line);border-radius:var(--r-1);background:#fff;
  font-size:16.5px;color:var(--mut)}
.ict-r-keywords .d-bullets li::before{display:none}
.ict-r-keywords .d-bullets li b{color:var(--navy2);font-weight:800}

/* practice and exit ticket: a pill label, answers in green */
.ict-r-practice .d-lead,.ict-r-exit .d-lead{display:inline-block;border:1px solid var(--s-do-line);background:var(--s-do);
  color:var(--s-do-ink);border-radius:999px;padding:2px 12px}

/* support and extension side by side */
.ict .d-duo{gap:12px}
.ict .d-col{border:1px solid var(--s-teach-line) !important;background:var(--s-teach) !important;border-radius:var(--r-2)}
.ict .d-col + .d-col{border-color:var(--s-do-line) !important;background:var(--s-do) !important}
.ict .d-col .cc-h{background:none !important;color:var(--navy2);justify-content:flex-start;text-transform:uppercase;
  letter-spacing:.1em;font-size:14px;padding:9px 14px 0}
.ict .d-col + .d-col .cc-h{color:var(--s-do-ink)}
.ict .d-col .cc-b{padding:4px 14px 11px}

/* card groups: mistakes three across, differentiation three across, homework key two */
.ict-r-mistakes .d-bullets,.ict-r-diff .d-bullets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.ict-r-hwkey .d-bullets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ict-r-mistakes .d-bullets li,.ict-r-diff .d-bullets li,.ict-r-hwkey .d-bullets li{border:1px solid var(--ict-line);
  border-radius:var(--r-2);padding:9px 12px;font-size:16.5px}
.ict-r-mistakes .d-bullets li::before,.ict-r-diff .d-bullets li::before,.ict-r-hwkey .d-bullets li::before{display:none}
.ict-r-mistakes .d-bullets li b:first-of-type{color:var(--s-watch-ink);font-size:13.5px;letter-spacing:.08em;text-transform:uppercase}
.ict-r-mistakes .d-bullets li b:last-of-type{color:var(--s-do-ink);font-size:13.5px;letter-spacing:.08em;text-transform:uppercase}
.ict-r-diff .d-bullets li b{color:var(--navy2);font-size:13.5px;letter-spacing:.08em;text-transform:uppercase}
.ict-r-mistakes .panel,.ict-r-diff .panel,.ict-r-hwkey .panel{border:0 !important;padding:0;background:none}

/* page furniture */
.ict-r-continues .panel{border:0 !important;background:none;padding:2px 0}
.ict-r-continues .d-text{font-size:15.5px;font-weight:800;color:var(--navy)}
.ict-r-p2head .panel{border:0 !important;border-bottom:3px solid var(--navy) !important;border-radius:0;padding:14px 0 6px;background:none}
.ict-r-p2head .d-text{font-size:15px;color:var(--mut);font-weight:700}
.ict-r-p2head .d-text b:first-of-type{display:inline-block;background:var(--navy);color:#fff;border-radius:999px;
  padding:2px 12px;letter-spacing:.08em;text-transform:uppercase;font-size:13.5px}
.ict-r-p2head .d-text b:last-of-type{display:block;font-size:23px;color:var(--navy);margin-top:4px}
.ict-r-para .panel{border:0 !important;padding:2px 0;background:none}
.lp-footer{text-align:start;margin:12px 24px 0;font-size:13px;color:var(--mut)}

/* ── Urdu (R6): right-to-left, Nastaliq, a tall unitless line-height ─────────────── */
html[lang="ur"] .ict .d-text,html[lang="ur"] .ict .d-note,html[lang="ur"] .ict .d-bullets li,
html[lang="ur"] .ict .cc-b,html[lang="ur"] .ict .d-lead,html[lang="ur"] .lp-header h1{line-height:2.1}
html[lang="ur"] .ict .d-lead,html[lang="ur"] .ict .d-note .nt,html[lang="ur"] .ict-st-p2 .s-title,
html[lang="ur"] .lp-header .sub{letter-spacing:0;text-transform:none}
/* The letter chips are Latin initials of English names; the Urdu band carries its name alone. */
html[lang="ur"] .ict-st .s-ic{display:none}
/* Nastaliq's tall ascenders need room under a display formula. */
html[lang="ur"] .ict .d-mlabel{line-height:2.1;padding-top:8px}
`;

module.exports = {
  THEME_OVERRIDE_CSS,
  REGION_NAME: 'ICT (NIETE)',
  // The composer's default page number. ICT prints "page N of M" in a footer band; that
  // needs a composer page style, which is a Phase 2 decision (see DESIGN.md).
  PAGE_NUMBER_STYLE: '',
  // ICT's plans carry no decorative characters; the cast is also a paid generator.
  CHARACTER_CAST: false,
};
