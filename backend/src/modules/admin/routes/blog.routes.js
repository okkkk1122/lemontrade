const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { csrfProtection } = require('../../../middleware/csrf');
const { upload, publicUrl } = require('../upload');
const { logAdmin, flashRedirect, parseBool, toSlug } = require('../helpers');

const router = express.Router();

router.get('/blog', asyncHandler(async (req, res) => {
  const [posts, categories, comments] = await Promise.all([
    prisma.blogPost.findMany({ include: { category: true }, orderBy: { publishedAt: 'desc' } }),
    prisma.blogCategory.findMany(),
    prisma.blogComment.findMany({
      include: { user: true, post: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);
  res.render('admin/blog', { title: 'وبلاگ', posts, categories, comments, saved: req.query.saved });
}));

router.get('/blog/new', asyncHandler(async (req, res) => {
  const categories = await prisma.blogCategory.findMany();
  res.render('admin/blog-form', { title: 'مقاله جدید', post: null, categories });
}));

router.get('/blog/:id/edit', asyncHandler(async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
  const categories = await prisma.blogCategory.findMany();
  if (!post) return res.redirect('/admin/blog');
  res.render('admin/blog-form', { title: 'ویرایش مقاله', post, categories, saved: req.query.saved });
}));

router.post('/blog', upload.single('cover'), csrfProtection, asyncHandler(async (req, res) => {
  const post = await prisma.blogPost.create({
    data: {
      title: req.body.title,
      slug: req.body.slug || toSlug(req.body.title),
      excerpt: req.body.excerpt,
      content: req.body.content,
      authorName: req.body.authorName || req.user.fullName,
      categoryId: req.body.categoryId || null,
      status: req.body.status || 'published',
      coverImage: req.file ? publicUrl(req.file.filename) : req.body.coverImage,
      tags: (req.body.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      publishedAt: req.body.publishedAt ? new Date(req.body.publishedAt) : new Date(),
    },
  });
  res.redirect(`/admin/blog/${post.id}/edit?saved=1`);
}));

router.post('/blog/:id', upload.single('cover'), csrfProtection, asyncHandler(async (req, res) => {
  const data = {
    title: req.body.title,
    excerpt: req.body.excerpt,
    content: req.body.content,
    authorName: req.body.authorName,
    categoryId: req.body.categoryId || null,
    status: req.body.status,
    tags: (req.body.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
  };
  if (req.body.slug) data.slug = req.body.slug;
  if (req.file) data.coverImage = publicUrl(req.file.filename);
  else if (req.body.coverImage) data.coverImage = req.body.coverImage;
  await prisma.blogPost.update({ where: { id: req.params.id }, data });
  flashRedirect(res, `/admin/blog/${req.params.id}/edit`);
}));

router.post('/blog/:id/delete', asyncHandler(async (req, res) => {
  await prisma.blogPost.update({
    where: { id: req.params.id },
    data: { status: 'draft' },
  });
  flashRedirect(res, '/admin/blog');
}));

router.post('/blog/categories', asyncHandler(async (req, res) => {
  await prisma.blogCategory.create({
    data: { name: req.body.name, slug: req.body.slug || toSlug(req.body.name) },
  });
  flashRedirect(res, '/admin/blog');
}));

router.post('/blog/comments/:id/approve', asyncHandler(async (req, res) => {
  await prisma.blogComment.update({ where: { id: req.params.id }, data: { approved: true } });
  flashRedirect(res, '/admin/blog');
}));

router.post('/blog/comments/:id/reject', asyncHandler(async (req, res) => {
  await prisma.blogComment.delete({ where: { id: req.params.id } });
  flashRedirect(res, '/admin/blog');
}));

module.exports = router;
