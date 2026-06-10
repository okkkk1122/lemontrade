const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../../lib/prisma');
const { requireAuth, require2FA, requireSubscription, requireRole } = require('../../middleware/auth');
const { csrfProtection } = require('../../middleware/csrf');
const { timeAgo, riskReward } = require('../../lib/helpers');
const config = require('../../config');

const router = express.Router();
const uploadDir = config.paths.uploads;
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('فرمت تصویر مجاز نیست'), ok);
  },
});

function mapSignal(s) {
  const isNew = Date.now() - new Date(s.createdAt).getTime() < 5 * 60 * 1000;
  return {
    ...s,
    isNew,
    timeAgo: timeAgo(s.createdAt),
    teacherName: s.teacher?.user?.fullName || 'استاد',
    rr: riskReward(s.entryPrice, s.stopLoss, s.takeProfit1),
  };
}

async function notifySubscribers(signal) {
  const subs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', endDate: { gt: new Date() } },
    select: { userId: true },
    distinct: ['userId'],
  });
  if (!subs.length) return;
  const notif = await prisma.notification.create({
    data: {
      title: `سیگنال جدید ${signal.pairSymbol}`,
      body: `${signal.tradeType} — ورود ${signal.entryPrice}`,
      link: `/signals/${signal.id}`,
      audience: 'subscribers',
    },
  });
  await prisma.userNotification.createMany({
    data: subs.map((s) => ({ userId: s.userId, notificationId: notif.id })),
    skipDuplicates: true,
  });
}

function parseSignalBody(body) {
  const entryPrice = parseFloat(body.entryPrice);
  const stopLoss = parseFloat(body.stopLoss);
  const takeProfit1 = body.takeProfit1 ? parseFloat(body.takeProfit1) : null;
  const takeProfit2 = body.takeProfit2 ? parseFloat(body.takeProfit2) : null;
  if (!body.pairSymbol || !body.timeframe || !body.tradeType) {
    throw new Error('جفت‌ارز، تایم‌فریم و نوع معامله الزامی است');
  }
  if (Number.isNaN(entryPrice) || Number.isNaN(stopLoss)) {
    throw new Error('قیمت ورود و حد ضرر باید عدد معتبر باشند');
  }
  return {
    pairSymbol: body.pairSymbol.trim(),
    timeframe: body.timeframe,
    tradeType: body.tradeType,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    analysis: body.analysis?.trim() || null,
  };
}

function saveChartFile(file) {
  if (!file) return '/logo.png';
  const ext = path.extname(file.originalname) || '.jpg';
  const dest = path.join(uploadDir, `signal-${Date.now()}${ext}`);
  fs.renameSync(file.path, dest);
  return `/uploads/${path.basename(dest)}`;
}

/** Signal author and admins may preview live signals without subscription or 2FA. */
function canBypassLiveSignalGate(req, signal) {
  if (!req.user) return false;
  if (req.user.role === 'ADMIN') return true;
  return signal.teacherUserId === req.user.id;
}

router.get('/signals/live', requireAuth, require2FA, requireSubscription, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const perPage = 20;
  const where = { status: 'ACTIVE' };
  if (req.query.pair) where.pairSymbol = { contains: req.query.pair, mode: 'insensitive' };
  if (req.query.timeframe) where.timeframe = req.query.timeframe;
  if (req.query.teacher) where.teacherId = req.query.teacher;

  const [signals, total, teachers, pairs] = await Promise.all([
    prisma.signal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { teacher: { include: { user: true } } },
    }),
    prisma.signal.count({ where }),
    prisma.teacher.findMany({ where: { isApproved: true }, include: { user: true } }),
    prisma.currencyPair.findMany({ where: { isActive: true }, orderBy: { symbol: 'asc' } }),
  ]);

  if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
    return res.json({ signals: signals.map(mapSignal), total, page });
  }

  res.render('pages/signals-live', {
    title: 'سیگنال‌های زنده',
    signals: signals.map(mapSignal),
    total,
    page,
    totalPages: Math.ceil(total / perPage),
    teachers,
    pairs,
    query: req.query,
    pollSeconds: res.locals.settings?.signalPollSeconds || 30,
  });
});

router.get('/signals/past', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const where = { status: { not: 'ACTIVE' } };
  if (req.query.result === 'profit') where.status = 'HIT_TP';
  if (req.query.result === 'loss') where.status = 'HIT_SL';

  const [signals, total] = await Promise.all([
    prisma.signal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      include: { teacher: { include: { user: true } } },
    }),
    prisma.signal.count({ where }),
  ]);

  res.render('pages/signals-past', {
    title: 'تاریخچه سیگنال‌ها',
    signals: signals.map(mapSignal),
    page,
    totalPages: Math.ceil(total / 20),
  });
});

router.get('/signals/:id', async (req, res) => {
  const signal = await prisma.signal.findUnique({
    where: { id: req.params.id },
    include: {
      teacher: { include: { user: true, _count: { select: { signals: true } } } },
      comments: { where: { approved: true }, take: 20 },
    },
  });
  if (!signal) {
    return res.status(404).render('pages/error', { title: 'یافت نشد', message: 'سیگنال یافت نشد', code: 404 });
  }

  const isLive = signal.status === 'ACTIVE';
  const isPublicSample = signal.isSample;

  if (!isPublicSample) {
    if (!req.user) {
      return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
    }
    const bypassGate = canBypassLiveSignalGate(req, signal);
    const need2FA = res.locals.settings?.require2FA !== false;
    if (isLive && need2FA && !req.user.twoFactorEnabled && !bypassGate) {
      return res.redirect('/setup-2fa');
    }
    if (isLive && !res.locals.activeSubscription && !bypassGate) {
      return res.redirect('/cart?need=subscription');
    }
    await prisma.signal.update({ where: { id: signal.id }, data: { viewCount: { increment: 1 } } });
    await prisma.signalView.upsert({
      where: { signalId_userId: { signalId: signal.id, userId: req.user.id } },
      create: { signalId: signal.id, userId: req.user.id },
      update: { viewedAt: new Date() },
    });
  }

  res.render('pages/signal-detail', {
    title: `سیگنال ${signal.pairSymbol}`,
    signal,
    rr: riskReward(signal.entryPrice, signal.stopLoss, signal.takeProfit1),
    teacherName: signal.teacher?.user?.fullName,
    isPublicSample,
  });
});

