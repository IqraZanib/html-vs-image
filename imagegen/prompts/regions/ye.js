'use strict';
// Yemen art direction. The region pack governs not just colours and layout but what
// the people, clothing, buildings and objects in an illustration look like — a
// reviewer flagged a teacher in generic Western dress, which no palette rule fixes.
module.exports = {
  // What a reviewer must be able to confirm in the GENERATED PIXELS. The prompt asks
  // for this; the culture gate verifies it and re-rolls when the model ignores it.
  check: {
    label: 'Yemen',
    require: [
      'every adult woman wears a loose, full-length abaya or jilbab AND a headscarf that fully covers her hair and neck',
      'adult men wear an ankle-length thobe, or a shirt with a futa/wrap — not Western business or casual wear',
      'people look Arab (Yemeni): dark hair and eyes, warm olive-to-brown skin',
      'children are modestly dressed; girls\' hair is covered with a small white scarf',
    ],
    forbid: [
      'an adult woman with uncovered hair, or in a short skirt, tight clothes, sleeveless top or Western dress',
      'a teacher in a suit, blazer, jeans, or other Western professional styling',
      'East Asian, European or Sub-Saharan African facial features on the adults',
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
