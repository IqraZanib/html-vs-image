'use strict';
const { MODELS, LADDERS } = require('./config/models.config');

function route(category) {
  const ladder = LADDERS[category] || [];
  return { needsImage: ladder.length > 0, ladder };
}

// Build a createTask `input` object for a model from its config defaults + prompt.
function modelInput(slug, prompt) {
  const cfg = MODELS[slug];
  if (!cfg) throw new Error(`unknown model slug: ${slug}`);
  return { prompt, ...cfg.input };
}

module.exports = { route, modelInput };
