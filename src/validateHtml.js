function validateHtml(html) {
  const issues = [];
  const text = String(html || '');

  if (!/<!doctype html>/i.test(text)) {
    issues.push('missing <!DOCTYPE html>');
  }
  if (/https?:\/\//i.test(text)) {
    issues.push('contains external http(s) reference; HTML must be self-contained');
  }
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = bodyMatch ? bodyMatch[1] : '';
  const stripped = bodyInner.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
  if (!bodyMatch || stripped.length === 0) {
    issues.push('empty body content');
  }
  return { ok: issues.length === 0, issues };
}

module.exports = { validateHtml };
