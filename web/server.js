const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const express = require('express');
const { generate } = require('../src/generate');
const { MODELS } = require('../src/models');
const { addToGallery } = require('../src/gallery');
const { renderTemplateHtml } = require('../src/template');
const { renderHtml } = require('../src/renderer');
const { validateHtml } = require('../src/validateHtml');

const REPO_ROOT = path.join(__dirname, '..');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const anchor = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');

// 'template' works with NO API key (code-only). The Claude models need ANTHROPIC_API_KEY.
app.get('/models', (req, res) => res.json(['template', ...Object.keys(MODELS)]));

app.post('/generate', async (req, res) => {
  const { subject, grade, language, topic, model } = req.body || {};
  if (!subject || !language || !topic || !model) {
    return res.status(400).json({ error: 'subject, language, topic, and model are required' });
  }
  const input = { subject, grade: grade || 1, language, topic };
  const outPath = path.join(os.tmpdir(), `web-lp-${Date.now()}.png`);

  try {
    let pngPath;
    let metadata;

    if (model === 'template') {
      // No LLM, no API key — build the HTML from a template and render it.
      const html = renderTemplateHtml(input);
      const v = validateHtml(html);
      if (!v.ok) throw new Error('template HTML invalid: ' + v.issues.join('; '));
      const r = await renderHtml(html, outPath);
      pngPath = r.pngPath;
      metadata = { model: 'template (no API key)', costUsd: 0, latencyMs: 0, overflowed: r.overflowed };
    } else {
      const out = await generate(input, { model, fewShotHtml: anchor, outPath });
      pngPath = out.pngPath;
      metadata = out.metadata;
    }

    const dataUrl = 'data:image/png;base64,' + fs.readFileSync(pngPath).toString('base64');

    // Add every generated image to the repo README gallery (best-effort — a
    // gallery failure must not fail the generation response).
    let galleryPath = null;
    try {
      galleryPath = addToGallery({ pngSource: pngPath, input, metadata, repoRoot: REPO_ROOT }).relPath;
    } catch (e) {
      console.error('gallery add failed:', e.message);
    }

    fs.unlinkSync(pngPath);
    res.json({ imageDataUrl: dataUrl, metadata, galleryPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lesson-plan generator on http://localhost:${PORT}`));
