'use strict';
// Tanzania art direction — its design pack exists, so its art direction should too.
module.exports = {
  // What a reviewer must be able to confirm in the GENERATED PIXELS. The prompt asks
  // for this; the culture gate verifies it and re-rolls when the model ignores it.
  check: {
    label: 'Tanzania',
    require: [
      'people look Tanzanian: dark brown skin, African features',
      'the children are in ordinary school clothes',
      'adults in smart everyday Tanzanian clothing, or a kitenge-print dress',
    ],
    forbid: [
      'European, Arab or East Asian facial features on the adults',
      'landmarks, flags or signage from another country',
      'clothing or architecture from outside East Africa',
    ],
  },
  // Bump when the art direction changes: the asset-store key includes it, so cached
  // artwork drawn under the old direction is not silently reused.
  version: 2,
  id: 'tz',
  dress: 'Tanzanian school clothing — children with dark brown skin in white shirts with navy or green shorts, skirts or pinafores',
  teacher: 'any adult wears smart everyday Tanzanian clothing — a plain shirt or blouse, or a kitenge-print dress',
  setting: 'a Tanzanian classroom or village setting (simple block buildings, banana or mango trees, a small school)',
  names: 'Tanzanian names (Amina, Juma, Neema, Bakari)',
  palette: 'warm, bright, friendly colours',
  avoid: 'no non-African landmarks, no clothing or architecture from outside East Africa',
  note: 'culturally grounded in Tanzania and respectful; classroom-appropriate for young children',
};
