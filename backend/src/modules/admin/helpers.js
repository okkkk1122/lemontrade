const prisma = require('../../lib/prisma');
const slugify = require('slugify');

async function logAdmin(adminId, action, details, ip) {
  try {
    await prisma.adminLog.create({
      data: { adminId, action, details: details?.slice?.(0, 500) || String(details || ''), ip },
    });
  } catch (e) {
    console.error('adminLog', e);
  }
}

function toSlug(text) {
  return (
    slugify(text || 'item', { lower: true, strict: true, locale: 'fa' }) ||
    'item-' + Date.now()
  );
}

function parseBool(v) {
  return v === 'true' || v === 'on' || v === '1' || v === true;
}

function parseIntSafe(v, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatSafe(v, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function flashRedirect(res, url, extra = '') {
  const sep = url.includes('?') ? '&' : '?';
  res.redirect(url + sep + 'saved=1' + (extra ? '&' + extra : ''));
}

function parseJsonField(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, ...rest] = line.split('|');
        return { title: title.trim(), description: rest.join('|').trim() };
      });
  }
}

module.exports = {
  logAdmin,
  toSlug,
  parseBool,
  parseIntSafe,
  parseFloatSafe,
  flashRedirect,
  parseJsonField,
};
