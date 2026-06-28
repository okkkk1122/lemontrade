const prisma = require('../lib/prisma');

const defaults = {
  siteName: 'لیموترید',
  siteNameEn: 'lemontrade',
  metaDescription: 'لیموترید (lemontrade) — پلتفرم حرفه‌ای آموزش ترید، سیگنال زنده و سرمایه‌گذاری',
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  accentYellow: '#FFD700',
  defaultDark: true,
  weeklySubscriptionPrice: 1000000,
  footerCopyright: '© ۱۴۰۴ لیموترید — تمامی حقوق محفوظ است.',
  require2FA: true,
  signalPollSeconds: 30,
  captchaEnabled: true,
};

let cache = null;
let cacheTime = 0;

async function getSettings() {
  if (cache && Date.now() - cacheTime < 60000) return cache;
  try {
    const row = await prisma.siteSetting.findUnique({ where: { id: 'main' } });
    cache = { ...defaults, ...(row?.data || {}) };
  } catch {
    cache = { ...defaults };
  }
  cacheTime = Date.now();
  return cache;
}

function clearSettingsCache() {
  cache = null;
}

function siteNameForLocale(settings, locale) {
  if (locale === 'en') return settings.siteNameEn || 'Lemontrade';
  if (locale === 'ar') return settings.siteNameAr || settings.siteName || defaults.siteName;
  return settings.siteName || defaults.siteName;
}

async function loadSettings(req, res, next) {
  res.locals.settings = await getSettings();
  const locale = req.locale || res.locals.locale || 'fa';
  res.locals.siteName = siteNameForLocale(res.locals.settings, locale);
  res.locals.siteNameEn = res.locals.settings.siteNameEn || defaults.siteNameEn;
  next();
}

module.exports = { getSettings, clearSettingsCache, loadSettings, defaults };
