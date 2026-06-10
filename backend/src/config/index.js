require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const appUrl = process.env.APP_URL || 'http://localhost:3010';

function resolveCookieSecure() {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return appUrl.startsWith('https://');
}

module.exports = {
  port: parseInt(process.env.PORT || '3010', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl,
  cookieSecure: resolveCookieSecure(),
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  databaseUrl: process.env.DATABASE_URL,
  zarinpal: {
    merchant: process.env.ZARINPAL_MERCHANT || '',
    sandbox: process.env.ZARINPAL_SANDBOX !== 'false',
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'noreply@lemontrade.com',
  },
  security: {
    maxLoginAttempts: 5,
    lockMinutes: 15,
    maxDevices: 2,
    require2FAForSignals: true,
    sessionMinutes: 60,
    captchaEnabled: true,
  },
  subscription: {
    weeklyPrice: 1_000_000,
    monthlyPrice: 3_500_000,
  },
  paths: {
    root: require('path').join(__dirname, '../../..'),
    frontend: require('path').join(__dirname, '../../../frontend'),
    uploads: require('path').join(__dirname, '../../../frontend/public/uploads'),
  },
};
