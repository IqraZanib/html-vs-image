'use strict';
const REGIONS = { pk: require('./pk'), ke: require('./ke'), ye: require('./ye'), default: require('./default') };
function resolveRegion(id) { return REGIONS[id] || REGIONS.default; }
module.exports = { resolveRegion, REGIONS };
