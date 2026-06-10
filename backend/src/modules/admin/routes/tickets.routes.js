const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { csrfProtection } = require('../../../middleware/csrf');
const { upload, publicUrl } = require('../upload');
const { flashRedirect } = require('../helpers');

const router = express.Router();

router.get('/tickets', asyncHandler(async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: { user: true },
  });
  res.render('admin/tickets', { title: 'تیکت‌ها', tickets, saved: req.query.saved });
}));

router.get('/tickets/:id', asyncHandler(async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      user: true,
      messages: { orderBy: { createdAt: 'asc' }, include: { user: true } },
    },
  });
  if (!ticket) return res.redirect('/admin/tickets');
  res.render('admin/ticket-view', { title: ticket.subject, ticket, saved: req.query.saved });
}));

router.post('/tickets/:id/reply', upload.single('file'), csrfProtection, asyncHandler(async (req, res) => {
  await prisma.ticketMessage.create({
    data: {
      ticketId: req.params.id,
      userId: req.user.id,
      content: req.body.content,
      isStaff: true,
      fileUrl: req.file ? publicUrl(req.file.filename) : null,
    },
  });
  await prisma.ticket.update({
    where: { id: req.params.id },
    data: { status: 'ANSWERED', updatedAt: new Date() },
  });
  flashRedirect(res, `/admin/tickets/${req.params.id}`);
}));

router.post('/tickets/:id', asyncHandler(async (req, res) => {
  await prisma.ticket.update({
    where: { id: req.params.id },
    data: {
      status: req.body.status,
      priority: req.body.priority,
      category: req.body.category,
    },
  });
  flashRedirect(res, `/admin/tickets/${req.params.id}`);
}));

router.post('/tickets/:id/close', asyncHandler(async (req, res) => {
  await prisma.ticket.update({
    where: { id: req.params.id },
    data: { status: 'CLOSED' },
  });
  flashRedirect(res, '/admin/tickets');
}));

module.exports = router;
