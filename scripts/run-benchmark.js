const fs = require('node:fs');
const path = require('node:path');
const { TEST_SET } = require('../src/testset');
const { MODELS } = require('../src/models');
const { runBenchmark, renderReport } = require('../src/benchmark');
const { generate } = require('../src/generate');

async function main() {
  const outDir = path.join(__dirname, '..', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const fewShotHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const models = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MODELS);
  console.log(`Benchmarking models: ${models.join(', ')} over ${TEST_SET.length} prompts`);

  const results = await runBenchmark({ models, testSet: TEST_SET, generate, fewShotHtml, outDir });

  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(outDir, 'report.html'), renderReport(results));

  const ok = results.filter((r) => r.ok).length;
  console.log(`Done. ${ok}/${results.length} succeeded. Report: out/report.html`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
