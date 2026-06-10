const express = require('express');
const prisma = require('../../lib/prisma');
const { requireAuth } = require('../../middleware/auth');
const { formatToman } = require('../../lib/helpers');

const router = express.Router();

router.get('/wallet', requireAuth, async (req, res) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: req.user.id },
    include: {
      transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  const page = parseInt(req.query.page || '1', 10);
  res.render('pages/wallet', {
    title: 'کیف پول من',
    wallet: wallet || { balance: 0, transactions: [] },
    formatToman,
    page,
  });
});

router.post('/wallet/deposit', requireAuth, (req, res) => {
  const amount = parseInt(req.body.amount || '0', 10);
  if (amount < 10000) return res.redirect('/wallet?error=min');
  res.redirect(`/payment/zarinpal?amount=${amount}`);
});

module.exports = router;
