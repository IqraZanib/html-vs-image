'use strict';
const { MODELS, ladderFor } = require('./config/models.config');

// Resolve which model(s) a category uses. `locale` selects the script-appropriate
// diagram models (e.g. Arabic → a model that renders Arabic labels first-try).
function route(category, locale) {
  const ladder = ladderFor(category, locale);
  return { needsImage: ladder.length > 0, ladder };
}

// Build a createTask `input` object for a model from its config defaults + prompt.
function modelInput(slug, prompt) {
  const cfg = MODELS[slug];
  if (!cfg) throw new Error(`unknown model slug: ${slug}`);
  return { prompt, ...cfg.input };
}

module.exports = { route, modelInput };
