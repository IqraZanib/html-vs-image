# html-vs-image

HTML lesson plan ko ek **PNG image** mein convert karne wala chhota tool. [Puppeteer](https://pptr.dev/) (headless Chrome) ke zariye `index.html` ko render kar ke uski full-page screenshot `lesson-plan.png` ke naam se save karta hai.

Ye Grade 1 English/Urdu lesson plan — **"پنکی کا دن" (Pinky's Day)** — ke liye banaya gaya hai, jismein Urdu Nastaliq text, SVG illustrations aur A4 print layout shamil hai.

## Sample Output

![Lesson plan sample](assets/lesson-plan.png)

## Zaroori cheezain (Requirements)

- [Node.js](https://nodejs.org/) (v18 ya us se upar recommended)
- npm (Node ke saath aa jata hai)

## Setup

Repo clone karne ke baad dependencies install karein:

```bash
npm install
```

Ye `puppeteer` install karega, jo pehli baar apne saath ek Chromium browser bhi download karta hai.

## Istemal (Usage)

Image generate karne ke liye:

```bash
node render.js
```

Ye command:

1. Headless Chrome launch karta hai
2. `index.html` ko browser mein open karta hai
3. Poore page ki screenshot leta hai
4. Result `lesson-plan.png` ke naam se save karta hai

## Files

| File | Kaam |
|------|------|
| `index.html` | Lesson plan ka HTML/CSS design (2 A4 pages) |
| `render.js`  | Puppeteer script jo HTML ko PNG mein convert karta hai |
| `assets/lesson-plan.png` | Sample output image |
| `package.json` | Project config aur dependencies |

## Note

- `index.html` mein Urdu ke liye Google Fonts (Noto Nastaliq Urdu) use hota hai — pehli baar render karte waqt **internet** hona chahiye. Offline hone par system fonts par fall back kar jata hai.
- Root folder ki `lesson-plan.png` har run par dobara ban jati hai, is liye woh `.gitignore` mein hai. Sample copy `assets/` folder mein rakhi gayi hai.

## Design change karna

Lesson plan ka layout, text ya colors badalna ho to `index.html` edit karein, phir dobara `node render.js` chala kar nayi image dekhein.
