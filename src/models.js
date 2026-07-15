const MODELS = {
  'claude-haiku-4-5': { label: 'Claude Haiku 4.5', inPricePerM: 1.0, outPricePerM: 5.0 },
  'claude-sonnet-5': { label: 'Claude Sonnet 5', inPricePerM: 3.0, outPricePerM: 15.0 },
  'claude-opus-4-8': { label: 'Claude Opus 4.8', inPricePerM: 5.0, outPricePerM: 25.0 },
};

function costUsd(model, tokensIn, tokensOut) {
  const m = MODELS[model];
  if (!m) throw new Error(`unknown model: ${model}`);
  return (tokensIn / 1e6) * m.inPricePerM + (tokensOut / 1e6) * m.outPricePerM;
}

module.exports = { MODELS, costUsd };
