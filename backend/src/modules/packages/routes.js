const express = require('express');
const prisma = require('../../lib/prisma');
const { requireAuth } = require('../../middleware/auth');
const { formatToman } = require('../../lib/helpers');

const router = express.Router();

function effectivePrice(pkg) {
  const now = new Date();
  if (
    pkg.discountPercent &&
    (!pkg.discountStart || pkg.discountStart <= now) &&
    (!pkg.discountEnd || pkg.discountEnd >= now)
  ) {
    return Math.round(pkg.price * (1 - pkg.discountPercent / 100));
  }
  return pkg.price;
}

router.get('/packages', async (req, res) => {
  const [packages, categories] = await Promise.all([
    prisma.package.findMany({
      where: { isActive: true, ...(req.query.category ? { category: { slug: req.query.category } } : {}) },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.packageCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  res.render('pages/packages', {
    title: 'فروشگاه پکیج‌ها',
    packages: packages.map((p) => ({ ...p, finalPrice: effectivePrice(p) })),
    categories,
    formatToman,
  });
});

router.get('/packages/:slug', async (req, res) => {
  const pkg = await prisma.package.findUnique({
    where: { slug: req.params.slug },
    include: { lessons: { orderBy: { sortOrder: 'asc' } }, reviews: { where: { approved: true }, include: { user: true } } },
  });
  if (!pkg || !pkg.isActive) {
    return res.status(404).render('pages/error', { title: 'پکیج', message: 'پکیج یافت نشد', code: 404 });
  }
  res.render('pages/package-detail', {
    title: pkg.title,
    pkg: { ...pkg, finalPrice: effectivePrice(pkg) },
    formatToman,
  });
});

router.get('/my-packages', requireAuth, async (req, res) => {
  const items = await prisma.userPackage.findMany({
    where: { userId: req.user.id },
    include: { package: { include: { lessons: { orderBy: { sortOrder: 'asc' } } } } },
    orderBy: { purchasedAt: 'desc' },
  });
  res.render('pages/my-packages', { title: 'پکیج‌های من', items });
});

router.get('/my-packages/:id', requireAuth, async (req, res) => {
  const up = await prisma.userPackage.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { package: { include: { lessons: { orderBy: { sortOrder: 'asc' } } } } },
  });
  if (!up) return res.status(404).render('pages/error', { title: 'پکیج', message: 'دسترسی ندارید', code: 404 });
  res.render('pages/my-package-content', { title: up.package.title, userPackage: up });
});

module.exports = router;
