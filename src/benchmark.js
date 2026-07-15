const path = require('node:path');

async function runBenchmark({ models, testSet, generate, fewShotHtml, outDir }) {
  const results = [];
  for (const model of models) {
    for (const item of testSet) {
      const outPath = path.join(outDir, `${model}__${item.id}.png`);
      try {
        const { pngPath, metadata } = await generate(
          { subject: item.subject, grade: item.grade, language: item.language, topic: item.topic },
          { model, fewShotHtml, outPath }
        );
        results.push({ model, item: item.id, ok: true, pngPath, ...metadata });
      } catch (e) {
        results.push({ model, item: item.id, ok: false, error: e.message });
      }
    }
  }
  return results;
}

function renderReport(results) {
  const rows = results
    .map(
      (r) =>
        `<tr><td>${r.model}</td><td>${r.item}</td><td>${r.ok ? 'ok' : 'FAIL'}</td>` +
        `<td>${r.costUsd != null ? '$' + r.costUsd.toFixed(5) : '-'}</td>` +
        `<td>${r.latencyMs != null ? r.latencyMs + 'ms' : '-'}</td>` +
        `<td>${r.attempts != null ? r.attempts : '-'}</td></tr>`
    )
    .join('\n');

  const cards = results
    .filter((r) => r.ok && r.pngPath)
    .map(
      (r) =>
        `<figure style="margin:0"><figcaption>${r.model} · ${r.item}</figcaption>` +
        `<img src="file://${r.pngPath}" width="360" style="border:1px solid #ccc"></figure>`
    )
    .join('\n');

  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Benchmark Report</title></head><body>` +
    `<h1>Lesson-Plan Benchmark</h1>` +
    `<table border="1" cellpadding="6" style="border-collapse:collapse">` +
    `<thead><tr><th>Model</th><th>Item</th><th>Status</th><th>Cost</th><th>Latency</th><th>Attempts</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `<h2>Gallery</h2><div style="display:flex;flex-wrap:wrap;gap:16px">${cards}</div>` +
    `</body></html>`
  );
}

module.exports = { runBenchmark, renderReport };
