---
description: Make a landing-page hero or feature image from a section of text (auto LTR/RTL by language)
argument-hint: <landing-page section text>  (optionally add "language: english/arabic/urdu/sindhi")
allowed-tools: Bash(node:*), Write, Read
---
A teacher/marketer wants a landing-page image from this section text:

$ARGUMENTS

Steps (local code only — never an AI image generator):

1. Work out the CONTENT text and the LANGUAGE code (en/ar/ur/sd) as for /content-image
   (detect from script if not stated: Latin ⇒ en, Arabic script ⇒ ask or default ur).
2. Write the CONTENT to a temporary text file.
3. Run:
   `node content-svg-agent/cli.js lp-image --file <tempfile> --lang <lang>`
   (The tool auto-picks a big HERO layout for short text, or a FEATURE GRID when the
   text has 3+ bullet points.)
4. Read the printed PNG path, show it as a preview, and tell the teacher where the SVG is.
   English is left-to-right; Arabic/Urdu/Sindhi are right-to-left automatically.
