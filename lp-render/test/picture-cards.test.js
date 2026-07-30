'use strict';
const test = require('node:test');
const assert = require('node:assert');
const pictureCards = require('../template/sections/picture-cards');
const { resolveLabels } = require('../template/labels');

const ctx = { locale: 'en', dir: 'ltr', labels: resolveLabels('en') };

test('renders a photo card with its image and label', () => {
  const html = pictureCards({ type: 'picture_cards', cards: [
    { query: 'duck', label: 'Duck', note: 'a bird', _resolved: { mode: 'photo', dataUri: 'data:image/jpeg;base64,AAAA', attribution: {} } },
  ] }, ctx);
  assert.match(html, /<img[^>]+src="data:image\/jpeg;base64,AAAA"/);
  assert.match(html, /Duck/);
});

test('renders an icon card as inline SVG', () => {
  const html = pictureCards({ type: 'picture_cards', cards: [
    { query: 'apple', label: 'Apple', _resolved: { mode: 'icon', iconName: 'apple' } },
  ] }, ctx);
  assert.match(html, /<svg/);
  assert.match(html, /Apple/);
});

test('omits none and unresolved cards', () => {
  const html = pictureCards({ type: 'picture_cards', cards: [
    { query: 'x', label: 'Gone', _resolved: { mode: 'none' } },
    { query: 'y', label: 'AlsoGone' },
  ] }, ctx);
  assert.doesNotMatch(html, /Gone/);
});
