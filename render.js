const fs = require('node:fs');
const path = require('node:path');
const { renderHtml } = require('./src/renderer');

(async () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const outPath = path.join(__dirname, 'lesson-plan.png');
  const res = await renderHtml(html, outPath);
  console.log(`Rendered ${outPath} (overflowed=${res.overflowed}, dims=${JSON.stringify(res.dims)})`);
})();
