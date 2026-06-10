const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { logAdmin, flashRedirect } = require('../helpers');

const router = express.Router();

router.get('/pairs', asyncHandler(async (req, res) => {
  const pairs = await prisma.currencyPair.findMany({ orderBy: { symbol: 'asc' } });
  res.render('admin/pairs', { title: 'جفت‌ارزها', pairs, saved: req.query.saved });
}));

router.post('/pairs', asyncHandler(async (req, res) => {
  const symbol = (req.body.symbol || '').trim().toUpperCase();
  if (!symbol) return flashRedirect(res, '/admin/pairs?error=symbol');
  await prisma.currencyPair.create({ data: { symbol, isActive: req.body.isActive === 'true' } }).catch(() => {});
  await logAdmin(req.user.id, 'CREATE_PAIR', symbol, req.ip);
  flashRedirect(res, '/admin/pairs');
}));

router.post('/pairs/:id', asyncHandler(async (req, res) => {
  await prisma.currencyPair.update({
    where: { id: req.params.id },
    data: {
      symbol: (req.body.symbol || '').trim().toUpperCase(),
      isActive: req.body.isActive === 'true',
    },
  });
  await logAdmin(req.user.id, 'UPDATE_PAIR', req.params.id, req.ip);
  flashRedirect(res, '/admin/pairs');
}));

router.post('/pairs/:id/delete', asyncHandler(async (req, res) => {
  await prisma.currencyPair.delete({ where: { id: req.params.id } }).catch(() => {});
  await logAdmin(req.user.id, 'DELETE_PAIR', req.params.id, req.ip);
  flashRedirect(res, '/admin/pairs');
}));

module.exports = router;
