'use strict';
// ICT (NIETE) Grades 1–5 lesson file → a guide for the ict design pack's Grades 1–5 page.
//
// A Grades 1–5 lesson arrives as an "ict-primary-lesson" file: the fields of NIETE's approved
// lp_html v8.1 phone page (title card, day, journey, outcome, to prepare, video, key words, the
// board, then the stages Opening · Explanation · We Do · You Do · Check · Homework and the
// coaching corner). Real ones are in lp-render/fixtures/ict-primary/ — transcribed from the three
// approved PDFs, since NIETE's Grades 1–5 lesson data is not reachable from here.
//
// This checks the file (every block and picture type must be one the page can lay out, so nothing
// is silently left off) and hands it to the pack as guide.layout. No model is called.
const STAGES = ['opening', 'explanation', 'we_do', 'you_do', 'check', 'homework'];
const BLOCKS = {
  warmup: ['items'], setup: ['lines'], hook: ['text'], read_aloud: ['lines'], teacher_models: ['instruction'],
  worked: ['steps'], ask_this: ['text'], mistakes: ['items'], halfway: ['text'], together: ['lines'], frames: ['lines'],
  set_task: ['lines'], alone: ['items'], differentiation: ['stuck', 'early'], exit: ['items'], homework: ['lines'],
};
const VISUALS = {
  clock: ['time'], clock_pair: ['time'], scene: ['scene'], blender: ['parts', 'word'], blender_list: ['words'],
  blend_steps: ['steps'], tiles: ['parts'], predict: ['title', 'prompt'], dictionary: ['word', 'entry'],
  story_map: ['items'], tracker: ['columns', 'rows'], poster: ['items'],
  traffic_light: [], road_signs: ['signs'], road_sign: ['sign'], look_steps: ['steps'], ordinal_row: ['items'],
  car_road: ['letters'], podium: ['places'], signboards: ['items'], deeds: ['items'],
};
const SCENES = ['songbird', 'kite_tree', 'lake', 'crying_boy', 'pair_reading', 'bunty_home', 'bee_line', 'park_family', 'zebra_crossing'];
const SIGNS = ['stop', 'parking', 'turn_left', 'no_cycling', 'hump', 'crossroads', 'children'];
const DEEDS = ['fan_bulb', 'tap', 'dustbin', 'queue', 'plant', 'ticket', 'heart'];

const isPrimaryLesson = (doc) => !!(doc && doc.kind === 'ict-primary-lesson');

function checkVisual(v, where, problems) {
  if (!v) return 0;
  if (!VISUALS[v.type]) { problems.push(`${where}: no drawing for picture type "${v.type}"`); return 0; }
  for (const f of VISUALS[v.type]) if (v[f] == null) problems.push(`${where}: picture "${v.type}" needs "${f}"`);
  if (v.type === 'scene' && !SCENES.includes(v.scene)) problems.push(`${where}: no drawing for scene "${v.scene}"`);
  for (const g of v.type === 'road_signs' ? v.signs || [] : v.type === 'road_sign' ? [v] : []) if (!SIGNS.includes(g.sign)) problems.push(`${where}: no drawing for road sign "${g.sign}"`);
  if (v.type === 'deeds') for (const d of v.items || []) if (!DEEDS.includes(d.icon)) problems.push(`${where}: no picture for "${d.icon}"`);
  if ((v.type === 'clock' || v.type === 'clock_pair') && !/^\d{1,2}:\d{2}$/.test(String(v.time))) problems.push(`${where}: clock time "${v.time}" is not h:mm`);
  if (v.type === 'scene' && v.time != null && !/^\d{1,2}:\d{2}$/.test(String(v.time))) problems.push(`${where}: clock time "${v.time}" is not h:mm`);
  if (v.type === 'poster') for (const it of v.items || []) if (!/^\d{1,2}:\d{2}$/.test(String(it.time))) problems.push(`${where}: poster time "${it.time}" is not h:mm`);
  return 1;
}

