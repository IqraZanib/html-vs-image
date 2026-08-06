'use strict';
// Rumi integration adapter — a DROP-IN replacement for the Gamma render call.
//
// In rumi's worker, Gamma today does "author + render + return a PDF URL". Under the
// sovereignty plan, rumi authors the lesson with its OWN LLM and hands the text here;
// this turns it into a delivery-ready PDF for Kenya (Kiswahili) / Yemen (Arabic) and any
// other language — regional children, in-language diagram labels, paginated A4.
//
//   const { renderLessonPdf } = require('lp-render/adapter');
//   const { pdf } = await renderLessonPdf(authoredLessonText, { locale: 'sw', apiKey });
//   await whatsapp.sendDocument(pdf, ...);   // was: download Gamma's PDF URL, then send
//
// `input` may be:
//   • raw authored lesson text  → structured here (needs a kie.ai apiKey), or
//   • a content JSON object / string with a "sections" array → rendered directly.
//
// Returns { pdf, png, contentId, locale, stats }. `pdf` is a Buffer, ready to upload —
// no intermediate URL/download step (one hop fewer than Gamma).
const { renderLessonImage } = require('./pipeline');
const { structureLesson } = require('./structure');

// Normalize the input into a content object when it already is one (object, or a JSON
// string). Raw prose returns null → the caller structures it.
function asContentObject(input) {
  if (input && typeof input === 'object') return input;
  const s = String(input == null ? '' : input).trim();
  if (s.startsWith('{')) {
    try { const o = JSON.parse(s); if (o && typeof o === 'object') return o; } catch (_) { /* not JSON — raw text */ }
  }
  return null;
}

async function renderLessonPdf(input, opts = {}) {
  const { apiKey = process.env.KIE_API_KEY, locale, fresh = false, log = () => {} } = opts;

  // Already-structured content is rendered as-is; anything else (raw text, or JSON
  // without a sections array) is structured first — rumi authors, we shape + render.
  let content = asContentObject(input);
  if (!content || !Array.isArray(content.sections)) {
    if (!apiKey) {
      throw new Error('renderLessonPdf: raw lesson text needs a kie.ai apiKey to structure it. '
        + 'Pass an already-structured content JSON (with a "sections" array) to render without a key.');
    }
    content = await structureLesson(input, { apiKey });
  }

  // rumi already knows the language of the request (sw / ar / …). Honour it so region
  // (Kenya/Yemen), script direction and in-image labels are correct even if the
  // structurer guessed differently from the text.
  if (locale) content.meta = { ...(content.meta || {}), locale };

  const out = await renderLessonImage(content, { apiKey, fresh, log, pdf: true });
  return { pdf: out.pdf, png: out.png, contentId: out.contentId, locale: out.locale, stats: out.stats };
}

module.exports = { renderLessonPdf };
