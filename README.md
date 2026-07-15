# HTML vs Image

Lesson plans designed in HTML and rendered into print-ready **PNG images** using [Puppeteer](https://pptr.dev/) (headless Chrome). Each lesson plan is a single HTML file — a full-page screenshot turns it into an image.

## Grade 1 · English

### پنکی کا دن — Pinky's Day
<img src="assets/lesson-plan.png" width="600" alt="Grade 1 English — Pinky's Day lesson plan">

[HTML source](index.html) · [Full image](assets/lesson-plan.png)

---

## How it's made

```bash
npm install     # one time — installs Puppeteer + Chromium
node render.js  # renders index.html into lesson-plan.png
```

To add a new lesson plan, edit `index.html`, run `node render.js`, then save the new image into `assets/` and add it to the gallery above.

## Running the generator

Prerequisites: Node.js 20+, and an Anthropic API key (`export ANTHROPIC_API_KEY=...` or `ant auth login`). No image-model key is needed — images are rendered from code.

```bash
npm install
npm test           # run the unit tests
npm run web        # start the web form at http://localhost:3000
npm run benchmark  # run all models over the golden test set -> out/report.html
```

The pipeline: your prompt → Claude writes self-contained HTML/CSS/SVG → Puppeteer renders it to a PNG. No AI image model is used at any step.
