const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const bcrypt = require('bcryptjs');
const prisma = require('../../../lib/prisma');
const { logAdmin, flashRedirect, parseIntSafe } = require('../helpers');

const router = express.Router();

router.get('/users', asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { mobile: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      subscriptions: { where: { status: 'ACTIVE' }, take: 1 },
      wallet: true,
      teacherProfile: true,
    },
  });
  res.render('admin/users', { title: 'کاربران', users, q, saved: req.query.saved });
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      wallet: true,
      subscriptions: { orderBy: { createdAt: 'desc' } },
      teacherProfile: true,
    },
  });
  if (!user) return res.status(404).render('pages/error', { title: 'کاربر', message: 'یافت نشد', code: 404 });
  res.render('admin/user-edit', { title: 'ویرایش کاربر', user, saved: req.query.saved });
}));

router.post('/users/:id', asyncHandler(async (req, res) => {
  const data = {
    fullName: req.body.fullName,
    mobile: req.body.mobile,
    role: req.body.role,
    isBlocked: req.body.isBlocked === 'true',
    emailVerified: req.body.emailVerified === 'true',
  };
  if (req.body.newPassword?.length >= 8) {
    data.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  }
  await prisma.user.update({ where: { id: req.params.id }, data });
  if (req.body.walletBalance !== undefined && req.body.walletBalance !== '') {
    const w = await prisma.wallet.findUnique({ where: { userId: req.params.id } });
    if (w) {
      await prisma.wallet.update({
        where: { id: w.id },
        data: { balance: parseIntSafe(req.body.walletBalance) },
      });
    }
  }
  await logAdmin(req.user.id, 'UPDATE_USER', req.params.id, req.ip);
  flashRedirect(res, `/admin/users/${req.params.id}`);
}));

router.post('/users/:id/subscription', asyncHandler(async (req, res) => {
  const days = parseIntSafe(req.body.days, 7);
  const end = new Date();
  end.setDate(end.getDate() + days);
  await prisma.subscription.create({
    data: {
      userId: req.params.id,
      startDate: new Date(),
      endDate: end,
      amount: parseIntSafe(req.body.amount, 0),
      status: 'ACTIVE',
    },
  });
  flashRedirect(res, `/admin/users/${req.params.id}`);
}));

router.post('/users/:id/block', asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { isBlocked: true },
  });
  flashRedirect(res, '/admin/users');
}));

router.post('/users/:id/unblock', asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { isBlocked: false, loginAttempts: 0, lockedUntil: null },
  });
  flashRedirect(res, '/admin/users');
}));

module.exports = router;
