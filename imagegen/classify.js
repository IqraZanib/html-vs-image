'use strict';

const STRUCTURED = new Set([
  'BOARD_WORK', 'WORKED_EXAMPLE', 'EXIT_TICKET', 'JOURNEY', 'CFU', 'KEY_FACT',
  'TEACHER_SAYS', 'WARM_UP', 'REMEMBER', 'HOMEWORK', 'TABLE', 'PARTNER_ACTIVITY',
]);
const ICON = new Set(['ICON', 'MOTIF']);

// Classify one lesson block into a visual category. Only HOOK_STORY (and a
// realistic Science DIAGRAM) warrant a generated image; structured content and
// icons are rendered by the deterministic HTML/SVG path.
function classifyBlock(block, segment = {}) {
  const type = block && block.type;
  if (type === 'HOOK_STORY') {
    return { category: 'decorative_scene', needsImage: true, reason: 'hook story scene' };
  }
  if (type === 'DIAGRAM') {
    return { category: 'labeled_diagram', needsImage: true, reason: 'realistic labeled diagram' };
  }
  if (STRUCTURED.has(type)) {
    return { category: 'structured', needsImage: false, reason: 'rendered as HTML' };
  }
  if (ICON.has(type)) {
    return { category: 'icon_or_motif', needsImage: false, reason: 'rendered as SVG/emoji' };
  }
  return { category: 'unknown', needsImage: false, reason: `unrecognised block type "${type}" — flag for review` };
}

module.exports = { classifyBlock };
