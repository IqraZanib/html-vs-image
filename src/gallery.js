const fs = require('node:fs');
const path = require('node:path');

const GALLERY_HEADER = '## Generated lesson plans';

function slugify(s) {
  return (
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'lesson'
  );
}

// Copies a generated PNG into <repoRoot>/assets/generated/ and appends an entry
// (image + caption) to <repoRoot>/README.md under a "Generated lesson plans"
// section, creating the section if it doesn't exist yet.
// Returns { relPath, destAbs }.
function addToGallery({ pngSource, input, metadata, repoRoot }) {
  const genDir = path.join(repoRoot, 'assets', 'generated');
  fs.mkdirSync(genDir, { recursive: true });

  const base = `${slugify(input.subject)}-${slugify(input.language)}-${slugify(input.topic)}`;
  let n = 1;
  let file;
  do {
    file = `${base}-${n}.png`;
    n += 1;
  } while (fs.existsSync(path.join(genDir, file)));

  const destAbs = path.join(genDir, file);
  fs.copyFileSync(pngSource, destAbs);
  const relPath = `assets/generated/${file}`;

  const meta = metadata || {};
  const metaBits = [];
  if (meta.model) metaBits.push(meta.model);
  if (typeof meta.costUsd === 'number') metaBits.push(`$${meta.costUsd.toFixed(5)}`);
  if (typeof meta.latencyMs === 'number') metaBits.push(`${meta.latencyMs}ms`);
  const metaSuffix = metaBits.length ? ` _(${metaBits.join(' · ')})_` : '';

  const caption = `${input.subject} · Grade ${input.grade} · ${input.language} — ${input.topic}${metaSuffix}`;
  const entry =
    `### ${input.subject} — ${input.topic} (${input.language})\n` +
    `<img src="${relPath}" width="480" alt="${input.subject} ${input.language} lesson plan">\n\n` +
    `${caption}\n`;

  const readmePath = path.join(repoRoot, 'README.md');
  let readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : '';
  if (!readme.includes(GALLERY_HEADER)) {
    readme = `${readme.trimEnd()}\n\n${GALLERY_HEADER}\n`;
  }
  readme = `${readme.trimEnd()}\n\n${entry}`;
  fs.writeFileSync(readmePath, readme);

  return { relPath, destAbs };
}

module.exports = { addToGallery, slugify, GALLERY_HEADER };
