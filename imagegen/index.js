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

  const report = [];

  // Resolve one block's image (classify -> ladder -> generate -> gate -> cache).
  const resolveOne = async (block) => {
    const { category, needsImage, reason } = classifyBlock(block, segment);
    if (!needsImage) return { blockType: block.type, category, needsImage: false, model: null, asset: null, reason };

    // A block may force a specific model (e.g. an open-weight flux/qwen); otherwise
    // walk the category's cost-ascending ladder. Either way the gate still decides.
    const ladder = block.model ? [block.model] : route(category, segment.locale).ladder;
    const prompt = resolvePrompt({ category, subject: segment.subject, block, region, grade: segment.grade, locale: segment.locale });
    const expectation = block.text || segment.topic || category;

    let resolved = null;
    for (const model of ladder) {
      const key = cacheKey(category, prompt, model);
      const cached = await cache.get(key);
      if (cached) { resolved = { model, asset: cached, credits: 0, reason: 'cache' }; break; }

      let gen = null;
      for (let attempt = 0; attempt < 3; attempt++) { // retry transient gen failures (some models are flaky)
        gen = await generateImpl({ apiKey, model, prompt });
        if (gen.ok) break;
      }
      if (!gen.ok) { report.push({ blockType: block.type, model, event: 'gen_fail', error: gen.error }); continue; }
      if (typeof gen.creditsConsumed === 'number') budget.spend(gen.creditsConsumed);

      const gate = await gateImpl({ apiKey, imageUrl: gen.url, expectation, policy: opts.gatePolicy });
      report.push({ blockType: block.type, model, credits: gen.creditsConsumed, gate: gate.pass, reason: gate.reason });
      if (gate.pass) {
        const asset = { url: gen.url, model };
        await cache.set(key, asset);
        resolved = { model, asset, credits: gen.creditsConsumed, reason: 'generated' };
        break;
      }
    }

    return resolved
      ? { blockType: block.type, category, needsImage: true, model: resolved.model, asset: resolved.asset, reason: resolved.reason, creditsConsumed: resolved.credits }
      : { blockType: block.type, category, needsImage: true, model: null, asset: null, reason: 'fallback: no model passed the quality gate' };
  };

  // Blocks are independent, so resolve them concurrently (output order preserved).
  const images = await Promise.all((segment.blocks || []).map(resolveOne));
  return { images, report };
}

module.exports = { resolveSegmentImages, classifyBlock, generateImage, checkImage };
