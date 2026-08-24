'use strict';
const REGIONS = { pk: require('./pk'), ke: require('./ke'), ye: require('./ye'), tz: require('./tz'), default: require('./default') };
function resolveRegion(id) { return REGIONS[id] || REGIONS.default; }
module.exports = { resolveRegion, REGIONS };
