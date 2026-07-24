---
description: Render the same content in all 4 languages (English + Arabic + Urdu + Sindhi) side by side to check multilingual & left/right direction
argument-hint: <your text>  (optionally provide a translations file with "translations: path.json")
allowed-tools: Bash(node:*), Write, Read
---
A teacher wants to check how the SAME content looks across all four languages and reading
directions (English left-to-right; Arabic, Urdu, Sindhi right-to-left with a mirrored layout).

Input:

$ARGUMENTS

Steps (local code only — no AI image generator):

1. If the teacher supplied translations (a JSON file with keys en/ar/ur/sd, or four labelled
   blocks of text), create a translations JSON file like:
   `{ "en": "...", "ar": "...", "ur": "...", "sd": "..." }`
   If they gave only one block of text, that same text is used for all four (this still
   demonstrates the direction/layout mirroring; the words just won't be translated —
   this tool never translates, it only lays out).
2. Run either:
   - with translations:  `node content-svg-agent/cli.js lang-test --texts <translations.json> --text placeholder`
   - single text:        write it to a temp file and run `node content-svg-agent/cli.js lang-test --file <tempfile>`
   (optional: add `--purpose feature` etc.)
3. The command saves a 4-up preview at `content-svg-agent/output/lang-test.png`.
   Read it and show the teacher, pointing out that English reads left-to-right while
   Arabic/Urdu/Sindhi read right-to-left with the layout mirrored automatically.
