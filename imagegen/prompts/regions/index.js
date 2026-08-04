'use strict';
const REGIONS = { pk: require('./pk'), default: require('./default') };
function resolveRegion(id) { return REGIONS[id] || REGIONS.default; }
module.exports = { resolveRegion, REGIONS };
