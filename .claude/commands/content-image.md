---
description: Turn any text into a polished SVG/PNG image (English shows left-to-right; Arabic/Urdu/Sindhi show right-to-left automatically)
argument-hint: <your text>  (optionally add "language: urdu" and "purpose: hero/feature/process/stat/comparison/quote")
allowed-tools: Bash(node:*), Write, Read
---
A teacher wants a picture made from this input:

$ARGUMENTS

Follow these steps exactly — do NOT use any AI image generator, only the local code:

1. From the input work out three things:
   - CONTENT: the actual text to put in the picture.
   - LANGUAGE code: en (English), ar (Arabic), ur (Urdu), or sd (Sindhi).
     If the teacher named a language in words, map it. If not stated, detect from the
     script: Arabic-looking letters ⇒ ask which one, or default to `ur`; Latin ⇒ `en`.
   - PURPOSE: one of hero, feature, process, stat, comparison, quote (default `hero`).
2. Write the CONTENT to a temporary text file (avoids quoting problems with long/RTL text).
3. Run:
   `node content-svg-agent/cli.js content-image --file <tempfile> --lang <lang> --purpose <purpose>`
4. The command prints the saved SVG and PNG paths under `content-svg-agent/output/`.
   Read the PNG and show it to the teacher as a preview, and tell them the file location.
   Remind them: English displays left-to-right and Arabic/Urdu/Sindhi display right-to-left
   automatically — nothing to set by hand.
