const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { logAdmin, flashRedirect, parseBool, parseFloatSafe } = require('../helpers');

const router = express.Router();

router.get('/teachers', asyncHandler(async (req, res) => {
  const teachers = await prisma.teacher.findMany({ include: { user: true } });
  res.render('admin/teachers', { title: 'اساتید', teachers, saved: req.query.saved });
}));

router.post('/teachers/:id/approve', asyncHandler(async (req, res) => {
  await prisma.teacher.update({
    where: { id: req.params.id },
    data: { isApproved: true, isActive: true },
  });
  const t = await prisma.teacher.findUnique({ where: { id: req.params.id } });
  if (t) await prisma.user.update({ where: { id: t.userId }, data: { role: 'TEACHER' } });
  flashRedirect(res, '/admin/teachers');
}));

router.post('/teachers/:id', asyncHandler(async (req, res) => {
  await prisma.teacher.update({
    where: { id: req.params.id },
    data: {
      bio: req.body.bio,
      rating: parseFloatSafe(req.body.rating, 4.5),
      successRate: parseFloatSafe(req.body.successRate, 0),
      isActive: parseBool(req.body.isActive),
      isApproved: parseBool(req.body.isApproved),
    },
  });
  flashRedirect(res, '/admin/teachers');
}));

router.post('/teachers/:id/deactivate', asyncHandler(async (req, res) => {
  await prisma.teacher.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  flashRedirect(res, '/admin/teachers');
}));

module.exports = router;
