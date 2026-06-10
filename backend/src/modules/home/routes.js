const express = require('express');
const prisma = require('../../lib/prisma');

const router = express.Router();

router.get('/', async (req, res) => {
  const [sliders, cards, stats, sampleSignals, topTeachers, upcomingSessions, faqs] =
    await Promise.all([
      prisma.slider.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 5 }),
      prisma.homeCard.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 3 }),
      prisma.siteStat.findUnique({ where: { id: 'main' } }),
      prisma.signal.findMany({
        where: { OR: [{ isSample: true }, { status: 'ACTIVE' }] },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { teacher: { include: { user: true } } },
      }),
      prisma.teacher.findMany({
        where: { isActive: true, isApproved: true },
        orderBy: { rating: 'desc' },
        take: 4,
        include: { user: true, _count: { select: { signals: true } } },
      }),
      prisma.liveSession.findMany({
        where: { startAt: { gt: new Date() }, status: 'scheduled' },
        orderBy: { startAt: 'asc' },
        take: 3,
        include: { teacher: { include: { user: true } } },
      }),
      prisma.faq.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 4 }),
    ]);

  res.render('pages/home', {
    title: 'صفحه اصلی',
    sliders,
    cards,
    stats: stats || { users: 1200, signals: 850, profitPercent: 72, sessions: 340 },
    sampleSignals,
    topTeachers,
    upcomingSessions,
    faqs,
  });
});

module.exports = router;
