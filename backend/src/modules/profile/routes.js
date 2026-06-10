const express = require('express');
const prisma = require('../../lib/prisma');
const { requireAuth } = require('../../middleware/auth');
const authService = require('../auth/service');
const { persianDate } = require('../../lib/helpers');

const router = express.Router();

router.get('/profile', requireAuth, async (req, res) => {
  const [devices, subscriptions] = await Promise.all([
    prisma.device.findMany({ where: { userId: req.user.id }, orderBy: { lastActiveAt: 'desc' } }),
    prisma.subscription.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } }),
  ]);
  res.render('pages/profile', {
    title: 'پروفایل',
    devices,
    subscriptions,
    persianDate,
    saved: req.query.saved,
  });
});

router.post('/profile', requireAuth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { fullName: req.body.fullName, mobile: req.body.mobile },
  });
  res.redirect('/profile?saved=1');
});

router.post('/profile/password', requireAuth, async (req, res) => {
  const valid = await authService.comparePassword(req.body.currentPassword, req.user.passwordHash);
  if (!valid) return res.redirect('/profile?error=password');
  if (req.body.newPassword !== req.body.newPasswordConfirm) {
    return res.redirect('/profile?error=match');
  }
  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: await authService.hashPassword(req.body.newPassword) },
  });
  res.redirect('/profile?saved=1');
});

router.post('/profile/delete-request', requireAuth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { deleteRequestedAt: new Date() },
  });
  res.redirect('/profile?delete=requested');
});

router.post('/profile/devices/:id/remove', requireAuth, async (req, res) => {
  await prisma.device.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  res.redirect('/profile');
});

module.exports = router;
