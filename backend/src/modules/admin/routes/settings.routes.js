const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { clearSettingsCache } = require('../../../middleware/settings');
const { logAdmin, flashRedirect, parseIntSafe, parseBool } = require('../helpers');

const router = express.Router();

router.get('/settings', asyncHandler(async (req, res) => {
  const row = await prisma.siteSetting.findUnique({ where: { id: 'main' } });
  const stats = await prisma.siteStat.findUnique({ where: { id: 'main' } });
  res.render('admin/settings', {
    title: 'تنظیمات',
    settings: row?.data || {},
    stats: stats || {},
    saved: req.query.saved,
  });
}));

router.post('/settings', asyncHandler(async (req, res) => {
  const row = await prisma.siteSetting.findUnique({ where: { id: 'main' } });
  const data = { ...(row?.data || {}), ...req.body };
  const numericFields = [
    'weeklySubscriptionPrice',
    'monthlySubscriptionPrice',
    'signalPollSeconds',
    'maxLoginAttempts',
    'lockMinutes',
    'maxDevices',
    'sessionMinutes',
  ];
  numericFields.forEach((f) => {
    if (req.body[f] !== undefined && req.body[f] !== '') data[f] = parseIntSafe(req.body[f], data[f]);
  });
  // چک‌باکس‌های خاموش در body نیستند — باید صریح از req.body خوانده شوند
  data.require2FA = parseBool(req.body.require2FA);
  data.captchaEnabled = parseBool(req.body.captchaEnabled);
  data.defaultDark = parseBool(req.body.defaultDark);
  await prisma.siteSetting.upsert({
    where: { id: 'main' },
    create: { id: 'main', data },
    update: { data },
  });
  clearSettingsCache();
  await logAdmin(req.user.id, 'UPDATE_SETTINGS', 'site settings', req.ip);
  flashRedirect(res, '/admin/settings');
}));

router.post('/settings/stats', asyncHandler(async (req, res) => {
  await prisma.siteStat.upsert({
    where: { id: 'main' },
    create: {
      id: 'main',
      users: parseIntSafe(req.body.users),
      signals: parseIntSafe(req.body.signals),
      profitPercent: parseFloat(req.body.profitPercent) || 0,
      sessions: parseIntSafe(req.body.sessions),
    },
    update: {
      users: parseIntSafe(req.body.users),
      signals: parseIntSafe(req.body.signals),
      profitPercent: parseFloat(req.body.profitPercent) || 0,
      sessions: parseIntSafe(req.body.sessions),
    },
  });
  await logAdmin(req.user.id, 'UPDATE_STATS', 'homepage stats', req.ip);
  flashRedirect(res, '/admin/settings');
}));

module.exports = router;
