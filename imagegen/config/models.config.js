'use strict';
// Per-model default input params (createTask `input` minus prompt). Add a model
// by adding an entry here + placing its slug in the relevant LADDER — no code change.
const MODELS = {
  'nano-banana-2-lite': { input: { aspect_ratio: '4:3' } },
  'bytedance/seedream-v4-text-to-image': { input: { image_size: 'landscape_4_3', image_resolution: '1K' } },
  'gpt-image-2-text-to-image': { input: { aspect_ratio: '4:3', resolution: '1K' } },
  'nano-banana-2': { input: { aspect_ratio: '4:3', output_format: 'png' } },
  // Open-weight options (verified working — see docs/image-model-benchmark.md):
  //  flux-2/pro : reliable (3/3), pure-white bg, but slow/variable (24–83s), 5cr. Needs aspect_ratio + resolution.
  //  qwen2      : fastest (~10s), 5.6cr, but returns a tinted (non-white) bg. image_size uses ratio strings ('1:1'), NOT 'portrait_4_3'.
  'flux-2/pro-text-to-image': { input: { aspect_ratio: '2:3', resolution: '1K' } },
  'qwen2/text-to-image': { input: { image_size: '1:1' } },
};
// Direct type → model assignment (NOT a cost-ascending climb). Each image type goes
// straight to the model that empirically makes it best on the FIRST attempt, so we do
// not burn credits generating-then-rejecting cheap models. The second entry is a single
// safety fallback the quality gate escalates to ONLY if the primary is rejected.
// Grounded in docs/image-model-benchmark.md.
const LADDERS = {
  // Scenes (children/activity/family, no in-image text): cheap, fast, warm art with
  // expressive faces → nano-banana-2-lite. Fallback: qwen2 (open-weight, ~10s, good art).
  decorative_scene: ['nano-banana-2-lite', 'qwen2/text-to-image'],
  // Latin-script labelled diagrams (en, sw, fr…): Seedream v4 = best value + accurate
  // labels on the first try. Fallback: nano-banana-2 (top label fidelity).
  labeled_diagram: ['bytedance/seedream-v4-text-to-image', 'nano-banana-2'],
  // Complex / right-to-left scripts (Arabic, Urdu…): only the strongest model renders
  // the script reliably, so give it the top model FIRST (cheaper in expectation than
  // letting Seedream fail the gate and climb anyway). Fallback: gpt-image-2.
  labeled_diagram_complex: ['nano-banana-2', 'gpt-image-2-text-to-image'],
};

// Scripts whose in-image labels only the strongest model renders reliably.
const COMPLEX_SCRIPT = new Set(['ar', 'ur', 'sd', 'fa', 'ps']);

// Resolve the model list for a category, honouring the lesson locale for diagrams.
function ladderFor(category, locale) {
  if (category === 'labeled_diagram' && COMPLEX_SCRIPT.has(String(locale || '').toLowerCase())) {
    return LADDERS.labeled_diagram_complex;
  }
  return LADDERS[category] || [];
}

module.exports = { MODELS, LADDERS, COMPLEX_SCRIPT, ladderFor };
