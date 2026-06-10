const express = require('express');
const prisma = require('../../lib/prisma');
const { requireAuth } = require('../../middleware/auth');
const { formatToman } = require('../../lib/helpers');

const router = express.Router();

router.get('/investment', requireAuth, async (req, res) => {
  const inv = await prisma.investment.findUnique({
    where: { userId: req.user.id },
    include: { transactions: { orderBy: { createdAt: 'desc' }, take: 30 }, documents: true },
  });
  if (!inv?.isApproved) {
    return res.render('pages/investment-request', { title: 'صندوق سرمایه‌گذاری' });
  }
  res.render('pages/investment', {
    title: 'پنل سرمایه‌گذاری',
    investment: inv,
    formatToman,
  });
});

router.post('/investment/request', requireAuth, async (req, res) => {
  await prisma.investmentRequest.create({
    data: {
      userId: req.user.id,
      amount: parseInt(req.body.amount || '0', 10),
    },
  });
  res.redirect('/investment?requested=1');
});

router.post('/investment/withdraw', requireAuth, async (req, res) => {
  const inv = await prisma.investment.findUnique({ where: { userId: req.user.id } });
  if (!inv?.isApproved) return res.redirect('/investment');
  await prisma.investmentTransaction.create({
    data: {
      investmentId: inv.id,
      type: 'withdraw_request',
      amount: 0,
      description: req.body.description || 'درخواست برداشت',
    },
  });
  res.redirect('/investment?withdraw=1');
});

module.exports = router;
