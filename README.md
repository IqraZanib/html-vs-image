# HTML vs Image

Lesson plans jo HTML mein design ki jaati hain aur phir [Puppeteer](https://pptr.dev/) (headless Chrome) se print-ready **PNG images** mein render hoti hain. Har lesson plan ek HTML file hoti hai — poore page ki screenshot le kar image bana di jaati hai.

## Grade 1 · English

### پنکی کا دن — Pinky's Day
<img src="assets/lesson-plan.png" width="600" alt="Grade 1 English — Pinky's Day lesson plan">

[HTML source](index.html) · [Full image](assets/lesson-plan.png)

---

## Kaise banti hai (How it's made)

```bash
npm install     # ek baar — Puppeteer + Chromium install karta hai
node render.js  # index.html ko render kar ke lesson-plan.png banata hai
```

Naya lesson plan add karne ke liye `index.html` edit karein, `node render.js` chalayein, aur nayi image ko `assets/` mein save kar ke upar gallery mein daal dein.
