# lp-render

Turn a single-locale lesson-plan JSON into an **A4 PDF buffer**, entirely from code
(HTML/CSS + inline SVG, rendered by Playwright). No Gamma, no AI image model, no
hard-coded content. Drop-in for rumi-platform.

## API

```js
const { renderLessonPlanPdf, buildLessonPlanHtml, validateLesson } = require('./lp-render');

const pdf = await renderLessonPlanPdf(lesson, { locale: 'ur' }); // Buffer
const html = buildLessonPlanHtml(lesson, { locale: 'ur' });       // string (browser-free)
const { ok, errors } = validateLesson(lesson);
```

Input schema: `{ meta: { id, subject, grade, locale, title, subtitle?, durationMin?, classSize?, type? },
sections: [ { type, title?, time?, ...typed } ] }`. Section types: `objectives, materials,
introduction, explore, explanation, guided_practice, assessment, differentiation, generic`.
See `fixtures/lesson-113087.en.json` for a full example.

## Test

```bash
node --test lp-render/test/
```

The PDF smoke test skips when no Chromium is resolvable.

## Integration (rumi-platform)

Delete `render/html-to-pdf.js` and import rumi's `bot/shared/utils/html-to-pdf.js`
(identical signature). Upload the returned buffer via `uploadLessonPlanBuffer(...)`.
Wire behind a feature flag inside `content.service.js`. See
`docs/superpowers/specs/2026-07-25-lp-render-module-design.md`.
