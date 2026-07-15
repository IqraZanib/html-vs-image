const { buildMessages } = require('./promptBuilder');

async function generate(input, opts) {
  const { model, fewShotHtml, outPath, maxRetries = 2, deps = {} } = opts;
  const llmGenerate = deps.llmGenerate || require('./llmClient').generateHtml;
  const validate = deps.validate || require('./validateHtml').validateHtml;
  const render = deps.render || require('./renderer').renderHtml;

  let feedback = '';
  let lastIssues = [];

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const { system, user } = buildMessages(input, fewShotHtml);
    const userMsg = feedback
      ? `${user}\n\nThe previous attempt had these problems:\n${feedback}\nFix them and return the full HTML again.`
      : user;

    const res = await llmGenerate({ model, system, user: userMsg });

    const v = validate(res.html);
    if (!v.ok) {
      feedback = v.issues.join('; ');
      lastIssues = v.issues;
      continue;
    }

    const r = await render(res.html, outPath);
    if (r.overflowed && attempt <= maxRetries) {
      feedback = 'Content overflowed the page width. Make everything fit within A4 (210mm) width.';
      lastIssues = ['overflow'];
      continue;
    }

    return {
      pngPath: r.pngPath,
      metadata: {
        model,
        tokensIn: res.tokensIn,
        tokensOut: res.tokensOut,
        latencyMs: res.latencyMs,
        costUsd: res.costUsd,
        attempts: attempt,
        overflowed: r.overflowed,
        issues: [],
      },
    };
  }

  throw new Error(`failed to generate a valid lesson plan after retries: ${lastIssues.join('; ')}`);
}

module.exports = { generate };
