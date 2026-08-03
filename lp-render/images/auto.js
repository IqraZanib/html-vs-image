'use strict';
// Automatic image detection: scan a lesson's text and pick out concrete,
// real-world concepts that benefit from a REAL photo (animals, fruits, places,
// people, transport, nature, household objects) — so photos can be added
// WITHOUT any manual `picture_cards` hints.
//
// Deliberately conservative: only well-known concrete nouns are matched, and
// abstract words (name, age, like, sound, number, …) are never picked, so an
// irrelevant photo is not requested. Downstream, resolveImages() still applies
// the icon→photo→blank chain and the license/relevance gates.
//
// Pluggable: pass `opts.classify` (sync OR async) — e.g. an LLM classifier in
// rumi — to replace the built-in heuristic entirely.

// Concrete, photo-worthy real-world concepts common in primary-grade lessons.
const PHOTO_CONCEPTS = new Set([
  // animals
  'cow', 'buffalo', 'goat', 'sheep', 'hen', 'chicken', 'duck', 'horse', 'donkey', 'camel',
  'dog', 'cat', 'rabbit', 'pig', 'lion', 'tiger', 'elephant', 'monkey', 'bird', 'fish',
  'frog', 'snake', 'bee', 'butterfly', 'ant', 'spider', 'crow', 'parrot', 'peacock', 'owl',
  // fruits
  'apple', 'banana', 'mango', 'orange', 'grape', 'watermelon', 'papaya', 'pineapple', 'pear',
  'strawberry', 'guava', 'lemon', 'coconut', 'date', 'melon', 'cherry',
  // vegetables
  'carrot', 'potato', 'tomato', 'onion', 'cabbage', 'spinach', 'brinjal', 'eggplant',
  'cucumber', 'pea', 'pumpkin', 'corn', 'chili', 'garlic', 'ginger', 'radish',
  // food
  'bread', 'rice', 'egg', 'milk', 'cake', 'roti', 'sugar', 'salt', 'honey', 'tea',
  // places / buildings
  'school', 'house', 'home', 'mosque', 'market', 'hospital', 'park', 'farm', 'shop',
  'city', 'village', 'garden', 'kitchen', 'library', 'bridge', 'well', 'road',
  // nature
  'sun', 'moon', 'star', 'cloud', 'rain', 'river', 'mountain', 'hill', 'tree', 'plant',
  'flower', 'leaf', 'sea', 'ocean', 'lake', 'grass', 'stone', 'rock', 'sand', 'fire',
  'snow', 'forest', 'field', 'waterfall',
  // people / jobs / relations
  'teacher', 'doctor', 'nurse', 'farmer', 'family', 'mother', 'father', 'baby', 'boy',
  'girl', 'police', 'driver', 'postman', 'tailor', 'cook',
  // transport
  'car', 'bus', 'truck', 'train', 'boat', 'ship', 'bicycle', 'cycle', 'aeroplane',
  'airplane', 'plane', 'rickshaw', 'tractor',
  // household / objects
  'chair', 'table', 'book', 'pencil', 'pen', 'cup', 'plate', 'spoon', 'bottle', 'clock',
  'ball', 'bag', 'door', 'window', 'key', 'brush', 'umbrella', 'basket', 'lamp', 'kite',
  'drum', 'flag',
  // clothing
  'shirt', 'dress', 'cap', 'shoe', 'sock', 'hat',
]);

// Collect content strings from a lesson (skips base64/data URIs and long blobs).
function collectText(node, out) {
  if (typeof node === 'string') {
    if (node.length < 400 && !node.startsWith('data:')) out.push(node);
  } else if (Array.isArray(node)) {
    for (const v of node) collectText(v, out);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      // Skip non-content/metadata keys so e.g. an `icon: "cake"` name is not
      // mistaken for a lesson concept.
      if (k === 'dataUri' || k === '_resolved' || k === 'icon') continue;
      collectText(v, out);
    }
  }
  return out;
}

function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }

// Heuristic classifier: returns [{ query, kind:'photo', label }] in first-seen order.
function autoImageCards(lesson, opts = {}) {
  const max = opts.max || 6;
  const text = collectText(lesson, []).join(' ').toLowerCase();
  const tokens = text.split(/[^a-z]+/).filter(Boolean);
  const seen = new Set();
  const cards = [];
  for (const tok of tokens) {
    const base = tok.length > 3 && tok.endsWith('s') ? tok.slice(0, -1) : tok;
    const concept = PHOTO_CONCEPTS.has(tok) ? tok : (PHOTO_CONCEPTS.has(base) ? base : null);
    if (!concept || seen.has(concept)) continue;
    seen.add(concept);
    cards.push({ query: concept, kind: 'photo', label: cap(concept) });
    if (cards.length >= max) break;
  }
  return cards;
}

// Insert an auto-detected `picture_cards` section into a lesson (non-mutating).
// `opts.classify(lesson, opts)` may be sync or async; defaults to the heuristic.
async function autoImages(lesson, opts = {}) {
  const classify = opts.classify || autoImageCards;
  const cards = await classify(lesson, opts);
  const out = JSON.parse(JSON.stringify(lesson));
  if (Array.isArray(cards) && cards.length) {
    const section = { type: 'picture_cards', title: opts.title || 'See it in real life', cards };
    const anchor = (out.sections || []).findIndex((s) => ['explanation', 'introduction', 'explore'].includes(s && s.type));
    if (!Array.isArray(out.sections)) out.sections = [];
    if (anchor >= 0) out.sections.splice(anchor + 1, 0, section);
    else out.sections.push(section);
  }
  return { lesson: out, cards };
}

module.exports = { autoImages, autoImageCards, PHOTO_CONCEPTS };
