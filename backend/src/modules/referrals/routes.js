const express = require('express');
const prisma = require('../../lib/prisma');
const { requireAuth } = require('../../middleware/auth');
const config = require('../../config');

const router = express.Router();

router.get('/referrals', requireAuth, async (req, res) => {
  const [referrals, rewards, settings] = await Promise.all([
    prisma.referral.findMany({
      where: { referrerId: req.user.id },
      include: { referee: true },
      orderBy: { registeredAt: 'desc' },
    }),
    prisma.referralReward.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.referralSetting.findUnique({ where: { id: 'main' } }),
  ]);
  const levels = settings?.levels || [
    { level: 1, count: 3, reward: 'یک ماه اشتراک رایگان' },
    { level: 2, count: 6, reward: '۵۰٪ تخفیف پکیج' },
    { level: 3, count: 10, reward: 'یک پکیج رایگان' },
  ];
  const qualified = referrals.filter((r) => r.isQualified).length;
  const link = `${config.appUrl}/signup?ref=${req.user.referralCode}`;
  res.render('pages/referrals', {
    title: 'معرفی دوستان',
    referrals,
    rewards,
    levels,
    qualified,
    link,
  });
});

module.exports = router;
