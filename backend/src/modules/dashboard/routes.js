const express = require('express');
const prisma = require('../../lib/prisma');
const { requireAuth } = require('../../middleware/auth');
const { formatToman, persianDate } = require('../../lib/helpers');

const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const [wallet, subs, stepProgress7, stepProgress10, referrals, recentViews, notifications] =
    await Promise.all([
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.subscription.findMany({
        where: { userId },
        orderBy: { endDate: 'desc' },
        take: 5,
      }),
      prisma.userStepProgress.count({
        where: {
          userId,
          completed: true,
          step: { path: { type: 'SEVEN_STEPS' } },
        },
      }),
      prisma.userStepProgress.count({
        where: {
          userId,
          completed: true,
          step: { path: { type: 'TEN_STEPS' } },
        },
      }),
      prisma.referral.count({ where: { referrerId: userId, isQualified: true } }),
      prisma.signalView.findMany({
        where: { userId },
        orderBy: { viewedAt: 'desc' },
        take: 5,
        include: { signal: { include: { teacher: { include: { user: true } } } } },
      }),
      prisma.userNotification.findMany({
        where: { userId },
        orderBy: { id: 'desc' },
        take: 5,
        include: { notification: true },
      }),
    ]);

  const sevenTotal = await prisma.learningStep.count({
    where: { path: { type: 'SEVEN_STEPS' }, isActive: true, isArchived: false },
  });
  const tenTotal = await prisma.learningStep.count({
    where: { path: { type: 'TEN_STEPS' }, isActive: true, isArchived: false },
  });

  const activeSub = res.locals.activeSubscription;
  let subWarning = false;
  if (activeSub) {
    const daysLeft = (new Date(activeSub.endDate) - new Date()) / (86400000);
    subWarning = daysLeft < 2;
  }

  res.render('pages/dashboard', {
    title: 'داشبورد',
    wallet,
    activeSub,
    subWarning,
    stepProgress7,
    stepProgress10,
    sevenTotal: sevenTotal || 7,
    tenTotal: tenTotal || 10,
    referralCount: referrals,
    recentViews,
    notifications,
    formatToman,
    persianDate,
  });
});

module.exports = router;