// Every piece of lesson text the page must print, in order (the "nothing dropped" test reads this).
// Board lines a picture draws (board[].drawn) are the picture's, not the page's text.
function printedTexts(lesson) {
  const out = [lesson.title, lesson.chapter, lesson.journey, lesson.coming_up, lesson.outcome.code, lesson.outcome.text, ...lesson.prepare];
  if (lesson.video) out.push(lesson.video.title, lesson.video.note);
  for (const k of lesson.keywords) out.push(k.word, k.meaning);
  for (const b of lesson.board) { if (b.title) out.push(b.title); if (!b.drawn) out.push(...b.lines); }
  for (const st of lesson.stages) {
    out.push(st.label);
    for (const b of st.blocks) {
      switch (b.type) {
        case 'warmup': for (const it of b.items) out.push(it.q, it.a, ...(it.tag ? [it.tag] : [])); break;
        case 'hook': case 'ask_this': case 'halfway': out.push(b.text); break;
        case 'teacher_models': out.push(b.instruction, ...(b.lead || []), ...(b.script || []), ...(b.lead2 || []), ...(b.script2 || [])); break;
        case 'worked': out.push(...b.steps); break;
        case 'mistakes': for (const m of b.items) out.push(m.you_ask); break;
        case 'set_task': out.push(...b.lines, ...(b.say ? [b.say] : [])); break;
        case 'alone': for (const it of b.items) out.push(it.q, ...(it.ref ? [it.ref] : []), ...(it.answer ? [it.answer] : [])); break;
        case 'differentiation': out.push(b.stuck, b.early); break;
        case 'exit': for (const it of b.items) out.push(it.q, it.criterion); break;
        default: out.push(...(b.lines || []));
      }
    }
  }
  out.push(lesson.coaching.ask_yourself);
  return out.filter((s) => s != null && String(s).trim());
}

function buildGuideFromPrimary(lesson) {
  if (!isPrimaryLesson(lesson)) throw new Error('not an ict-primary-lesson file');
  const problems = [];
  for (const f of ['lesson_id', 'lang', 'grade', 'subject', 'chapter', 'pages', 'title', 'outcome', 'prepare', 'keywords', 'board', 'stages', 'coaching']) {
    if (lesson[f] == null) problems.push(`missing "${f}"`);
  }
  if (problems.length) throw new Error(`ict-primary-lesson ${lesson.lesson_id || '?'}: ${problems.join('; ')}`);
  let visuals = checkVisual(lesson.hero_visual, 'hero', problems);
  lesson.board.forEach((b, i) => { visuals += checkVisual(b.visual, `board ${i + 1}`, problems); });
  const ids = lesson.stages.map((s) => s.id);
  for (const id of ids) if (!STAGES.includes(id)) problems.push(`unknown stage "${id}"`);
  if (ids.join() !== STAGES.filter((s) => ids.includes(s)).join()) problems.push(`stages out of order: ${ids.join(', ')}`);
  let blocks = 0;
  for (const st of lesson.stages) {
    for (const [i, b] of st.blocks.entries()) {
      const where = `${st.id} block ${i + 1} (${b.type})`;
      if (!BLOCKS[b.type]) { problems.push(`${where}: no layout for block type "${b.type}"`); continue; }
      for (const f of BLOCKS[b.type]) if (b[f] == null) problems.push(`${where}: needs "${f}"`);
      blocks += 1;
      visuals += checkVisual(b.visual, where, problems) + checkVisual(b.early_visual, where, problems);
      for (const it of b.items || []) visuals += checkVisual(it.visual, where, problems);
    }
  }
  if (problems.length) throw new Error(`ict-primary-lesson ${lesson.lesson_id}: ${problems.join('; ')}`);
  const guide = {
    meta: {
      id: lesson.lesson_id, region: 'ict', locale: lesson.lang, title: lesson.title,
      subject: lesson.subject, grade: String(lesson.grade),
    },
    images: [],
    sections: [],
    layout: { kind: 'ict-primary', lesson },
  };
  const report = {
    lang: lesson.lang, stages: ids, blocks, pictures: visuals,
    presentationFixes: (lesson.source && lesson.source.presentation_fixes) || [],
    notPrinted: [
      'the coaching WhatsApp number (shown on the approved pages; waiting for a decision)',
      '"Support pages follow" — no support pages follow these lessons',
    ],
  };
  return { guide, report };
}

module.exports = { buildGuideFromPrimary, isPrimaryLesson, printedTexts, VISUALS, BLOCKS };
