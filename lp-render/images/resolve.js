'use strict';
const { hasIcon } = require('../template/icons');
const { searchImage } = require('./openverse');
const { cacheKey } = require('./cache');

async function tryPhoto(query, opts) {
  const { cache, source = 'wikimedia', license = 'cc0,pdm,by,by-sa', searchImpl = searchImage } = opts;
  const key = cacheKey(source, license, query);
  if (cache) { try { const hit = await cache.get(key); if (hit) return hit; } catch (_) { /* ignore */ } }
  let rec = null;
  try { rec = await searchImpl(query, opts); } catch (_) { rec = null; }
  if (rec && cache) { try { await cache.set(key, rec); } catch (_) { /* ignore */ } }
  return rec;
}

async function resolveCard(card, opts) {
  const kind = card.kind || 'auto';
  const iconName = card.icon || card.query;
  const canIcon = hasIcon(iconName);
  const tried = [];

  if (kind === 'icon') {
    tried.push('icon');
    return canIcon
      ? { r: { mode: 'icon', iconName }, tried, used: 'icon', reason: 'library icon' }
      : { r: { mode: 'none' }, tried, used: 'none', reason: 'no library icon (kind=icon)' };
  }
  if (kind === 'auto' && canIcon) {
    tried.push('icon');
    return { r: { mode: 'icon', iconName }, tried, used: 'icon', reason: 'auto → library icon' };
  }

  tried.push('photo');
  const photo = await tryPhoto(card.query, opts);
  if (photo) {
    return {
      r: { mode: 'photo', dataUri: photo.dataUri, attribution: {
        title: photo.title, creator: photo.creator, license: photo.license, source: photo.source, sourceUrl: photo.sourceUrl } },
      tried, used: 'photo', reason: 'openverse',
    };
  }
  if (canIcon) { tried.push('icon'); return { r: { mode: 'icon', iconName }, tried, used: 'icon', reason: 'photo failed → icon' }; }
  return { r: { mode: 'none' }, tried, used: 'none', reason: 'photo failed, no icon' };
}

async function resolveImages(lesson, opts = {}) {
  const out = JSON.parse(JSON.stringify(lesson));
  const report = [];
  for (const section of (out.sections || [])) {
    if (!section || section.type !== 'picture_cards' || !Array.isArray(section.cards)) continue;
    for (const card of section.cards) {
      if (!card || typeof card !== 'object') continue;
      const { r, tried, used, reason } = await resolveCard(card, opts);
      card._resolved = r;
      const entry = { query: card.query, kind: card.kind || 'auto', tried, used, reason };
      report.push(entry);
      if (typeof opts.logger === 'function') { try { opts.logger(entry); } catch (_) { /* ignore */ } }
    }
  }
  return { lesson: out, report };
}

module.exports = { resolveImages, resolveCard };
