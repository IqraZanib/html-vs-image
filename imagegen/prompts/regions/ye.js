'use strict';
// Yemen art direction. The region pack governs not just colours and layout but what
// the people, clothing, buildings and objects in an illustration look like — a
// reviewer flagged a teacher in generic Western dress, which no palette rule fixes.
module.exports = {
  // What a reviewer must be able to confirm in the GENERATED PIXELS. The prompt asks
  // for this; the culture gate verifies it and re-rolls when the model ignores it.
  check: {
    label: 'Yemen',
    // Judge the ADULTS strictly — that is where the drift happens and what a reviewer
    // notices. Children in ordinary school clothes are fine: requiring covered hair on
    // primary-age girls made the gate reject images whose teacher was perfectly correct.
    require: [
      'every adult woman shown wears a loose, full-length abaya or jilbab AND a headscarf covering her hair and neck',
      'every adult man shown wears an ankle-length thobe or a plain shirt — not a suit, blazer or tie',
      'the adults look Arab (Yemeni): dark hair and eyes, warm olive-to-brown skin',
      'the children are in ordinary, modest school clothes (nothing sleeveless, tight or immodest)',
    ],
    forbid: [
      'an adult woman with uncovered hair, or in a short skirt, tight clothing, sleeveless top or Western dress',
      'an adult in Western professional styling — suit, blazer, tie, or business attire',
      'East Asian, European or Sub-Saharan African facial features on the ADULTS',
      'crosses, church spires, cathedrals, or any non-Islamic religious symbol',
      'landmarks, flags or signage from another country',
    ],
  },
  // Bump when the art direction changes: the asset-store key includes it, so cached
  // artwork drawn under the old direction is not silently reused.
  version: 2,
  id: 'ye',
  dress: 'Yemeni school clothing — girls in small white headscarves and modest uniforms, boys in simple light shirts',
  teacher: 'any adult woman wears a long loose dark abaya with a plain headscarf fully covering her hair; any adult man wears a plain ankle-length white thobe',
  setting: 'a Yemeni classroom or town setting (traditional tower houses in mud brick and stone, a small school)',
  names: 'Yemeni names (Salma, Yusuf, Huda, Faisal)',
  palette: 'warm, bright, friendly colours',
  avoid: 'no Western dress, no sleeveless or tight clothing, no uncovered adult women, no crosses or church architecture, no non-Yemeni landmarks or flags',
  note: 'culturally grounded in Yemen and respectful; classroom-appropriate for young children',
};
