'use strict';
// ICT (NIETE) lp_doc → Guide.
//
// WHAT THIS IS. ICT's grades 6–12 pipeline authors a lesson as an `lp_doc` — typed JSON, no
// prose to parse — and renders it with its own template. This file is the fourth producer
// of the Guide object this renderer draws (after the markdown parser, the structuring model
// and a pasted guide): it turns an lp_doc into `{ meta, sections, images }` so an ICT lesson
// is drawn by this repo's renderer under the `ict` design pack.
//
// WHAT IT MAY DO AND MAY NOT. It is a MAPPING, not an author. Every string on the page comes
// from the lp_doc or from ICT's own label pack (vendored, verbatim) — nothing is reworded,
// summarised or invented, and no model is called. What ICT's production renderer deliberately
// does not paint, this does not paint either, and each such omission is written into the
// report so it is a recorded decision rather than a silent loss.
//
// WHOSE RULES. ICT's, as its v9 template applies them (niete/bot/vendor/lp-v9/lib/template.js):
//   • the lp_doc is lifted to schema 3.0 first, with ICT's own migrate.js;
//   • the Urdu page is ICT's `ur_overlay` applied with ICT's own applyOverlay();
//   • headings and labels are ICT's LABELS pack, English or Urdu;
//   • page 1: outcome box, resources line, then the five sections — the warm-up inside the
//     Introduction, common mistakes after Development, differentiation after the section
//     that carries the practice, the checkpoint / exit ticket / re-teach rule after the
//     Conclusion;
//   • the support pages: lettered in emission order so an absent section consumes no letter;
//     model answers and next-period are never painted; the exam bank only for grade 9+.
//
// Pure: same lp_doc in, same guide out. Throws on input ICT's renderer would also refuse.

const { toV3 } = require('./vendor/lp_doc_migrate');
const { applyOverlay, LABELS } = require('./vendor/lp_doc_overlay');
const { questionIndex } = require('./vendor/lp_doc_questions');

const REGION = 'ict';
const STAGES = ['introduction', 'development', 'activity', 'conclusion', 'homework'];

// ICT's own draw-order clean-up (template.js unnumber): the list is numbered by the renderer,
// so an author's "1." must not print twice.
const unnumber = (s) => String(s == null ? '' : s)
  .replace(/^\s*[0-9\u0660-\u0669\u06F0-\u06F9]{1,2}\s*[.)\u06D4\u060C:\u2013-]\s+/, '');

