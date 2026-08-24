'use strict';
// PAGE COUNT FOLLOWS THE CONTENT.
//
// The Yemen pack used to declare MAX_PAGES: 2, and LP Studio then did three things to
// satisfy it: re-condensed the lesson with escalating word budgets ("halve every
// budget…"), stepped figure density down as far as 62%, and grew figures again to fill
// leftover space. The effect was that the page count was the requirement and the
// teacher's words were the variable. The raw lesson is the source of truth, so all of
// that is gone: a lesson that needs three pages gets three pages.
//
// These assertions are deliberately about the SOURCE of lp-studio.js. The fit loop was
// a server-side sequence of model calls and renders — there is no cheap way to unit
// test its absence behaviourally, and the failure mode we care about is someone
// reinstating it. A grep-level guard catches exactly that.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const STUDIO = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'lp-studio.js'), 'utf8');

test('the Yemen pack declares no page cap', () => {
  const pack = require('../decorative/regions/ye/theme');
  assert.ok(!('MAX_PAGES' in pack),
    'the Yemen design set must not declare MAX_PAGES — pagination follows the lesson');
  // the rest of the pack contract is untouched
  assert.strictEqual(pack.REGION_NAME, 'Yemen');
  assert.strictEqual(pack.PAGE_NUMBER_STYLE, 'ar-bottom');
  assert.strictEqual(pack.CHARACTER_CAST, false);
  assert.match(pack.THEME_OVERRIDE_CSS, /Noto Naskh Arabic/);
});

test('the pipeline still supports MAX_PAGES for a pack that wants one', () => {
  // Removing the cap from one pack must not remove the mechanism: another region's
  // design may genuinely be a fixed-length form.
  const src = fs.readFileSync(path.join(__dirname, '..', 'pipeline.js'), 'utf8');
  assert.match(src, /pack\.MAX_PAGES/, 'pipeline must still read a declared MAX_PAGES');
});

test('LP Studio does not re-condense to hit a page count', () => {
  assert.ok(!/TIGHTEN/.test(STUDIO),
    'the escalating tighten prompts are back — those cut the teacher\'s words to buy a page');
  assert.ok(!/Halve every word budget/.test(STUDIO), 'a word-halving instruction is back');
  assert.ok(!/re-condensing tighter/.test(STUDIO), 'the tighten loop is back');
});

test('LP Studio does not shrink or grow figures to fit a page budget', () => {
  assert.ok(!/figureScale: scale/.test(STUDIO), 'the figure-density ladder is back');
  assert.ok(!/DENSITY FIRST/.test(STUDIO), 'the density-first pass is back');
  assert.ok(!/FILL THE PAGE/.test(STUDIO), 'the page-filling upscale is back');
});

test('the guide checkbox selects structure, not a length', () => {
  assert.ok(!/guide2p \? 2 :/.test(STUDIO),
    'the guide checkbox is implying a 2-page limit again');
  assert.match(STUDIO, /const pageLimit = maxPages \|\| null;/,
    'pageLimit must come only from a pack that declares MAX_PAGES');
});

test('the condenser is not told to hit a page count', () => {
  // The system prompt used to say "compact 2-page daily teacher guide" and, worse,
  // "prefer dropping detail over exceeding budgets" — an explicit instruction to throw
  // away the teacher's content to protect a page count.
  const src = fs.readFileSync(path.join(__dirname, '..', 'condense.js'), 'utf8');
  assert.ok(!/2-page/.test(src), 'a 2-page target is back in the condenser');
  assert.ok(!/must fit 2 A4 pages/.test(src), 'the page-fit instruction is back');
  assert.ok(!/prefer dropping detail/.test(src), 'the drop-detail instruction is back');
  assert.match(src, /There is NO page target/, 'the condenser should say length is not a constraint');
});

test('no figure is deleted to save page height', () => {
  // applyFigureBalance used to delete a third card-spanning visual because "a third
  // costs a page". Dedupe and the per-stage caps are design rules and stay.
  const src = fs.readFileSync(path.join(__dirname, '..', 'condense.js'), 'utf8');
  assert.ok(!/wideCount/.test(src), 'the card-spanning figure cap is back');
  assert.ok(!/a third costs a page/.test(src), 'page-cost reasoning is back in figure balance');
  const render = fs.readFileSync(path.join(__dirname, '..', 'decorative', 'render.js'), 'utf8');
  assert.match(render, /SPANNING_STEP_BUDGET = Infinity/,
    'the spanning-step budget is capped again — that cap existed to hold two pages');
});

test('a declared page cap is reported, never enforced', () => {
  // The one thing the cap may still do is tell the operator what the design expected.
  assert.match(STUDIO, /Reported only — no text was cut and no figure was shrunk/,
    'an overrun against a declared MAX_PAGES should be logged, not acted on');
});
