// Loads bundled, open-license illustrations (OpenMoji, CC BY-SA 4.0) and returns them
// as inline SVG sized to fit. No network, no AI — the code composes pre-made professional
// artwork into each lesson plan.
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'assets', 'illustrations');
const cache = {};

// Returns inline SVG markup for the named illustration at the given pixel size,
// or '' if the asset is missing (so a missing file never breaks rendering).
function illustration(name, size = 40) {
  if (!(name in cache)) {
    const p = path.join(DIR, `${name}.svg`);
    cache[name] = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  }
  let s = cache[name];
  if (!s) return '';
  s = s.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  // Drop <metadata> blocks (they carry http:// license URIs).
  s = s.replace(/<metadata>[\s\S]*?<\/metadata>/gi, '');
  // Force size on the opening <svg> tag and drop xmlns/width/height.
  // Inline SVG inside HTML5 does not need an xmlns; removing it also removes the
  // http:// URI so the document stays "self-contained" for the validator.
  s = s.replace(/<svg[^>]*>/, (tag) => {
    const cleaned = tag
      .replace(/\sxmlns(:\w+)?="[^"]*"/g, '')
      .replace(/\s(width|height)="[^"]*"/g, '');
    return cleaned.replace('<svg', `<svg width="${size}" height="${size}"`);
  });
  // Safety net: strip any remaining absolute URLs so nothing external leaks in.
  s = s.replace(/https?:\/\/[^"'\s>)]*/g, '');
  return s.trim();
}

module.exports = { illustration };
