const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { loadUser } = require('./middleware/auth');
const { loadSettings } = require('./middleware/settings');
const { loadSiteData } = require('./middleware/siteData');
const { loadI18n } = require('./middleware/i18n');
const { applyCsrf, exposeCsrfToken, csrfErrorHandler } = require('./middleware/csrf');
const { resolveSocialIconSrc } = require('./lib/socialIcons');

const app = express();
app.locals.resolveSocialIconSrc = resolveSocialIconSrc;

app.set('view engine', 'ejs');
app.set('views', path.join(config.paths.frontend, 'views'));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'", 'https:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    strictTransportSecurity: config.cookieSecure,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.DISABLE_RATE_LIMIT !== 'true') {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
}

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: config.security.sessionMinutes * 60 * 1000,
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
    },
  })
);

app.use(express.static(path.join(config.paths.frontend, 'public')));
app.use(loadI18n);
app.use(loadSettings);
app.use(loadSiteData);
app.use(loadUser);
app.use(applyCsrf);
app.use(exposeCsrfToken);

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.year = new Date().getFullYear();
  next();
});

app.use('/api', require('./modules/api/routes'));
app.use(require('./modules/home/routes'));
app.use(require('./modules/auth/routes'));
app.use(require('./modules/content/routes'));
app.use(require('./modules/learning/routes'));
app.use(require('./modules/packages/routes'));
app.use(require('./modules/cart/routes'));
app.use(require('./modules/payment/routes'));
app.use(require('./modules/wallet/routes'));
app.use(require('./modules/dashboard/routes'));
app.use(require('./modules/signals/routes'));
app.use(require('./modules/support/routes'));
app.use(require('./modules/referrals/routes'));
app.use(require('./modules/investment/routes'));
app.use(require('./modules/profile/routes'));
app.use('/admin', require('./modules/admin/routes/index'));

app.use(csrfErrorHandler);

app.use((err, req, res, next) => {
  if (req.path.startsWith('/admin') && err) {
    console.error('Admin error:', err);
    return res.status(400).send(`<pre dir="rtl" style="font-family:tahoma;padding:2rem">خطا: ${err.message}\n<a href="javascript:history.back()">بازگشت</a></pre>`);
  }
  next(err);
});

app.use((req, res) => {
  res.status(404).render('pages/error', {
    title: 'صفحه یافت نشد',
    message: 'صفحه‌ای که دنبال آن هستید وجود ندارد.',
    code: 404,
  });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('pages/error', {
    title: 'خطای سرور',
    message: config.nodeEnv === 'development' ? err.message : 'خطایی رخ داد. لطفاً بعداً تلاش کنید.',
    code: 500,
  });
});

module.exports = app;
