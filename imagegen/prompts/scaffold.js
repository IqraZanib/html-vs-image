'use strict';
// Shared prompt scaffolding — style registers and quality/negative directives.
const SCENE_STYLE = 'a warm, friendly flat-vector children\'s-book illustration, expressive happy faces, clean simple background';
const DIAGRAM_STYLE = 'a clean, labeled educational infographic diagram, flat vector style, plain background';
const QUALITY = 'bright warm colours, high quality, suitable for a primary-school classroom';
const NEGATIVE_SCENE = 'no text in the image, no watermark, not scary, not violent';
const NEGATIVE_DIAGRAM = 'no watermark, no clutter, labels must be spelled correctly and legible';
// Textless register: for hybrid figures whose labels are rendered by code afterwards,
// the image must carry no writing at all (see lp-render/condense.js IMAGES_RICH).
const DIAGRAM_STYLE_TEXTLESS = 'a clean educational illustration, flat vector style, plain background, wordless';
const NEGATIVE_TEXTLESS = 'ABSOLUTELY NO text, no letters, no words, no numbers, no digits, no symbols, no captions, no watermark, no signage; every board, page, card and label area is blank and empty';
function join(parts) { return parts.filter(Boolean).map((s) => String(s).trim()).join('. ') + '.'; }
module.exports = { SCENE_STYLE, DIAGRAM_STYLE, QUALITY, NEGATIVE_SCENE, NEGATIVE_DIAGRAM,
  DIAGRAM_STYLE_TEXTLESS, NEGATIVE_TEXTLESS, join };
