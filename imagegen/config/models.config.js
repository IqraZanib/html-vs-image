'use strict';
// Per-model default input params (createTask `input` minus prompt). Add a model
// by adding an entry here + placing its slug in the relevant LADDER — no code change.
const MODELS = {
  'nano-banana-2-lite': { input: { aspect_ratio: '4:3' } },
  'bytedance/seedream-v4-text-to-image': { input: { image_size: 'landscape_4_3', image_resolution: '1K' } },
  'gpt-image-2-text-to-image': { input: { aspect_ratio: '4:3', resolution: '1K' } },
  'nano-banana-2': { input: { aspect_ratio: '4:3', output_format: 'png' } },
  // open-weight fallback for character art (needs aspect_ratio + resolution)
  'flux-2/pro-text-to-image': { input: { aspect_ratio: '2:3', resolution: '1K' } },
};
// Cost-ascending ladders (from docs/image-model-benchmark.md + hook-scene benchmark).
const LADDERS = {
  decorative_scene: ['nano-banana-2-lite', 'bytedance/seedream-v4-text-to-image', 'nano-banana-2'],
  labeled_diagram: ['bytedance/seedream-v4-text-to-image', 'gpt-image-2-text-to-image', 'nano-banana-2'],
};
module.exports = { MODELS, LADDERS };
