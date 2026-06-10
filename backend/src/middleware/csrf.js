const csrf = require('csurf');

const csrfProtection = csrf({ cookie: false });

const CSRF_SKIP = [/^\/api\/health/];

/** Multipart routes validate CSRF after multer parses the body. */
function isDeferredMultipartCsrf(path) {
  if (path === '/teacher/signals') return true;
  if (/^\/teacher\/signals\/[^/]+$/.test(path) && !path.endsWith('/close')) return true;
  if (path.startsWith('/admin/')) return true;
  return false;
}

function isMultipartRequest(req) {
  return (req.headers['content-type'] || '').includes('multipart/form-data');
}

function applyCsrf(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (CSRF_SKIP.some((re) => re.test(req.path))) return next();
    if (isDeferredMultipartCsrf(req.path) && isMultipartRequest(req)) return next();
  }
  return csrfProtection(req, res, next);
}

function exposeCsrfToken(req, res, next) {
  try {
    if (typeof req.csrfToken === 'function') {
      res.locals.csrfToken = req.csrfToken();
    }
  } catch {
    res.locals.csrfToken = '';
  }
  const origRender = res.render.bind(res);
  res.render = (view, options, callback) => {
    let opts = options;
    let cb = callback;
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    opts = { ...opts, csrfToken: res.locals.csrfToken };
    return origRender(view, opts, cb);
  };
  next();
}

function csrfErrorHandler(err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(403).json({ error: 'توکن امنیتی نامعتبر — صفحه را رفرش کنید' });
  }
  return res
    .status(403)
    .send(
      '<!DOCTYPE html><html lang="fa" dir="rtl"><body style="font-family:tahoma;padding:2rem">' +
        '<h1>خطای امنیتی (403)</h1><p>نشست منقضی شده یا فرم نامعتبر است. صفحه را رفرش کنید.</p>' +
        '<p><a href="javascript:history.back()">بازگشت</a></p></body></html>'
    );
}

module.exports = { applyCsrf, exposeCsrfToken, csrfErrorHandler, csrfProtection };
