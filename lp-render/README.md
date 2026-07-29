# lp-render

Turn a single-locale lesson-plan JSON into a **PDF buffer**, entirely from code
(HTML/CSS + inline SVG, rendered by Playwright). No Gamma, no AI image model, no
hard-coded content. Drop-in for rumi-platform.

## API

```js
const { renderLessonPlanPdf, buildLessonPlanHtml, validateLesson } = require('./lp-render');

const pdf = await renderLessonPlanPdf(lesson, { locale: 'en' }); // Buffer (content-fit, no empty space)
const html = buildLessonPlanHtml(lesson, { locale: 'en' });       // string (browser-free)
const { ok, errors } = validateLesson(lesson);
```

Input schema: `{ meta: { id, subject, grade, locale, title, subtitle?, durationMin?, classSize?, type? },
sections: [ { type, title?, time?, ...typed } ] }`. Section types: `objectives, materials,
introduction, explore, explanation, picture_equation, guided_practice, assessment,
differentiation, generic`. See `fixtures/lesson-113087.en.json` for a full example.

## Generation policy

- **Locale / Palestine:** the module renders whatever `meta.locale` says. **For the Palestine
  deployment, generate lesson-plan PDFs in English** (`locale: 'en'`). Urdu (`ur`) and Sindhi
  (`sd`) render right-to-left; `sd`/`ar` UI chrome labels are machine-provided — have a native
  speaker review them before using those locales in production.
- **Icons — library only, never irrelevant:** every illustration comes from the built-in SVG
  icon library (~95 icons: 18 tuned inline UI icons + a generated illustration set covering
  animals, fruits, vegetables, people/community helpers, transport, weather, shapes, household
  items, and science diagrams). A lesson references one by name via an `icon` field. If a topic
  or list item has **no matching icon, none is added** (`icon()` returns `''` and each renderer
  guards with `hasIcon()`), so a wrong/irrelevant icon is never inserted. Section-type icons
  (objectives, materials, …) are always present. The illustration set is generated from
  `assets/illustrations/*.svg` into `template/icons-extra.js` via `node scripts/gen-icons-extra.js`
  — add an SVG there and regenerate to extend the library.
- **No empty space:** `renderLessonPlanPdf` defaults to `pageMode: 'fit'` — a **single page sized
  to the content**, so the PDF has **no blank space anywhere** (no fixed-page bottom gaps, no
  empty tail). Pass `{ pageMode: 'a4' }` for fixed A4 pages instead.
- **Maths LPs — show equations as counted objects:** for any Mathematics lesson (addition,
  subtraction, counting, …) use a **`picture_equation`** section so the operation is drawn with
  **repeated icons**, not just text — e.g. `5 🍎 − 2 = 3` renders five apples, a minus sign, two
  apples, `=`, three apples, with the number sentence beneath. Use a countable item icon from the
  library (`apple`, `star`) and set `op` to `"-"` (default) or `"+"`. This concrete visual is far
  clearer for early grades than the text `5 − 2 = 3` alone.
  ```jsonc
  { "type": "picture_equation", "title": "See It — Take Away",
    "equations": [ { "icon": "apple", "a": 5, "op": "-", "b": 2, "result": 3 } ] }
  ```
  (Counts are capped at 20 per group to keep the row readable.)

## Test

```bash
node --test lp-render/test/
```

The PDF-rendering tests skip when no Chromium is resolvable.

## Integration (rumi-platform)

Delete `render/html-to-pdf.js` and import rumi's `bot/shared/utils/html-to-pdf.js`
(identical `htmlToPdf(html, options)` signature). Upload the returned buffer via
`uploadLessonPlanBuffer(...)`. Wire behind a feature flag inside `content.service.js`.

> **No-empty-space caveat at integration:** rumi's `htmlToPdf` defaults to fixed **A4** pages,
> which can leave bottom gaps. To preserve the no-empty-space output, either carry over this
> module's `pageMode: 'fit'` behavior (measure `document.documentElement.scrollHeight` and pass
> an explicit `width`/`height` to `page.pdf`) or accept A4 pagination.

See `docs/superpowers/specs/2026-07-25-lp-render-module-design.md`.
