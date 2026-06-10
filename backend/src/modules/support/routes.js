const express = require('express');
const prisma = require('../../lib/prisma');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

router.get('/support', requireAuth, async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { userId: req.user.id },
    orderBy: { updatedAt: 'desc' },
  });
  res.render('pages/support', { title: 'پشتیبانی', tickets });
});

router.post('/support', requireAuth, async (req, res) => {
  if (!req.body.subject?.trim() || !req.body.message?.trim()) {
    return res.redirect('/support?error=missing');
  }
  const ticket = await prisma.ticket.create({
    data: {
      userId: req.user.id,
      subject: req.body.subject,
      category: req.body.category || 'general',
      priority: req.body.priority || 'MEDIUM',
      messages: {
        create: { userId: req.user.id, content: req.body.message, isStaff: false },
      },
    },
  });
  res.redirect(`/support/${ticket.id}`);
});

router.get('/support/:id', requireAuth, async (req, res) => {
  const ticket = await prisma.ticket.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!ticket) return res.status(404).render('pages/error', { title: 'تیکت', message: 'یافت نشد', code: 404 });
  res.render('pages/support-ticket', { title: ticket.subject, ticket });
});

router.post('/support/:id/reply', requireAuth, async (req, res) => {
  await prisma.ticketMessage.create({
    data: {
      ticketId: req.params.id,
      userId: req.user.id,
      content: req.body.content,
      isStaff: false,
    },
  });
  await prisma.ticket.update({
    where: { id: req.params.id },
    data: { status: 'OPEN', updatedAt: new Date() },
  });
  res.redirect(`/support/${req.params.id}`);
});

router.post('/support/:id/close', requireAuth, async (req, res) => {
  await prisma.ticket.update({
    where: { id: req.params.id, userId: req.user.id },
    data: { status: 'CLOSED' },
  });
  res.redirect('/support');
});

module.exports = router;
