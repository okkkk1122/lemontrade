const fs = require('fs');
const path = require('path');
const { LOCALES, DEFAULT_LOCALE } = require('../lib/localize');

const LOCALE_DIR = path.join(__dirname, '../../locales');
const bundles = {};

function loadBundles() {
  for (const loc of LOCALES) {
    const file = path.join(LOCALE_DIR, `${loc}.json`);
    try {
      bundles[loc] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      bundles[loc] = {};
    }
  }
}
loadBundles();

function resolveLocale(req) {
  const fromQuery = req.query?.lang || req.query?.locale;
  if (fromQuery && LOCALES.includes(fromQuery)) return fromQuery;
  const fromCookie = req.cookies?.locale;
  if (fromCookie && LOCALES.includes(fromCookie)) return fromCookie;
  const fromSession = req.session?.locale;
  if (fromSession && LOCALES.includes(fromSession)) return fromSession;
  const accept = req.headers['accept-language'] || '';
  if (/\bar\b/i.test(accept) && !/\bfa\b/i.test(accept)) return 'ar';
  if (/\ben\b/i.test(accept) && !/\bfa\b/i.test(accept)) return 'en';
  return DEFAULT_LOCALE;
}

function getNested(obj, key) {
  return key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
}

function createTranslator(locale) {
  const bundle = bundles[locale] || bundles[DEFAULT_LOCALE] || {};
  const fallback = bundles[DEFAULT_LOCALE] || {};
  return function t(key, vars = {}) {
    let str = getNested(bundle, key);
    if (str == null) str = getNested(fallback, key);
    if (str == null) return key;
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
  };
}

function localeDir(locale) {
  if (locale === 'en') return 'ltr';
  return 'rtl';
}

function localeHtmlLang(locale) {
  if (locale === 'ar') return 'ar';
  if (locale === 'en') return 'en';
  return 'fa';
}

function loadI18n(req, res, next) {
  const locale = resolveLocale(req);
  req.locale = locale;
  res.locals.locale = locale;
  res.locals.lang = localeHtmlLang(locale);
  res.locals.dir = localeDir(locale);
  res.locals.locales = LOCALES;
  res.locals.t = createTranslator(locale);
  res.locals.dateLocale = locale === 'en' ? 'en-US' : locale === 'ar' ? 'ar-SA' : 'fa-IR';
  res.locals.lt = (record, field) => {
    const { lt } = require('../lib/localize');
    return lt(record, field, locale);
  };
  next();
}

module.exports = { loadI18n, resolveLocale, createTranslator, localeDir, localeHtmlLang, LOCALES };
