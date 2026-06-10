const express = require('express');
const prisma = require('../../lib/prisma');
const { sendMail } = require('../../lib/mail');
const config = require('../../config');

const router = express.Router();

router.get('/about', async (req, res) => {
  const [page, team, stats] = await Promise.all([
    prisma.pageContent.findUnique({ where: { id: 'about' } }),
    prisma.teamMember.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.siteStat.findUnique({ where: { id: 'main' } }),
  ]);
  res.render('pages/about', { title: 'درباره ما', page, team, stats });
});

router.get('/contact', async (req, res) => {
  const page = await prisma.pageContent.findUnique({ where: { id: 'contact' } });
  const socials = await prisma.socialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  res.render('pages/contact', { title: 'تماس با ما', page, socials, sent: req.query.sent });
});

router.post('/contact', async (req, res) => {
  await prisma.contactMessage.create({
    data: {
      name: req.body.name,
      email: req.body.email,
      subject: req.body.subject,
      message: req.body.message,
    },
  });
  const settings = res.locals.settings;
  if (settings.supportEmail) {
    await sendMail({
      to: settings.supportEmail || config.smtp.from,
      subject: `[تماس] ${req.body.subject}`,
      html: `<p>از: ${req.body.name} (${req.body.email})</p><p>${req.body.message}</p>`,
    });
  }
  res.redirect('/contact?sent=1');
});

router.get('/terms', async (req, res) => {
  const page = await prisma.pageContent.findUnique({ where: { id: 'terms' } });
  res.render('pages/terms', { title: 'قوانین و مقررات', page });
});

router.get('/faq', async (req, res) => {
  const q = req.query.q || '';
  const categories = await prisma.faqCategory.findMany({
    include: {
      faqs: {
        where: {
          isActive: true,
          ...(q
            ? {
                OR: [
                  { question: { contains: q, mode: 'insensitive' } },
                  { answer: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  res.render('pages/faq', { title: 'سوالات متداول', categories, q });
});

router.get('/blog', async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const where = { status: 'published' };
  if (req.query.category) where.category = { slug: req.query.category };
  if (req.query.q) {
    where.OR = [
      { title: { contains: req.query.q, mode: 'insensitive' } },
      { excerpt: { contains: req.query.q, mode: 'insensitive' } },
    ];
  }
  const [posts, total, categories] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * 9,
      take: 9,
      include: { category: true },
    }),
    prisma.blogPost.count({ where }),
    prisma.blogCategory.findMany(),
  ]);
  res.render('pages/blog', {
    title: 'وبلاگ',
    posts,
    categories,
    page,
    totalPages: Math.ceil(total / 9),
    q: req.query.q,
  });
});

router.get('/blog/:slug', async (req, res) => {
  const post = await prisma.blogPost.findUnique({
    where: { slug: req.params.slug },
    include: {
      category: true,
      comments: { where: { approved: true }, include: { user: true } },
    },
  });
  if (!post || post.status !== 'published') {
    return res.status(404).render('pages/error', { title: 'مقاله', message: 'مقاله یافت نشد', code: 404 });
  }
  await prisma.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } });
  const related = await prisma.blogPost.findMany({
    where: { categoryId: post.categoryId, id: { not: post.id }, status: 'published' },
    take: 3,
  });
  res.render('pages/blog-post', { title: post.title, post, related });
});

router.get('/sessions', async (req, res) => {
  const [upcoming, past] = await Promise.all([
    prisma.liveSession.findMany({
      where: { startAt: { gt: new Date() } },
      orderBy: { startAt: 'asc' },
      include: { teacher: { include: { user: true } } },
    }),
    prisma.liveSession.findMany({
      where: { startAt: { lte: new Date() } },
      orderBy: { startAt: 'desc' },
      take: 20,
      include: { teacher: { include: { user: true } } },
    }),
  ]);
  res.render('pages/sessions', { title: 'جلسات زنده', upcoming, past });
});

module.exports = router;
