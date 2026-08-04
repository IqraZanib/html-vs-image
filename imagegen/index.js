'use strict';
const { classifyBlock } = require('./classify');
const { route } = require('./route');
const { resolvePrompt } = require('./prompts/build');
const { generateImage } = require('./kie/generate');
const { checkImage } = require('./quality_gate');
const { cacheKey, MemoryAssetCache } = require('./cache');
const { BudgetGuard } = require('./budget');

// Resolve the images a segment needs: classify each block, and for blocks that
// need an image, walk the cost-ascending model ladder — generate, VLM-gate,
// cache — falling back to the deterministic path if the whole ladder fails.
async function resolveSegmentImages(segment = {}, opts = {}) {
  const {
    apiKey, region = segment.region || 'pk',
    generateImpl = generateImage, gateImpl = checkImage,
    cache = new MemoryAssetCache(), budget = new BudgetGuard(),
  } = opts;

  const images = [];
  const report = [];
  for (const block of (segment.blocks || [])) {
    const { category, needsImage, reason } = classifyBlock(block, segment);
    if (!needsImage) {
      images.push({ blockType: block.type, category, needsImage: false, model: null, asset: null, reason });
      continue;
    }
    const { ladder } = route(category);
    const prompt = resolvePrompt({ category, subject: segment.subject, block, region, grade: segment.grade });
    const expectation = block.text || segment.topic || category;

    let resolved = null;
    for (const model of ladder) {
      const key = cacheKey(category, prompt, model);
      const cached = await cache.get(key);
      if (cached) { resolved = { model, asset: cached, credits: 0, reason: 'cache' }; break; }

      const gen = await generateImpl({ apiKey, model, prompt });
      if (!gen.ok) { report.push({ blockType: block.type, model, event: 'gen_fail', error: gen.error }); continue; }
      if (typeof gen.creditsConsumed === 'number') budget.spend(gen.creditsConsumed);

      const gate = await gateImpl({ apiKey, imageUrl: gen.url, expectation });
      report.push({ blockType: block.type, model, credits: gen.creditsConsumed, gate: gate.pass, reason: gate.reason });
      if (gate.pass) {
        const asset = { url: gen.url, model };
        await cache.set(key, asset);
        resolved = { model, asset, credits: gen.creditsConsumed, reason: 'generated' };
        break;
      }
    }

    if (resolved) {
      images.push({ blockType: block.type, category, needsImage: true, model: resolved.model, asset: resolved.asset, reason: resolved.reason, creditsConsumed: resolved.credits });
    } else {
      images.push({ blockType: block.type, category, needsImage: true, model: null, asset: null, reason: 'fallback: no model passed the quality gate' });
    }
  }
  return { images, report };
}

module.exports = { resolveSegmentImages, classifyBlock, generateImage, checkImage };
