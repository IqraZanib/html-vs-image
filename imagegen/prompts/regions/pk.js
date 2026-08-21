'use strict';
module.exports = {
  // What a reviewer must be able to confirm in the GENERATED PIXELS. The prompt asks
  // for this; the culture gate verifies it and re-rolls when the model ignores it.
  check: {
    label: 'Pakistan',
    require: [
      'adult women wear a shalwar-kameez with a dupatta covering the hair',
      'adult men wear a shalwar-kameez',
      'people look South Asian (Pakistani)',
    ],
    forbid: [
      'an adult woman with uncovered hair or in Western dress',
      'European, African or East Asian facial features on the adults',
      'landmarks, flags or signage from another country',
    ],
  },
  // Bump when the art direction changes: the asset-store key includes it, so cached
  // artwork drawn under the old direction is not silently reused.
  version: 2,
  id: 'pk',
  dress: 'Pakistani school clothing — boys in shalwar-kameez or uniform, girls modestly dressed, some wearing a hijab',
  teacher: 'any adult woman wears a shalwar-kameez with a dupatta covering her hair; any adult man wears a shalwar-kameez',
  avoid: 'no Western dress, no sleeveless or tight clothing, no non-Pakistani landmarks',
  setting: 'a Pakistani town or countryside setting (simple houses, fields, a small school)',
  names: 'Pakistani names (Ali, Sara, Bilal, Zainab)',
  palette: 'warm, bright, friendly colours',
  note: 'culturally grounded and respectful; classroom-appropriate for young children',
};
