const express = require('express');
const prisma = require('../../lib/prisma');

const router = express.Router();

router.get('/captcha', (req, res) => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  req.session.captchaAnswer = String(a + b);
  res.json({ question: `${a} + ${b} = ?` });
});

router.get('/menu/:type', async (req, res) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: { menuType: req.params.type, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(items);
  } catch (e) {
    console.error('api/menu', e);
    res.status(503).json({ error: 'menu unavailable' });
  }
});

router.get('/health', (_, res) => res.json({ ok: true, service: 'lemontrade', nameFa: 'لیموترید' }));

module.exports = router;
