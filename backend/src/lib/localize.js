const LOCALES = ['fa', 'ar', 'en'];
const DEFAULT_LOCALE = 'fa';

/**
 * Read a localized string from a record.
 * Supports: translations JSON { fa: { title: '...' }, ar, en } or legacy plain field.
 */
function readTranslationBucket(record, locale) {
  const loc = LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const dataTr = record.data?.translations;
  if (dataTr && typeof dataTr === 'object') {
    return dataTr[loc] || dataTr.fa || dataTr.en || dataTr.ar;
  }
  const tr = record.translations;
  if (tr && typeof tr === 'object') {
    return tr[loc] || tr.fa || tr.en || tr.ar;
  }
  return null;
}

function lt(record, field, locale = DEFAULT_LOCALE) {
  if (!record) return '';
  const loc = LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const bucket = readTranslationBucket(record, loc);
  if (bucket && bucket[field] != null && bucket[field] !== '') return bucket[field];
  const val = record[field];
  return val != null ? String(val) : '';
}

/** Map array of DB rows to localized view objects. */
function localizeRows(rows, fields, locale) {
  return rows.map((row) => {
    const out = { ...row };
    for (const f of fields) out[f] = lt(row, f, locale);
    return out;
  });
}

/** Build translations object from admin form body keys like title_fa, title_ar, title_en */
function buildTranslations(body, fields) {
  const translations = { fa: {}, ar: {}, en: {} };
  for (const field of fields) {
    for (const loc of LOCALES) {
      const key = `${field}_${loc}`;
      if (body[key] != null && body[key] !== '') translations[loc][field] = body[key];
    }
  }
  return translations;
}

/** Primary (fa) fields for backward-compatible columns */
function primaryFromTranslations(translations, fields) {
  const out = {};
  for (const f of fields) {
    out[f] = translations.fa?.[f] || translations.en?.[f] || translations.ar?.[f] || '';
  }
  return out;
}

module.exports = {
  LOCALES,
  DEFAULT_LOCALE,
  lt,
  localizeRows,
  buildTranslations,
  primaryFromTranslations,
};
