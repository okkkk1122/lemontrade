const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { csrfProtection } = require('../../../middleware/csrf');
const { upload, publicUrl } = require('../upload');
const { flashRedirect } = require('../helpers');

const router = express.Router();

router.get('/sessions', asyncHandler(async (req, res) => {
  const [sessions, teachers] = await Promise.all([
    prisma.liveSession.findMany({
      orderBy: { startAt: 'desc' },
      include: { teacher: { include: { user: true } } },
    }),
    prisma.teacher.findMany({ where: { isApproved: true }, include: { user: true } }),
  ]);
  res.render('admin/sessions', { title: 'جلسات', sessions, teachers, saved: req.query.saved });
}));

router.post('/sessions', asyncHandler(async (req, res) => {
  await prisma.liveSession.create({
    data: {
      title: req.body.title,
      teacherId: req.body.teacherId,
      startAt: new Date(req.body.startAt),
      durationMin: parseInt(req.body.durationMin, 10) || 60,
      maxAttendees: req.body.maxAttendees ? parseInt(req.body.maxAttendees, 10) : null,
      roomLink: req.body.roomLink || `https://meet.jit.si/lemontrade-${Date.now()}`,
      status: req.body.status || 'scheduled',
    },
  });
  flashRedirect(res, '/admin/sessions');
}));

router.post('/sessions/:id', asyncHandler(async (req, res) => {
  await prisma.liveSession.update({
    where: { id: req.params.id },
    data: {
      title: req.body.title,
      teacherId: req.body.teacherId,
      startAt: new Date(req.body.startAt),
      durationMin: parseInt(req.body.durationMin, 10) || 60,
      maxAttendees: req.body.maxAttendees ? parseInt(req.body.maxAttendees, 10) : null,
      roomLink: req.body.roomLink,
      status: req.body.status,
    },
  });
  flashRedirect(res, '/admin/sessions');
}));

router.post('/sessions/:id/recording', upload.single('recording'), csrfProtection, asyncHandler(async (req, res) => {
  const data = { recordingUrl: req.body.recordingUrl };
  if (req.file) data.recordingUrl = publicUrl(req.file.filename);
  await prisma.liveSession.update({ where: { id: req.params.id }, data });
  flashRedirect(res, '/admin/sessions');
}));

router.post('/sessions/:id/cancel', asyncHandler(async (req, res) => {
  await prisma.liveSession.update({
    where: { id: req.params.id },
    data: { status: 'cancelled' },
  });
  flashRedirect(res, '/admin/sessions');
}));

module.exports = router;
