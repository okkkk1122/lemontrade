const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { flashRedirect, parseIntSafe } = require('../helpers');

const router = express.Router();

router.get('/subscriptions', asyncHandler(async (req, res) => {
  const subs = await prisma.subscription.findMany({
    orderBy: { endDate: 'desc' },
    take: 200,
    include: { user: true },
  });
  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, email: true },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });
  res.render('admin/subscriptions', { title: 'اشتراک‌ها', subs, users, saved: req.query.saved });
}));

router.post('/subscriptions', asyncHandler(async (req, res) => {
  const days = parseIntSafe(req.body.days, 7);
  const end = new Date();
  end.setDate(end.getDate() + days);
  await prisma.subscription.create({
    data: {
      userId: req.body.userId,
      startDate: new Date(),
      endDate: end,
      amount: parseIntSafe(req.body.amount, 0),
      status: 'ACTIVE',
      autoRenew: false,
    },
  });
  flashRedirect(res, '/admin/subscriptions');
}));

router.post('/subscriptions/:id/cancel', asyncHandler(async (req, res) => {
  await prisma.subscription.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
  });
  flashRedirect(res, '/admin/subscriptions');
}));

module.exports = router;
