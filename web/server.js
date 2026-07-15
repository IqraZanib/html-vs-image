const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const express = require('express');
const { generate } = require('../src/generate');
const { MODELS } = require('../src/models');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const anchor = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

app.get('/models', (req, res) => res.json(Object.keys(MODELS)));

app.post('/generate', async (req, res) => {
  const { subject, grade, language, topic, model } = req.body || {};
  if (!subject || !language || !topic || !model) {
    return res.status(400).json({ error: 'subject, language, topic, and model are required' });
  }
  const outPath = path.join(os.tmpdir(), `web-lp-${Date.now()}.png`);
  try {
    const { pngPath, metadata } = await generate(
      { subject, grade: grade || 1, language, topic },
      { model, fewShotHtml: anchor, outPath }
    );
    const dataUrl = 'data:image/png;base64,' + fs.readFileSync(pngPath).toString('base64');
    fs.unlinkSync(pngPath);
    res.json({ imageDataUrl: dataUrl, metadata });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lesson-plan generator on http://localhost:${PORT}`));
