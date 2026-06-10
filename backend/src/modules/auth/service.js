const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { generateToken, generateReferralCode, validateIranMobile } = require('../../lib/helpers');
const { sendMail } = require('../../lib/mail');
const config = require('../../config');

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function register({ fullName, email, mobile, password, referralCode, ip }) {
  if (!validateIranMobile(mobile)) throw new Error('شماره موبایل معتبر نیست (۰۹xxxxxxxxx)');
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { mobile }] },
  });
  if (existing) throw new Error('ایمیل یا موبایل قبلاً ثبت شده است');

  let referredById = null;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() } });
    if (referrer) {
      const sameIpCount = await prisma.user.count({ where: { referredById: referrer.id } });
      if (sameIpCount < 3) referredById = referrer.id;
    }
  }

  const token = generateToken();
  const user = await prisma.user.create({
    data: {
      fullName,
      email: email.toLowerCase(),
      mobile,
      passwordHash: await hashPassword(password),
      referralCode: generateReferralCode(),
      referredById,
      emailVerifyToken: token,
      emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      wallet: { create: {} },
      cart: { create: {} },
    },
  });

  if (referredById) {
    await prisma.referral.create({
      data: { referrerId: referredById, refereeId: user.id },
    });
  }

  const verifyUrl = `${config.appUrl}/verify-email?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'تأیید ایمیل — لیموترید',
    html: `<p>سلام ${fullName}،</p><p>برای تأیید ایمیل <a href="${verifyUrl}">اینجا کلیک کنید</a>.</p>`,
    text: `لینک تأیید: ${verifyUrl}`,
  }).catch((e) => console.warn('[register] verify email failed:', e.message));

  return user;
}

async function verifyEmail(token) {
  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: token, emailVerifyExpiry: { gt: new Date() } },
  });
  if (!user) return { ok: false, expired: true };
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
  });
  return { ok: true };
}

async function login({ identifier, password, ip, userAgent }) {
  const id = identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: id }, { mobile: identifier.trim() }],
    },
  });
  if (!user) throw new Error('کاربر یافت نشد');
  if (user.isBlocked) throw new Error('حساب شما مسدود شده است');
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error('حساب به دلیل تلاش‌های ناموفق موقتاً قفل است');
  }
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    const attempts = user.loginAttempts + 1;
    const data = { loginAttempts: attempts };
    if (attempts >= config.security.maxLoginAttempts) {
      data.lockedUntil = new Date(Date.now() + config.security.lockMinutes * 60000);
      data.loginAttempts = 0;
    }
    await prisma.user.update({ where: { id: user.id }, data });
    throw new Error('رمز عبور اشتباه است');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const deviceCount = await prisma.device.count({ where: { userId: user.id } });
  if (deviceCount >= config.security.maxDevices) {
    const oldest = await prisma.device.findMany({
      where: { userId: user.id },
      orderBy: { lastActiveAt: 'asc' },
      take: deviceCount - config.security.maxDevices + 1,
    });
    for (const d of oldest) await prisma.device.delete({ where: { id: d.id } });
  }

  await prisma.device.create({
    data: { userId: user.id, ip, browser: userAgent?.slice(0, 200), name: 'دستگاه جدید' },
  });

  await prisma.session.deleteMany({ where: { userId: user.id } });

  return user;
}

async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return { ok: true };
  const token = generateToken();
  await prisma.passwordReset.create({
    data: {
      email: user.email,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const url = `${config.appUrl}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'بازنشانی رمز — لیموترید',
    html: `<p><a href="${url}">بازنشانی رمز عبور</a></p>`,
  });
  return { ok: true };
}

async function resetPassword(token, newPassword) {
  const row = await prisma.passwordReset.findFirst({
    where: { token, used: false, expiresAt: { gt: new Date() } },
  });
  if (!row) throw new Error('لینک نامعتبر یا منقضی شده');
  await prisma.user.update({
    where: { email: row.email },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  await prisma.passwordReset.update({ where: { id: row.id }, data: { used: true } });
}

module.exports = {
  hashPassword,
  comparePassword,
  register,
  verifyEmail,
  login,
  requestPasswordReset,
  resetPassword,
};
