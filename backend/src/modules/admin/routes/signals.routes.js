const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { logAdmin, flashRedirect } = require('../helpers');

const router = express.Router();

router.get('/signals', asyncHandler(async (req, res) => {
  const signals = await prisma.signal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { teacher: { include: { user: true } } },
  });
  res.render('admin/signals', { title: 'سیگنال‌ها', signals, saved: req.query.saved });
}));

router.post('/signals/:id/status', asyncHandler(async (req, res) => {
  await prisma.signal.update({
    where: { id: req.params.id },
    data: { status: req.body.status, closedAt: req.body.status !== 'ACTIVE' ? new Date() : null },
  });
  await logAdmin(req.user.id, 'UPDATE_SIGNAL', `${req.params.id} -> ${req.body.status}`, req.ip);
  flashRedirect(res, '/admin/signals');
}));

router.post('/signals/:id/delete', asyncHandler(async (req, res) => {
  await prisma.signal.delete({ where: { id: req.params.id } });
  await logAdmin(req.user.id, 'DELETE_SIGNAL', req.params.id, req.ip);
  flashRedirect(res, '/admin/signals');
}));

module.exports = router;
