const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { csrfProtection } = require('../../../middleware/csrf');
const { upload, publicUrl } = require('../upload');
const { logAdmin, flashRedirect, parseBool, parseIntSafe, toSlug, parseJsonField } = require('../helpers');

const router = express.Router();

router.get('/packages', asyncHandler(async (req, res) => {
  const [packages, categories] = await Promise.all([
    prisma.package.findMany({ include: { category: true, lessons: true }, orderBy: { createdAt: 'desc' } }),
    prisma.packageCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  res.render('admin/packages', { title: 'پکیج‌ها', packages, categories, saved: req.query.saved });
}));

router.get('/packages/new', asyncHandler(async (req, res) => {
  const categories = await prisma.packageCategory.findMany();
  res.render('admin/package-form', { title: 'پکیج جدید', pkg: null, categories });
}));

router.get('/packages/:id/edit', asyncHandler(async (req, res) => {
  const pkg = await prisma.package.findUnique({
    where: { id: req.params.id },
    include: { lessons: { orderBy: { sortOrder: 'asc' } }, category: true },
  });
  const categories = await prisma.packageCategory.findMany();
  if (!pkg) return res.redirect('/admin/packages');
  res.render('admin/package-form', {
    title: 'ویرایش پکیج',
    pkg,
    categories,
    saved: req.query.saved,
  });
}));

router.post('/packages', upload.single('cover'), csrfProtection, asyncHandler(async (req, res) => {
  const slug = req.body.slug || toSlug(req.body.title);
  const pkg = await prisma.package.create({
    data: {
      title: req.body.title,
      slug,
      shortDesc: req.body.shortDesc,
      fullDesc: req.body.fullDesc,
      price: parseIntSafe(req.body.price),
      discountPercent: req.body.discountPercent ? parseIntSafe(req.body.discountPercent) : null,
      coverImageUrl: req.file ? publicUrl(req.file.filename) : req.body.coverImageUrl,
      categoryId: req.body.categoryId || null,
      isActive: parseBool(req.body.isActive ?? true),
      syllabus: parseJsonField(req.body.syllabus),
    },
  });
  await logAdmin(req.user.id, 'CREATE_PACKAGE', pkg.id, req.ip);
  res.redirect(`/admin/packages/${pkg.id}/edit?saved=1`);
}));

router.post('/packages/:id', upload.single('cover'), csrfProtection, asyncHandler(async (req, res) => {
  const data = {
    title: req.body.title,
    shortDesc: req.body.shortDesc,
    fullDesc: req.body.fullDesc,
    price: parseIntSafe(req.body.price),
    discountPercent: req.body.discountPercent ? parseIntSafe(req.body.discountPercent) : null,
    categoryId: req.body.categoryId || null,
    isActive: parseBool(req.body.isActive),
    syllabus: parseJsonField(req.body.syllabus),
  };
  if (req.body.slug) data.slug = req.body.slug;
  if (req.file) data.coverImageUrl = publicUrl(req.file.filename);
  else if (req.body.coverImageUrl) data.coverImageUrl = req.body.coverImageUrl;
  await prisma.package.update({ where: { id: req.params.id }, data });
  flashRedirect(res, `/admin/packages/${req.params.id}/edit`);
}));

router.post('/packages/:id/delete', asyncHandler(async (req, res) => {
  await prisma.package.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  flashRedirect(res, '/admin/packages');
}));

router.post('/packages/:id/lessons', asyncHandler(async (req, res) => {
  const max = await prisma.packageLesson.aggregate({
    where: { packageId: req.params.id },
    _max: { sortOrder: true },
  });
  await prisma.packageLesson.create({
    data: {
      packageId: req.params.id,
      title: req.body.title,
      videoUrl: req.body.videoUrl,
      fileUrl: req.body.fileUrl,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
      allowDownload: parseBool(req.body.allowDownload ?? true),
    },
  });
  flashRedirect(res, `/admin/packages/${req.params.id}/edit`);
}));

router.post('/packages/lessons/:lessonId', asyncHandler(async (req, res) => {
  const lesson = await prisma.packageLesson.update({
    where: { id: req.params.lessonId },
    data: {
      title: req.body.title,
      videoUrl: req.body.videoUrl,
      fileUrl: req.body.fileUrl,
      sortOrder: parseIntSafe(req.body.sortOrder),
      allowDownload: parseBool(req.body.allowDownload),
    },
  });
  flashRedirect(res, `/admin/packages/${lesson.packageId}/edit`);
}));

router.post('/packages/lessons/:lessonId/delete', asyncHandler(async (req, res) => {
  const lesson = await prisma.packageLesson.delete({ where: { id: req.params.lessonId } });
  flashRedirect(res, `/admin/packages/${lesson.packageId}/edit`);
}));

router.post('/packages/categories', asyncHandler(async (req, res) => {
  await prisma.packageCategory.create({
    data: { name: req.body.name, slug: req.body.slug || toSlug(req.body.name) },
  });
  flashRedirect(res, '/admin/packages');
}));

module.exports = router;
