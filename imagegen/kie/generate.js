'use strict';
const { runImageTask } = require('./client');
const { modelInput } = require('../route');

// Generate one image for a resolved prompt with a specific model.
async function generateImage({ apiKey, model, prompt, params = {}, runImpl = runImageTask, fetchImpl } = {}) {
  const input = { ...modelInput(model, prompt), ...params };
  const r = await runImpl({ apiKey, model, input, fetchImpl });
  if (!r.ok) return { ok: false, model, error: r.error, creditsConsumed: r.creditsConsumed, latencyMs: r.latencyMs };
  return { ok: true, model, url: r.url, creditsConsumed: r.creditsConsumed, latencyMs: r.latencyMs };
}

module.exports = { generateImage };
