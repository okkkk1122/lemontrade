const express = require('express');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const authService = require('./service');
const prisma = require('../../lib/prisma');
const { generateToken } = require('../../lib/helpers');
const { requireAuth } = require('../../middleware/auth');
const { getSettings } = require('../../middleware/settings');

const router = express.Router();

router.get('/signup', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('pages/signup', { title: 'ثبت‌نام', referralRef: req.query.ref || '', form: {} });
});

router.post('/signup', async (req, res) => {
  try {
    const settings = await getSettings();
    if (settings.captchaEnabled) {
      const expected = req.session.captchaAnswer;
      if (String(req.body.captcha) !== String(expected)) {
        return res.status(400).render('pages/signup', {
          title: 'ثبت‌نام',
          error: 'کپچا اشتباه است',
          form: req.body,
          referralRef: req.body.referralCode || req.query.ref || '',
        });
      }
    }
    if (!req.body.terms) {
      return res.status(400).render('pages/signup', {
        title: 'ثبت‌نام',
        error: 'پذیرش قوانین الزامی است',
        form: req.body,
        referralRef: req.body.referralCode || req.query.ref || '',
      });
    }
    if (req.body.password !== req.body.passwordConfirm) {
      return res.status(400).render('pages/signup', {
        title: 'ثبت‌نام',
        error: 'رمز عبور و تکرار آن یکسان نیست',
        form: req.body,
        referralRef: req.body.referralCode || req.query.ref || '',
      });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(req.body.password)) {
      return res.status(400).render('pages/signup', {
        title: 'ثبت‌نام',
        error: 'رمز باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد',
        form: req.body,
        referralRef: req.body.referralCode || req.query.ref || '',
      });
    }
    await authService.register({
      fullName: req.body.fullName,
      email: req.body.email,
      mobile: req.body.mobile,
      password: req.body.password,
      referralCode: req.body.referralCode || req.body.ref,
      ip: req.ip,
    });
    res.redirect('/verify-email-pending');
  } catch (e) {
    res.status(400).render('pages/signup', {
      title: 'ثبت‌نام',
      error: e.message,
      form: req.body,
      referralRef: req.body.referralCode || req.query.ref || '',
    });
  }
});

router.get('/verify-email-pending', (req, res) => {
  res.render('pages/verify-email-pending', { title: 'تأیید ایمیل' });
});

router.get('/verify-email', async (req, res) => {
  const result = await authService.verifyEmail(req.query.token);
  res.render('pages/verify-email', {
    title: 'تأیید ایمیل',
    success: result.ok,
    expired: result.expired,
  });
});

router.post('/verify-email/resend', requireAuth, async (req, res) => {
  const token = generateToken();
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      emailVerifyToken: token,
      emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const { sendMail } = require('../../lib/mail');
  const config = require('../../config');
  await sendMail({
    to: req.user.email,
    subject: 'ارسال مجدد تأیید — لیموترید',
    html: `<a href="${config.appUrl}/verify-email?token=${token}">تأیید ایمیل</a>`,
  });
  res.redirect('/verify-email-pending?resent=1');
});

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('pages/login', { title: 'ورود', next: req.query.next || '/dashboard' });
});

router.post('/login', async (req, res) => {
  try {
    const user = await authService.login({
      identifier: req.body.identifier,
      password: req.body.password,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    req.session.userId = user.id;
    if (user.twoFactorEnabled) {
      req.session.pending2FA = true;
      return res.redirect('/login-2fa');
    }
    const next = req.body.next || '/dashboard';
    res.redirect(next);
  } catch (e) {
    res.status(400).render('pages/login', {
      title: 'ورود',
      error: e.message,
      next: req.body.next,
    });
  }
});

router.get('/login-2fa', (req, res) => {
  if (!req.session.pending2FA) return res.redirect('/login');
  res.render('pages/login-2fa', { title: 'کد دو مرحله‌ای', error: null });
});

router.post('/login-2fa', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user?.twoFactorSecret) return res.redirect('/login');
  const valid = authenticator.verify({ token: req.body.code, secret: user.twoFactorSecret });
  if (!valid) {
    return res.status(400).render('pages/login-2fa', { title: 'کد دو مرحله‌ای', error: 'کد نامعتبر' });
  }
  delete req.session.pending2FA;
  res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

router.get('/forgot-password', (req, res) => {
  res.render('pages/forgot-password', { title: 'فراموشی رمز', sent: false });
});

router.post('/forgot-password', async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  res.render('pages/forgot-password', { title: 'فراموشی رمز', sent: true });
});

router.get('/reset-password', (req, res) => {
  res.render('pages/reset-password', { title: 'بازنشانی رمز', token: req.query.token, error: null });
});

router.post('/reset-password', async (req, res) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.redirect('/login?reset=1');
  } catch (e) {
    res.status(400).render('pages/reset-password', {
      title: 'بازنشانی رمز',
      token: req.body.token,
      error: e.message,
    });
  }
});

router.get('/setup-2fa', requireAuth, async (req, res) => {
  if (req.user.twoFactorEnabled) return res.redirect('/profile');
  let secret = req.session.temp2FASecret;
  if (!secret) {
    secret = authenticator.generateSecret();
    req.session.temp2FASecret = secret;
  }
  const otpauth = authenticator.keyuri(req.user.email, 'lemontrade', secret);
  const qr = await QRCode.toDataURL(otpauth);
  res.render('pages/setup-2fa', { title: 'فعال‌سازی ۲FA', qr, secret, error: null });
});

router.post('/setup-2fa', requireAuth, async (req, res) => {
  const secret = req.session.temp2FASecret;
  if (!secret || !authenticator.verify({ token: req.body.code, secret })) {
    const otpauth = authenticator.keyuri(req.user.email, 'lemontrade', secret || '');
    const qr = secret ? await QRCode.toDataURL(otpauth) : null;
    return res.status(400).render('pages/setup-2fa', {
      title: 'فعال‌سازی ۲FA',
      error: 'کد نامعتبر',
      qr,
      secret: secret || '',
    });
  }
  const codes = Array.from({ length: 8 }, () => generateToken(4).slice(0, 8).toUpperCase());
  await prisma.user.update({
    where: { id: req.user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: true, backupCodes: codes },
  });
  delete req.session.temp2FASecret;
  res.render('pages/setup-2fa-done', { title: '۲FA فعال شد', backupCodes: codes });
});

module.exports = router;
