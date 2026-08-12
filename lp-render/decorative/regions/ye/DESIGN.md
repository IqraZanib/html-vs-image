# Yemen design set — «دليل الدرس اليومي»

**Source of truth:** the approved pilot `YE_BLN_Math_G3_U1_L2_4digit_1000_2000_v11.pdf`
(card PROJ-044; SHLS/BLN shape). NOTE: the pilot PDF is the ANNOTATED DESIGN SPEC —
its small English labels ("TEAL OBJECTIVE", "HERO ILLUSTRATION") are designer
annotations, not content.

## Measured spec (pixel-sampled — never match by eye; sample, fix, re-sample)
- Page ground **WHITE `#fcfcfc`** (cream only inside tinted panels)
- Header **`#182448`** navy-indigo, **~78px tall**, gold rule below;
  title «دليل الدرس اليومي» top-RIGHT (RTL start), ministry lines top-LEFT
- Lesson-info line sits BELOW the header (navy, right-aligned) — not in the band
- Stage tints: rose **`#fcd8d8`** (التمهيد, figure on the RIGHT) · blue `#e7eef8`
  (العرض) · green `#e9f2e5` (التطبيق) · amber **`#fcf0d8`** (التقويم)
- «✔ تحقق» strip amber `#fcf0d8`; «هدف اليوم:» inline TEAL in a white teal-border card;
  errors strip = ONE coral-border card titled «أخطاء شائعة — انتبه لها» (red)
- Footer: plain thin navy rule + centred line (NOT a dark band)

## Typography (reviewer-selected via 5-font specimen, 2026-08-12)
**IBM Plex Sans Arabic** — 400 body (13.5–14px, line-height ≥1.55), 700 headings.
Embedded from `@fontsource/ibm-plex-sans-arabic` at require-time; falls back to
Noto Naskh when absent.

## THE CONTENT CONTRACT — section ids (order-independent)
Role styling is applied by **section `id`** (rendered as a `sec-<id>` class).
Any content JSON that wants the full Yemen treatment must use these ids:

| id | role | notes |
|---|---|---|
| `lesson-line` | subject·grade·lesson line below header | type `text` |
| `goal` | هدف اليوم card | type `note`, body starts `**هدف اليوم:** …` |
| `errors` | أخطاء شائعة card | type `qa`, 2 items (خطأ / صواب) |
| `errors-caption` | caption under the twins | type `text` |
| `stage-tamhid` | التمهيد (rose, figure RIGHT) | type `steps`, `time` pill carries `٨ دقائق · أنا أفعل`, LAST item label `تحقق` |
| `stage-arad` | العرض (blue) | same steps shape |
| `stage-tatbiq` | التطبيق (green) | same steps shape |
| `stage-taqwim` | التقويم والختام (amber) | same steps shape |
| `solutions` | حلول التدريبات | type `bullets` |
| `glossary` | مصطلحات | type `fields` |
| `multigrade` | تكييف متعدد الصفوف | type `bullets` |
| `homework` | الواجب المنزلي · ركن المعلم | type `note` |

Stage figures: declare images (`concept: diagram` prompts pass the gate; scene-form
fails often) and set `image: <id>` on the stage section. Sections WITHOUT these ids
still get the base Yemen skin (white page, navy header, Plex, tints absent).
Canonical example: `assets/content/daleel-usrati-2p.ar.json`.

## Review protocol
Three-up compare (pilot / ours). A named differing element is a defect — fix same-day.
