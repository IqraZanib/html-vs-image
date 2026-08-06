# Lesson-Plan Image — Rendering Rules

These rules govern `scripts/render-lp-image.js`. **The script reads this file first**
(parsing the `GATE_POLICY` block below) and only then builds the lesson-plan image.
Edit the rules here — the renderer's behaviour follows.

The renderer is **generic**: it works for any subject, any grade, and any language.
It is driven entirely by the content JSON it is given. It NEVER invents lesson content.

## R1 — Use the content verbatim, never summarize
Every heading and every word rendered must come straight from the content JSON.
Do not shorten, reword, paraphrase, or "improve" the wording. If the content has
six learning resources, all six appear. If a step has a core-competency note, it
stays. Nothing is dropped and nothing is condensed.

## R2 — Use the content's own headings and words, in the content's language
Section headings are taken exactly as written in the content (e.g. "Lesson Learning
Outcomes", "Key inquiry question", "Learning resources", "Extended Activity").
Do not translate or relabel the content itself. If the content is in Urdu/Arabic/etc,
the whole output is in that language. Everything a reader sees — headings, item
labels, sub-headings — must be in the content's language: if the source wraps
non-English content in English field keys (teacher, pupil, board, g1, teachers_corner),
those short labels are translated into the content's language, never left in English.
Only the labels are localized; the lesson's own sentences stay verbatim.

## R3 — Never generate content yourself
The renderer only styles what it is given. It must not add facts, examples,
definitions, emoji "labels", or explanations that are not in the content. Decorative
motifs (stars, sparkles, leaves) are visual only and carry no lesson meaning.

## R4 — Images come from the content
Generate an image only for a concept that is named in the content (a chart/diagram
it references, a resource it lists such as balloons, an activity it describes). Every
listed teaching resource that can be shown should be shown. Do not add images for
concepts the content does not mention.

## R5 — Never show where an image came from
Rendered images carry only their content label. The image-generation model, provider,
or source is never printed on or near the image.

## R6 — Every image passes the quality gate
Before an image is used it is checked by the vision quality gate against `GATE_POLICY`
below. If it fails — wrong, mislabeled, or against human values — it is rejected and
the next model in the ladder is tried. If no image passes, that slot is left empty
rather than showing a bad image.

## R8 — When no relevant image exists, use an animated character
Many sections are instructions, activities, practice, experiments, or a conclusion
where no real photo or diagram fits. Never leave such a section flat. Place a
friendly animated character from the reusable cast so it points inward at the
heading — a decent, educational way to keep the section engaging. Characters are a
shared cast generated once and reused across every lesson (cheap, consistent). They
carry no lesson meaning and never replace or alter the content's words. Any section
may opt out or force a specific character via `character: false | "<id>"`.

## R9 — Vary how characters are presented
Do not repeat the same figure the same way. Present characters in different ways so
the page stays fresh and attractive: a teacher teaching at the board for step-by-step
development, students sitting and listening for the introduction, a discussing pair
for activities and group work, and simple pointing figures elsewhere. Repeated
teachers must rotate through different clothing colours (teal, coral, purple, …) so
no two look identical. The cast is a shared, cached set — add poses/colours to the
cast, not one-off generations.

## R10 — Size characters to the content boundary
A character must fit the block it sits beside — never dwarfed in a tall panel, never
overflowing a short one. Estimate the section's content height and size the figure to
it: multi-step development gets a larger figure, a one-line note a smaller one. Wider
poses (pairs, sitting groups, board scenes) get a slightly wider box. The character
never forces the panel taller than its own content needs.

## R7 — Format and colour by UI/UX best practice
Clear visual hierarchy, generous spacing, readable contrast, consistent section
cards, a coherent colour theme, and correct reading direction for the language.
Styling is the renderer's job; wording is not.

## R11 — Give the pipeline a proper structure, or structure it first
The renderer needs a content object with a `sections` array. Raw lesson text — or a
JSON in any other shape (a lesson buried in a text field, an API/response dump) —
must be structured into the schema first, keeping the lesson's own words, never
rendered as-is. Content with no recognisable sections renders blank; detect that and
structure it before rendering rather than emitting an empty page.

## R12 — Never orphan an image
Every image the content declares must be placed in an `images` section so it actually
appears in the render. Generating an image and then not displaying it wastes credits.
When structuring content, always add the `images` section that lists the image ids.

## R13 — Prompt for the subject, not a rigid style
Image prompts must describe the subject plainly. Do not over-specify style or details
the model may not honour ("plain background", "flat cartoon", "speed lines", "no
face"): the quality gate compares the image against its prompt, so an over-specified
prompt makes a perfectly good image fail for a detail it was never going to match.
Keep prompts subject-focused; let the house style come from the scaffold, not the ask.

## R14 — Formulas are code, never pictures
Never image-generate mathematical notation or formulas — image models drift (a broken
radical, a misplaced fraction bar, a stray bracket). Render every formula with the
code engines: a `math` section (KaTeX or MathJax) for display formulas, inline `$…$`
for a formula inside a sentence.

## R15 — Reuse before you spend; never leave a blank
Check the shared asset store before generating — an image already made for the same
prompt is restored for free, so identical requests never cost twice. Retry a transient
generation failure before giving up. If an image still cannot be produced, fall back to
a character (R8); never leave a section visually empty.

## R16 — Clean the source's formatting
Strip markdown that would otherwise print as literal symbols: `#`/`##` heading
markers and `*` are removed, `**bold**` becomes real bold, a leading `- ` becomes a
bullet, and `\n` becomes a real line break. Headings, labels and captions are cleaned
of markdown too — a reader should never see a stray `#` or `*`.

## R17 — Bold inline sub-headings; don't promote them
A short label at the start of a line — `**Bold:**` or `Somo:` (a word/phrase followed
by a colon) — is a sub-heading. Render it **bold in the same font and size**. It is not
a new section: it gets no icon disc and no separate heading band.

## R18 — Show a repeated heading once
When a phase is split (for example across structuring chunks) two sections can carry
the same heading. Show the heading once; the following same-heading section renders as
a continuation, with no repeated header.

## R19 — Every declared image is shown; not every heading needs one
An image named in the content must appear — if no section references it, append it so
it is never silently missing. Conversely, only place images where they help the page;
a heading with no fitting image is fine, and images must never overflow their box.

## R20 — Vary the faces
No character repeats within one lesson, and different lessons/subjects draw a different
cast (seeded by the lesson) so a maths plan and a science plan never look identical.

## R21 — Deliverable and polish
The final deliverable is a PDF. Keep spacing tight (no dead space), centre image
captions, and give the title block faint letterhead icons.

## R22 — Local children, by the lesson's language
Characters and any people in images must match the lesson's region so local teachers
recognise their own pupils: **Arabic → Yemeni** children and setting, **Kiswahili →
Kenyan** children and setting, otherwise Pakistani. Each region has its own cast,
generated once and cached.

## R23 — Characters are a fallback, not decoration on every page
Prefer real, informative content images. Add cartoon characters ONLY when a lesson
has NO content images at all — then a few characters keep it from looking blank. If
the lesson already shows content images, add no characters. Never place a character on
every section, and never repeat one within a lesson.

## R24 — Images must be informative and content-relevant
Like a textbook: a labelled diagram of the very thing being taught (family members
each labelled by name, the parts of a plant, a process), not decorative filler and
never irrelevant. Label what teaches vocabulary or parts. A book does not put a picture
on every page — 1–3 well-chosen, representative images per lesson is plenty.

## R25 — Paginate long content; number the pages; clean page flow
The deliverable is a PDF. When content is long, split it across readable A4 pages
rather than one endless strip; keep the font size readable. Every page shows its number
at the top as "current / total". Page flow must look clean:
- give every page breathing room at the top — content is never flush against the top
  boundary (it sits below the page-number band);
- never strand a heading alone at the bottom of a page (a heading stays with the start
  of its content);
- never split a single card, image, step or bullet across two pages;
- but do let a long section continue onto the next page so pages fill up — no large
  empty gap at the bottom of a page.

  Implementation caveat: the paginated PDF's top/bottom page margin MUST be set as a CSS
  `@page{margin:…}` rule in the paged branch, not only via the Playwright `pdf({margin})`
  option. Chromium gives an explicit `@page` margin precedence over the API option, and the
  shell ships `@page{margin:0}`; if the paged branch doesn't override it in CSS, every
  continuation page prints flush to the top edge and the page number overlaps the first
  section. (See `render/html-to-pdf.js`, `pageMode:'paged'`.)

## R26 — Colour only for what matters
Use colour to signal what is important — the title, section headings, and emphasis
callouts (checkpoints, key notes). Keep everything else on a clean white ground. A
page drowning in colour is harder to read than white with a few deliberate accents.

## R27 — No empty pages: fill the space smoothly
Without touching anything else that already works, handle this situation: when a section —
most often a short **images** section — lands alone on a paginated page and would leave a
large empty gap below it, arrange and size its content so the page fills smoothly and looks
intentional. For images specifically, let the image cards grow to take more of the page
height (in the PDF) instead of sitting as a small strip with white space beneath them.
Constraints while doing so:
- never crop or distort an image to fill (grow the card, keep the whole picture — contain);
- never split a single image, card, step or bullet across a page (R25 still holds);
- this is a **print/PDF-only** adjustment — the on-screen preview and the visual-regression
  goldens must not change (implemented via `@media print` in `theme.js`).

## R28 — In-image text is in the lesson's language
Any text that appears INSIDE a generated image — a diagram's part labels, a chart's
headers — must be written in the lesson's own language and script, never English (unless
the lesson is English). Arabic → Arabic labels (right-to-left), Kiswahili → Kiswahili,
and so on. An English label inside an Arabic or Kiswahili lesson image is a defect: it
breaks the teacher's "apnaniyat" and makes the picture uninformative for the class. This
is enforced two ways — the structurer states the label language in each diagram prompt,
and the image-prompt builder appends the locale's script directive
(`imagegen/prompts/build.js` → `labeled_diagram`). Prefer a LABELLED, content-specific
diagram over a vague decorative picture, so the image actually teaches.

## GATE_POLICY
- The image must be correct for the exact concept named in the content. For a labeled
  diagram, every label must be spelled correctly and point to the right part; reject
  any diagram with a wrong, missing, or misplaced label (for example a wrongly drawn
  or wrongly placed diaphragm on a breathing-system chart).
- Reject anything against human values: violence, blood, weapons, nudity or sexual
  content, hate or discriminatory symbols, harmful stereotypes, frightening imagery,
  substance use, or culturally/religiously offensive content.
- People shown must be modestly and respectfully dressed and depicted inclusively.
- Prefer clear, simple, well-lit educational visuals a teacher can point at.
