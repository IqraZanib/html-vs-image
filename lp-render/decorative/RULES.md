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

## R2 — Use the content's own headings and words
Section headings are taken exactly as written in the content (e.g. "Lesson Learning
Outcomes", "Key inquiry question", "Learning resources", "Extended Activity").
Do not translate or relabel them. If the content is in Urdu, the output is in Urdu.

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
