const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { requireRole } = require('../../../middleware/auth');
const { flashRedirect, parseIntSafe } = require('../helpers');

const router = express.Router();

router.get('/investments', asyncHandler(async (req, res) => {
  const [investors, requests] = await Promise.all([
    prisma.investment.findMany({ include: { user: true } }),
    prisma.investmentRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  const userIds = requests.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  res.render('admin/investments', {
    title: 'سرمایه‌گذاری',
    investors,
    requests: requests.map((r) => ({ ...r, user: userMap[r.userId] })),
    saved: req.query.saved,
  });
}));

router.post('/investments/approve/:userId', asyncHandler(async (req, res) => {
  await prisma.investment.upsert({
    where: { userId: req.params.userId },
    create: { userId: req.params.userId, isApproved: true, balance: 0 },
    update: { isApproved: true },
  });
  await prisma.investmentRequest.updateMany({
    where: { userId: req.params.userId },
    data: { status: 'approved' },
  });
  flashRedirect(res, '/admin/investments');
}));

router.post('/investments/reject/:userId', asyncHandler(async (req, res) => {
  await prisma.investmentRequest.updateMany({
    where: { userId: req.params.userId, status: 'pending' },
    data: { status: 'rejected', reason: req.body.reason },
  });
  flashRedirect(res, '/admin/investments');
}));

router.post('/investments/:userId/balance', asyncHandler(async (req, res) => {
  const balance = parseIntSafe(req.body.balance);
  const inv = await prisma.investment.upsert({
    where: { userId: req.params.userId },
    create: { userId: req.params.userId, isApproved: true, balance },
    update: { balance, isApproved: true },
  });
  await prisma.investmentTransaction.create({
    data: {
      investmentId: inv.id,
      type: 'admin_adjust',
      amount: balance,
      description: req.body.note || 'تنظیم دستی ادمین',
    },
  });
  flashRedirect(res, '/admin/investments');
}));

module.exports = router;
