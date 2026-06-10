const prisma = require('../lib/prisma');

async function loadUser(req, res, next) {
  res.locals.user = null;
  res.locals.isLoggedIn = false;
  if (!req.session?.userId) return next();
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: {
        teacherProfile: true,
        wallet: true,
        subscriptions: {
          where: { status: 'ACTIVE', endDate: { gt: new Date() } },
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
    });
    if (user && !user.isBlocked) {
      res.locals.user = user;
      res.locals.isLoggedIn = true;
      res.locals.activeSubscription = user.subscriptions[0] || null;
      req.user = user;
    } else if (user?.isBlocked) {
      req.session.destroy(() => {});
    }
  } catch (e) {
    console.error('loadUser', e);
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.session?.userId || !req.user) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ error: 'لطفاً وارد شوید' });
    }
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

function requireEmailVerified(req, res, next) {
  if (!req.user?.emailVerified) {
    return res.redirect('/verify-email-pending');
  }
  next();
}

function require2FA(req, res, next) {
  if (res.locals.settings?.require2FA === false) return next();
  if (!req.user?.twoFactorEnabled) {
    return res.redirect('/setup-2fa');
  }
  next();
}

function requireSubscription(req, res, next) {
  const sub = res.locals.activeSubscription;
  if (!sub) {
    return res.redirect('/cart?need=subscription');
  }
  next();
}

const roleMap = {
  ADMIN: ['ADMIN'],
  FINANCE: ['ADMIN', 'FINANCE_ADMIN'],
  CONTENT: ['ADMIN', 'CONTENT_ADMIN'],
  SUPPORT: ['ADMIN', 'SUPPORT_ADMIN'],
  TEACHER: ['TEACHER', 'ADMIN'],
};

function requireRole(...roles) {
  const allowed = new Set();
  roles.forEach((r) => (roleMap[r] || [r]).forEach((x) => allowed.add(x)));
  return (req, res, next) => {
    if (!req.user || !allowed.has(req.user.role)) {
      return res.status(403).render('pages/error', {
        title: 'دسترسی غیرمجاز',
        message: 'شما اجازه دسترسی به این بخش را ندارید.',
        code: 403,
      });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  const roles = ['ADMIN', 'FINANCE_ADMIN', 'CONTENT_ADMIN', 'SUPPORT_ADMIN'];
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).render('pages/error', {
      title: 'دسترسی غیرمجاز',
      message: 'شما اجازه دسترسی به پنل مدیریت را ندارید.',
      code: 403,
    });
  }
  next();
}

module.exports = {
  loadUser,
  requireAuth,
  requireEmailVerified,
  require2FA,
  requireSubscription,
  requireRole,
  requireAdmin,
};
