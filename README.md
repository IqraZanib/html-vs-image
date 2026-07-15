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
