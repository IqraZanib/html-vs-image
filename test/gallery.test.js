const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { addToGallery } = require('../src/gallery');

function tmpRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-test-'));
  fs.writeFileSync(path.join(dir, 'README.md'), '# Title\n\nsome intro\n');
  const src = path.join(dir, 'src.png');
  fs.writeFileSync(src, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]));
  return { dir, src };
}

test('addToGallery copies the image under assets/generated and returns a rel path', () => {
  const { dir, src } = tmpRepo();
  const r = addToGallery({
    pngSource: src,
    input: { subject: 'Math', grade: 1, language: 'Urdu', topic: 'counting' },
    metadata: { model: 'claude-sonnet-5', costUsd: 0.001, latencyMs: 1200 },
    repoRoot: dir,
  });
  assert.match(r.relPath, /^assets\/generated\/.*\.png$/);
  assert.ok(fs.existsSync(path.join(dir, r.relPath)));
});

test('addToGallery appends a gallery section and entry to README', () => {
  const { dir, src } = tmpRepo();
  addToGallery({
    pngSource: src,
    input: { subject: 'Science', grade: 2, language: 'Sindhi', topic: 'water cycle' },
    metadata: { model: 'claude-opus-4-8' },
    repoRoot: dir,
  });
  const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
  assert.match(readme, /## Generated lesson plans/);
  assert.match(readme, /<img src="assets\/generated\/.*\.png"/);
  assert.match(readme, /Science/);
  assert.match(readme, /water cycle/);
  assert.match(readme, /claude-opus-4-8/);
});

test('two additions with the same inputs do not overwrite each other', () => {
  const { dir, src } = tmpRepo();
  const a = addToGallery({ pngSource: src, input: { subject: 'Math', grade: 1, language: 'Urdu', topic: 'counting' }, repoRoot: dir });
  const b = addToGallery({ pngSource: src, input: { subject: 'Math', grade: 1, language: 'Urdu', topic: 'counting' }, repoRoot: dir });
  assert.notStrictEqual(a.relPath, b.relPath);
  assert.ok(fs.existsSync(path.join(dir, a.relPath)));
  assert.ok(fs.existsSync(path.join(dir, b.relPath)));
});

test('the gallery section is created only once across multiple additions', () => {
  const { dir, src } = tmpRepo();
  addToGallery({ pngSource: src, input: { subject: 'Math', grade: 1, language: 'Urdu', topic: 'a' }, repoRoot: dir });
  addToGallery({ pngSource: src, input: { subject: 'Math', grade: 1, language: 'Urdu', topic: 'b' }, repoRoot: dir });
  const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
  const count = (readme.match(/## Generated lesson plans/g) || []).length;
  assert.strictEqual(count, 1);
});