// Bold a span only when bold can survive it: richText renders maths before markdown, so a
// `**…**` wrapped around `$…$` would print its asterisks.
const strong = (s) => {
  const t = String(s == null ? '' : s).trim();
  return !t || /\$|\*\*|\\ce\{/.test(t) ? t : `**${t}**`;
};
const has = (v) => v != null && String(v).trim() !== '';

// THE RENDERER BOLDS A SHORT "Label:" AT THE START OF A LINE (math.js mdInline) — right for
// the markdown producers, wrong here. An lp_doc marks emphasis explicitly with **…**, and ICT
// prints "Draw the leaf and label four arrows: sunlight…" in plain type; left alone, this
// renderer bolded the first half of it. A WORD JOINER (U+2060, zero-width, never drawn)
// after such a colon fails that rule's lookahead and changes nothing a reader can see. Only
// a colon that rule would actually fire on is touched; an authored **Label:** already has
// its asterisks after the colon and never matches.
const AUTO_LABEL = /(^|\n)(\s*[^:<>\n*]{2,42}):(?=\s|$)/g;
const noAutoBold = (v) => (typeof v === 'string' ? v.replace(AUTO_LABEL, '$1$2:\u2060') : v);
// INLINE CHEMISTRY. ICT's text grammar (lib/rich.js) reads a bare \ce{…} as inline mhchem;
// this renderer's richText reads maths only between dollar signs. So a bare \ce{…} is given its
// dollars — a change of notation, not of content — using ICT's own tokeniser, so a \ce that is
// already inside $…$ is left exactly as it is. KaTeX here carries no mhchem and MathJax does,
// so any card with chemistry in it is drawn by MathJax.
const ICT_MATH = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$|\\ce\{((?:[^{}]|\{[^{}]*\})*)\}/g;
const dollarChem = (v) => (typeof v === 'string' && v.includes('\\ce{')
  ? v.replace(ICT_MATH, (m, _d, _i, ce) => (ce !== undefined ? `$\\ce{${ce}}$` : m))
  : v);
const prep = (v) => noAutoBold(dollarChem(v));

function guardText(sec) {
  if (!sec || typeof sec !== 'object') return sec;
  let chem = false;
  const fix = (v) => { if (typeof v === 'string' && v.includes('\\ce{')) chem = true; return prep(v); };
  if (typeof sec.body === 'string') sec.body = fix(sec.body);
  for (const it of sec.items || []) if (it && typeof it.text === 'string') it.text = fix(it.text);
  for (const k of ['a', 'b']) if (sec[k] && typeof sec[k].body === 'string') sec[k].body = fix(sec[k].body);
  for (const it of sec.items || []) if (it && typeof it.tex === 'string' && it.tex.includes('\\ce{')) chem = true;
  for (const k of ['left', 'right']) (sec[k] || []).forEach(guardText);
  if (chem) sec.engine = 'mathjax';
  return sec;
}
const lines = (...xs) => xs.filter(has).join('\n');

function buildGuideFromLpDoc(input, { lang } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('lp_doc must be an object');
  }
  const v3 = toV3(input);
  const prov = v3.provenance || {};
  const medium = String(prov.medium || 'en');
  const want = String(lang || medium);
  if (!LABELS[want]) throw new Error(`lp_doc: no ICT label pack for language "${want}"`);
  // An English-medium lesson asked for in Urdu with no overlay would print English content
  // under Urdu headings. ICT's renderer never produces that page; neither does this.
  if (want === 'ur' && medium !== 'ur' && !v3.ur_overlay) {
    throw new Error('lp_doc: Urdu requested but this English-medium lesson carries no ur_overlay');
  }
  const { doc, errors } = applyOverlay(v3, want);
  // ICT refuses the whole lesson on a bad overlay (OVERLAY_INVALID) rather than print a
  // half-translated page. Same here.
  if (errors.length) throw new Error(`lp_doc: ur_overlay invalid — ${errors.join('; ')}`);

  const L = LABELS[want];
  const AR = want === 'ur' ? '←' : '→';
  const grade = prov.grade == null ? null : Number(prov.grade);
  const report = {
    lang: want,
    migratedFrom: v3.__migrated_from || null,
    notPrinted: [],   // present in the lp_doc, deliberately not painted (ICT's own rule)
    unrendered: [],   // should be on the page, and is not yet drawn by this renderer
    warnings: [],
  };
  const sections = [];

  // ── one block → one body ─────────────────────────────────────────────────────────────
  // A body is a renderer section without its heading: `type` + that type's fields, plus
  // `role` (which becomes the card's ict-r-<role> class for the design pack).
  const answerItem = (q, a) => `${q} ${AR} ${strong(a)}`;
  const body = (b) => {
    if (!b || typeof b !== 'object') return null;
    switch (b.type) {
      case 'paragraph':
        return { role: 'para', type: 'text', body: b.text };
      case 'say': // schema 2.0 only; toV3 turns it into a paragraph, kept for safety
        return { role: 'say', type: 'note', label: L.say, body: `“${b.text}”` };
      case 'ask':
        return {
          role: b.hook ? 'hook' : 'ask', type: 'note', label: b.hook ? L.ask : L.askPlain,
          body: lines(strong(b.question), has(b.look_for) ? `**${L.lookFor}:** ${b.look_for}` : ''),
        };
      case 'watch_out':
        return { role: 'watch', type: 'note', label: `⚠ ${L.watch}`, body: b.text };
      case 'board':
        return { role: 'board', type: 'note', label: L.board, body: b.text };
      case 'keywords':
        return {
          role: 'keywords', type: 'bullets', lead: L.keywords,
          items: (b.items || []).map((k) => ({ text: `${strong(k.word)} — ${k.meaning}` })),
        };
      case 'key_points': {
        const lead = b.title === undefined ? L.keyPoints : b.title;
        return { role: 'keypoints', type: 'bullets', lead: lead || undefined, items: (b.items || []).map((t) => ({ text: t })) };
      }
      case 'table': {
        const cols = b.columns || [];
        // ICT pads a ragged row rather than dropping or shifting it (bd-a8veu.21).
        const rows = (b.rows || []).map((r) => cols.map((_, i) => (r && r[i] != null ? r[i] : '')));
        if ([...cols, ...rows.flat()].some((c) => /\$|\*\*|\\ce\{/.test(String(c)))) {
          report.warnings.push('table cell carries maths or bold — this renderer prints table cells as plain text');
        }
        return { role: 'table', type: 'table', columns: cols, rows, caption: b.title || undefined };
      }
      case 'worked_example':
      case 'faded_example': {
        const worked = b.type === 'worked_example';
        const steps = (b.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
        const tail = worked
          ? (has(b.result) ? strong(b.result) : '')
          : (has(b.answer) ? strong(`${L.answer}: ${b.answer}`) : '');
        return {
          role: worked ? 'worked' : 'faded', type: 'note',
          label: b.title || (worked ? L.worked : L.faded), body: lines(b.prompt, steps, tail),
        };
      }
      case 'practice':
        return {
          role: 'practice', type: 'bullets', marker: 'num',
          lead: b.title || (b.mode === 'guided' ? L.guided : b.mode === 'independent' ? L.independent : L.practice),
          items: (b.items || []).map((it) => ({
            text: answerItem(it.q, it.a),
            tag: it.tier && it.tier !== 'core' ? (L.tier[it.tier] || it.tier) : undefined,
          })),
        };
      case 'support_extension':
        return {
          role: 'supext', type: 'duo',
          a: { label: L.support, body: b.support }, b: { label: L.extension, body: b.extension },
        };
      case 'latex':
        return { role: 'latex', type: 'math', items: [{ tex: b.tex, label: b.caption }] };
      case 'chem':
        // ICT writes \ce{…}; KaTeX here has no mhchem, MathJax does.
        return { role: 'chem', type: 'math', engine: 'mathjax', items: [{ tex: `\\ce{${b.tex}}`, label: b.caption }] };
      case 'textbook_figure':
        report.unrendered.push({
          type: 'textbook_figure', ref: b.ref || null, src: b.src || null,
          why: 'the book crop is not embedded yet — printed as a book reference, the way ICT prints a missing crop',
        });
        return {
          role: 'figure', type: 'note', label: b.figure_label || '',
          body: lines(`**● ${L.figureIn}${has(b.page) ? `, ${L.page}${b.page}` : ''}**`, b.caption,
            has(b.legend) ? `**${L.reading}:** ${b.legend}` : ''),
        };
      case 'diagram': {
        const spec = b.spec || {};
        report.unrendered.push({ type: 'diagram', spec: spec.type || null, why: 'ICT diagram engine not vendored yet (Phase 2)' });
        return {
          role: 'diagram', type: 'note', label: `⚠ diagram not drawn yet — ${spec.type || '?'}`,
          body: spec.caption || spec.alt || '',
        };
      }
      case 'split': {
        const side = (list) => (list || []).flatMap((x) => (x && x.type === 'split' ? [...(x.left || []), ...(x.right || [])] : [x]))
          .map(body).filter(Boolean).map(({ role, ...rest }) => ({ ...rest, cls: `ict-r-${role}` }));
        return { role: 'split', type: 'split', ratio: b.ratio, left: side(b.left), right: side(b.right) };
      }
      default:
        report.warnings.push(`unknown block type "${b.type}" — skipped (ICT's renderer skips it too)`);
        return null;
    }
  };

  // Every card of one stage carries the stage's heading and minutes; the renderer draws the
  // bar once and treats the rest as the same section continuing.
  const push = (spec, { heading = '', time = '', stage = '' } = {}) => {
    if (!spec) return;
    const { role, cls, ...rest } = spec;
    sections.push(guardText({
      ...rest, id: `ict-${role}`, heading, time,
      cls: ['ict', stage && `ict-st ict-st-${stage}`, `ict-r-${role}`, cls].filter(Boolean).join(' '),
    }));
  };

  // ── page 1 — furniture ───────────────────────────────────────────────────────────────
  const O = doc.objectives || {};
  if (doc.sequence) {
    const s = doc.sequence;
    push({
      role: 'seq', type: 'text',
      body: [has(s.previous) ? `**${L.seqPrev}:** ${s.previous} ${AR}` : '', strong(s.this),
        has(s.checkpoint) ? `**${L.seqCheck}:** ${s.checkpoint}` : ''].filter(Boolean).join('  '),
    });
  }
  const fbise = Array.isArray(doc.fbise_slos) && doc.fbise_slos.length
    ? doc.fbise_slos.map((t) => `**${t.code}**${t.status && L.boardStatus[t.status] ? ` ${L.boardStatus[t.status]}` : ''}`).join(' · ')
    : '';
  push({
    role: 'outcome', type: 'note',
    label: `${L.outcome}${doc.slo && doc.slo.code ? ` · ${doc.slo.code}` : ''}${grade && grade < 9 ? ` · ${L.noBoardExam}` : ''}`,
    body: lines(strong(O.outcome), fbise, has(O.by_the_end) ? `✓ ${O.by_the_end}` : ''),
  });
  // bd-a8veu.3: ICT paints ONE outcome voice; the SLO wording and the objective list stay
  // in the document (the linter gates on them) and stop being painted.
  report.notPrinted.push('slo.text_verbatim and objectives.items — ICT paints the outcome box only (bd-a8veu.3)');

  const secs = Array.isArray(doc.sections) ? doc.sections : [];
  const dev = secs.find((s) => s && s.id === 'development');
  const video = dev && dev.video;
  const intro = secs.find((s) => s && s.id === 'introduction');
  const kwHoisted = intro && (intro.blocks || []).find((b) => b && b.type === 'keywords');
  const pacing = secs.map((s) => Number(s.minutes) || 0);
  push({
    role: 'resources', type: 'text',
    body: lines(
      video ? `**${L.video}:** ${video.title}${has(video.channel) ? ` · ${video.channel}` : ''}${has(video.duration) ? ` · ${video.duration}` : ''}` : '',
      (doc.materials || []).length ? `**${L.materials}:** ${doc.materials.join(' · ')}` : '',
      pacing.length ? `**${L.pacing}:** ${pacing.join(' + ')} = ${pacing.reduce((a, b) => a + b, 0)} ${L.min}` : '',
    ),
  });
  if (kwHoisted) push(body(kwHoisted));

  // ── page 1 — the five sections ───────────────────────────────────────────────────────
  const P2 = doc.page2 || {};
  const practiceHost = secs.find((s) => (s.blocks || []).some((b) => b && (b.type === 'practice' || b.type === 'faded_example')));
  const hosts = { mistakes: dev ? 'development' : null, differentiation: practiceHost ? practiceHost.id : null };
  const mistakesBody = () => ({
    role: 'mistakes', type: 'bullets', lead: L.p2Mistakes,
    items: (P2.mistakes || []).map((m) => ({ text: `**✗ ${L.pupilSays}**\n${m.pupil_says}\n**✓ ${L.youAsk}**\n${m.you_ask}` })),
  });
  const diffBody = () => ({
    role: 'diff', type: 'bullets', lead: L.p2Diff,
    items: [[L.stuck, P2.differentiation.stuck], [L.barrier, P2.differentiation.barrier], [L.early, P2.differentiation.early]]
      .filter(([, v]) => has(v)).map(([k, v]) => ({ text: `**${k}**\n${v}` })),
  });

  for (const s of secs) {
    if (!s || typeof s !== 'object') continue;
    if (!STAGES.includes(s.id)) report.warnings.push(`section id "${s.id}" is outside ICT's closed heading system`);
    const ctx = {
      heading: s.title || L[s.id] || s.id,
      time: Number(s.minutes) > 0 ? `${s.minutes} ${L.min}` : '',
      stage: s.id,
    };
    const put = (spec) => push(spec, ctx);
    if (s.id === 'introduction' && s.warmup) {
      put({
        role: 'warmup', type: 'bullets', marker: 'num', lead: L.warmup,
        items: (s.warmup.items || []).map((it) => ({
          text: answerItem(it.q, it.a),
          tag: `${L.kind[it.kind] || it.kind}${has(it.from) ? ` · ${it.from}` : ''}`,
        })),
      });
    }
    if (s.id === 'development' && has(s.textbook_page)) {
      put({ role: 'cite', type: 'text', body: `${L.fromBook} ${L.page}${s.textbook_page}` });
    }
    for (const b of s.blocks || []) {
      if (kwHoisted && b === kwHoisted) continue;
      put(body(b));
    }
    if (s.id === hosts.mistakes && (P2.mistakes || []).length) put(mistakesBody());
    if (s.id === hosts.differentiation && P2.differentiation) put(diffBody());
    if (s.id === 'conclusion') {
      if (s.checkpoint) {
        const c = s.checkpoint;
        put({
          role: 'checkpoint', type: 'note', label: `${L.checkpoint}${c.marks ? ` · ${c.marks} ${L.marks}` : ''}`,
          body: lines(strong(c.question), (c.mark_scheme || []).map((m) => `- ${m}`).join('\n')),
        });
      }
      if ((s.exit_ticket || []).length) {
        put({
          role: 'exit', type: 'bullets', marker: 'num', lead: L.exitTicket,
          items: s.exit_ticket.map((x) => ({ text: answerItem(x.q, x.a) })),
        });
      }
      if (has(s.reteach_rule)) put({ role: 'reteach', type: 'note', label: L.reteach, body: s.reteach_rule });
    }
    if (s.id === 'homework' && s.homework && (s.homework.items || []).length) {
      put({
        role: 'hw', type: 'bullets', marker: 'num',
        items: s.homework.items.map((it) => {
          const src = it.source && [it.source.paper, it.source.questions, has(it.source.page) ? `${L.page}${it.source.page}` : null].filter(Boolean);
          return {
            text: `${it.text}${src && src.length ? ` (${src.join(', ')})` : ''}`,
            tag: it.level ? `[${it.level}]${it.marks ? ` ${it.marks}${L.markAbbr}` : ''}` : undefined,
          };
        }),
      });
    }
  }
  if (secs.length) push({ role: 'continues', type: 'text', body: L.continues });

  // ── the support pages ───────────────────────────────────────────────────────────────
  push({
    role: 'p2head', type: 'text',
    body: lines(`**${L.supportPage}** · ${L.grade} ${prov.grade} ${prov.subject || ''} · ${L.page}${prov.printed_pages || ''}`, strong(prov.topic)),
  });
  let letter = 0;
  const S = (label, specs) => {
    const list = specs.filter(Boolean);
    if (!list.length) return;               // an absent section consumes no letter
    const L1 = 'ABCDEFGHIJ'[letter++];
    for (const spec of list) push(spec, { heading: label, stage: `p2 ict-p2-${L1.toLowerCase()}` });
  };

  const B = P2.board_final;
  if (B) {
    const specs = [];
    if (B.diagram) {
      report.unrendered.push({ type: 'diagram', spec: B.diagram.type || null, where: 'board plan', why: 'ICT diagram engine not vendored yet (Phase 2)' });
      specs.push({
        role: 'diagram', type: 'note', label: `⚠ diagram not drawn yet — ${B.diagram.type || '?'}`,
        body: lines(B.diagram.caption, B.caption && B.caption !== B.diagram.caption ? B.caption : ''),
      });
    }
    if ((B.draw_order || []).length) {
      specs.push({ role: 'draworder', type: 'bullets', marker: 'num', lead: L.drawOrder, items: B.draw_order.map((d) => ({ text: unnumber(d) })) });
    }
    S(L.p2Board, specs);
  }
  if ((P2.model_answers || []).length) {
    report.notPrinted.push('page2.model_answers — ICT never paints them; homework answers only (bd-ir1aq)');
  }
  S(L.p2Mistakes, [!hosts.mistakes && (P2.mistakes || []).length ? mistakesBody() : null]);
  S(L.p2Diff, [!hosts.differentiation && P2.differentiation ? diffBody() : null]);

  const eb = P2.exam_bank || {};
  const fbiseGrade = grade == null || grade >= 9;
  if (!fbiseGrade && Object.keys(eb).length) {
    report.notPrinted.push('page2.exam_bank — printed for grade 9+ only; FBISE does not examine grades 6–8 (bd-a8veu.18)');
  }
  if (fbiseGrade) {
    const letterOf = (i) => 'ABCDE'[i];
    const isAnswer = (opt, i, ans) => ans != null
      && (String(ans).trim() === String(opt).trim() || String(ans).trim().toUpperCase() === letterOf(i));
    const mcq = (eb.mcq || []).map((q) => {
      const wrong = q.options.map((o, i) => ({ o, i })).filter(({ o, i }) => !isAnswer(o, i, q.answer));
      const notes = (q.distractor_codes || []).map((c, k) => (wrong[k] ? `**${letterOf(wrong[k].i)}** ${c}` : null)).filter(Boolean);
      return {
        text: lines(strong(q.q),
          q.options.map((o, i) => (isAnswer(o, i, q.answer) ? strong(`${letterOf(i)}. ${o} ✓`) : `${letterOf(i)}. ${o}`)).join('   '),
          notes.length ? `**${L.teacherNote}** ${L.distractors}: ${notes.join(' · ')}` : ''),
      };
    });
    const srqLabel = grade != null && grade >= 9 ? L.srq : L.srqEarly;
    const erq = eb.erq_skeleton;
    S(L.p2Exam, [
      mcq.length ? { role: 'mcq', type: 'bullets', lead: L.mcq, items: mcq } : null,
      eb.srq ? {
        role: 'srq', type: 'note', label: `${srqLabel}${eb.srq.marks ? ` · ${eb.srq.marks} ${L.marks}` : ''}`,
        body: lines(strong(eb.srq.q), `**${L.markScheme}**`, (eb.srq.mark_scheme || []).map((m) => `- ${m}`).join('\n')),
      } : null,
      erq ? {
        role: 'erq', type: 'note', label: `${L.erq}${erq.marks_total ? ` · ${erq.marks_total} ${L.marks}` : ''}`,
        body: lines(erq.q, (erq.parts || []).map((pt) => `- ${pt.heading}${has(pt.note) ? ` — ${pt.note}` : ''}${pt.marks ? ` (${pt.marks} ${L.marks})` : ''}`).join('\n')),
      } : null,
      has(eb.how_marked) ? { role: 'howmarked', type: 'text', body: `**${L.howMarked}:** ${eb.how_marked}` } : null,
    ]);
  }

  const Q = questionIndex(doc);
  S(L.p2Hw, [(P2.homework_key || []).length ? {
    role: 'hwkey', type: 'bullets',
    items: P2.homework_key.map((h) => {
      const it = h.ref ? Q.get(h.ref) : null;
      return {
        text: lines(it ? it.q : (h.item || L.refMissing), `${AR} ${strong(h.answer)}`),
        tag: [h.ref, h.marks ? `${h.marks} ${L.marks}` : ''].filter(Boolean).join(' · ') || undefined,
      };
    }),
  } : null]);
  if (has(P2.next_period) || has(P2.not_going)) {
    report.notPrinted.push('page2.next_period / not_going — ICT stopped painting them; the sequence strip carries next (bd-a8veu.20)');
  }
  if (has(P2.coaching_lookfor)) {
    S(L.p2Coach, [{
      role: 'coach', type: 'text',
      body: lines(P2.coaching_lookfor, has(P2.coaching_reflection) ? `**${L.coachAsk}:** ${P2.coaching_reflection}` : ''),
    }]);
    // The CTA's phone number is redacted in the code mirror we vendor from, so the offer line
    // is withheld rather than printed with a placeholder in it.
    report.unrendered.push({ type: 'coaching_offer', why: 'the WhatsApp number is redacted in the mirror — needs the real line from ICT' });
  }

  const pages = String(prov.printed_pages || '');
  const pagesLabel = /[-–,]/.test(pages) ? `${L.pp}${pages}` : `${L.page}${pages}`;
  const meta = {
    id: doc.lesson_id || `${prov.book_stem || 'lp'}-${prov.topic || ''}`,
    title: prov.topic || doc.lesson_id || '',
    subtitle: [grade != null ? `${L.grade} ${grade}` : '', prov.subject].filter(Boolean).join(' · '),
    locale: want,
    region: REGION,
    subject: prov.subject || '',
    grade: grade == null ? '' : String(grade),
    // ICT's hero: chapter / "p.11 · 40 min" / the lp_type pill, one per line.
    chips: [prov.chapter,
      [pages ? pagesLabel : '', doc.period_minutes ? `${doc.period_minutes} ${L.min}` : ''].filter(has).join(' · '),
      doc.lp_type]
      .filter(has).map((value) => ({ label: '', value: String(value) })),
    footer: [[grade != null ? `${L.grade} ${grade}` : '', prov.subject].filter(Boolean).join(' '), prov.chapter, pages ? `${L.pp}${pages}` : '']
      .filter(has).join(' · '),
  };
  return { guide: { meta, sections, images: [] }, report };
}

module.exports = { buildGuideFromLpDoc, REGION };