router.post('/signals/:id/report', requireAuth, async (req, res) => {
  await prisma.signalReport.create({
    data: {
      signalId: req.params.id,
      userId: req.user.id,
      reason: req.body.reason,
      details: req.body.details,
    },
  });
  res.json({ ok: true });
});

router.get('/teacher', requireAuth, requireRole('TEACHER'), async (req, res) => {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.user.id },
    include: { _count: { select: { signals: true } } },
  });
  if (!teacher?.isApproved) {
    return res.render('pages/teacher-pending', { title: 'پنل استاد' });
  }
  const monthStart = new Date();
  monthStart.setDate(1);
  const [monthCount, signals, reports, currencyPairs] = await Promise.all([
    prisma.signal.count({ where: { teacherId: teacher.id, createdAt: { gte: monthStart } } }),
    prisma.signal.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.signalReport.count({ where: { signal: { teacherId: teacher.id } } }),
    prisma.currencyPair.findMany({ where: { isActive: true }, orderBy: { symbol: 'asc' } }),
  ]);
  res.render('pages/teacher-panel', {
    title: 'پنل استاد',
    teacher,
    monthCount,
    signals: signals.map(mapSignal),
    reports,
    currencyPairs,
    timeframes: TIMEFRAMES,
    created: req.query.created === '1',
    updated: req.query.updated === '1',
    error: req.query.error,
  });
});

router.get('/teacher/signals/:id/edit', requireAuth, requireRole('TEACHER'), async (req, res) => {
  const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
  if (!teacher?.isApproved) return res.redirect('/teacher');
  const signal = await prisma.signal.findFirst({
    where: { id: req.params.id, teacherId: teacher.id },
  });
  if (!signal) return res.status(404).render('pages/error', { title: 'یافت نشد', message: 'سیگنال یافت نشد', code: 404 });
  const ageMs = Date.now() - new Date(signal.createdAt).getTime();
  if (ageMs > 60 * 60 * 1000) {
    return res.redirect('/teacher?error=' + encodeURIComponent('ویرایش فقط تا ۱ ساعت پس از ثبت ممکن است'));
  }
  const currencyPairs = await prisma.currencyPair.findMany({
    where: { isActive: true },
    orderBy: { symbol: 'asc' },
  });
  res.render('pages/teacher-signal-edit', {
    title: 'ویرایش سیگنال',
    signal,
    currencyPairs,
    timeframes: TIMEFRAMES,
  });
});

router.post('/teacher/signals/:id', requireAuth, requireRole('TEACHER'), upload.single('chart'), csrfProtection, async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher?.isApproved) return res.status(403).send('استاد تأیید نشده');
    const existing = await prisma.signal.findFirst({
      where: { id: req.params.id, teacherId: teacher.id },
    });
    if (!existing) return res.status(404).send('یافت نشد');
    if (Date.now() - new Date(existing.createdAt).getTime() > 60 * 60 * 1000) {
      return res.redirect('/teacher?error=' + encodeURIComponent('مهلت ویرایش تمام شده'));
    }
    const data = parseSignalBody(req.body);
    const pair = await prisma.currencyPair.findUnique({ where: { symbol: data.pairSymbol } });
    const chartUrl = req.file ? saveChartFile(req.file) : existing.chartImageUrl;
    await prisma.signal.update({
      where: { id: existing.id },
      data: { ...data, pairId: pair?.id, chartImageUrl: chartUrl },
    });
    res.redirect('/teacher?updated=1');
  } catch (e) {
    res.redirect('/teacher?error=' + encodeURIComponent(e.message));
  }
});

router.post('/teacher/signals', requireAuth, requireRole('TEACHER'), upload.single('chart'), csrfProtection, async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher?.isApproved) return res.status(403).send('استاد تأیید نشده');
    const data = parseSignalBody(req.body);
    const pair = await prisma.currencyPair.findUnique({ where: { symbol: data.pairSymbol } });
    if (!pair?.isActive) {
      throw new Error('جفت‌ارز انتخاب‌شده در سیستم فعال نیست');
    }
    const chartUrl = saveChartFile(req.file);
    const signal = await prisma.signal.create({
      data: {
        teacherId: teacher.id,
        teacherUserId: req.user.id,
        pairId: pair.id,
        chartImageUrl: chartUrl,
        status: 'ACTIVE',
        ...data,
      },
    });
    await notifySubscribers(signal);
    res.redirect('/teacher?created=1');
  } catch (e) {
    res.redirect('/teacher?error=' + encodeURIComponent(e.message));
  }
});

router.post('/teacher/signals/:id/close', requireAuth, requireRole('TEACHER'), async (req, res) => {
  const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
  if (!teacher) return res.status(403).send('Forbidden');
  await prisma.signal.updateMany({
    where: { id: req.params.id, teacherId: teacher.id, status: 'ACTIVE' },
    data: { status: 'CLOSED', closedAt: new Date() },
  });
  res.redirect('/teacher');
});

module.exports = router;
