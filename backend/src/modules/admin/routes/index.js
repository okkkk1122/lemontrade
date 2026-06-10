const express = require('express');
const prisma = require('../../../lib/prisma');
const { requireAdminAuth } = require('../middleware');
const asyncHandler = require('../../../lib/asyncHandler');

const router = express.Router();
router.use(requireAdminAuth);

router.get('/', asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const [
    userCount,
    newUsersMonth,
    signalsToday,
    sessionsMonth,
    revenueMonth,
    expiringSubs,
    openTickets,
    logs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.signal.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.liveSession.count({ where: { startAt: { gte: monthStart } } }),
    prisma.transaction.aggregate({
      where: { status: 'SUCCESS', createdAt: { gte: monthStart }, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        endDate: { lte: new Date(Date.now() + 2 * 86400000), gt: new Date() },
      },
    }),
    prisma.ticket.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        updatedAt: { lt: new Date(Date.now() - 86400000) },
      },
    }),
    prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { admin: true } }),
  ]);

  res.render('admin/dashboard', {
    title: 'پنل مدیریت',
    stats: {
      userCount,
      newUsersMonth,
      signalsToday,
      sessionsMonth,
      revenueMonth: revenueMonth._sum.amount || 0,
      expiringSubs,
      openTickets,
    },
    logs,
  });
}));

router.use(require('./settings.routes'));
router.use(require('./content.routes'));
router.use(require('./users.routes'));
router.use(require('./packages.routes'));
router.use(require('./blog.routes'));
router.use(require('./signals.routes'));
router.use(require('./pairs.routes'));
router.use(require('./teachers.routes'));
router.use(require('./sessions.routes'));
router.use(require('./tickets.routes'));
router.use(require('./subscriptions.routes'));
router.use(require('./investments.routes'));

module.exports = router;
