const express = require('express');
const prisma = require('../../lib/prisma');
const { sendMail } = require('../../lib/mail');
const config = require('../../config');
const { localizeRows, lt } = require('../../lib/localize');

const router = express.Router();

function localizePage(page, locale) {
  if (!page) return page;
  return {
    ...page,
    title: lt(page, 'title', locale),
    content: lt(page, 'content', locale),
  };
}

router.get('/about', async (req, res) => {
  const loc = req.locale || 'fa';
  const [page, team, stats] = await Promise.all([
    prisma.pageContent.findUnique({ where: { id: 'about' } }),
    prisma.teamMember.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.siteStat.findUnique({ where: { id: 'main' } }),
  ]);
  res.render('pages/about', {
    title: res.locals.t('pages.about'),
    page: localizePage(page, loc),
    team: localizeRows(team, ['name', 'role', 'bio'], loc),
    stats,
  });
});

router.get('/contact', async (req, res) => {
  const loc = req.locale || 'fa';
  const page = await prisma.pageContent.findUnique({ where: { id: 'contact' } });
  const socials = await prisma.socialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  res.render('pages/contact', {
    title: res.locals.t('pages.contact'),
    page: localizePage(page, loc),
    socials,
    sent: req.query.sent,
  });
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
  const loc = req.locale || 'fa';
  const page = await prisma.pageContent.findUnique({ where: { id: 'terms' } });
  res.render('pages/terms', { title: res.locals.t('pages.terms'), page: localizePage(page, loc) });
});

router.get('/faq', async (req, res) => {
  const loc = req.locale || 'fa';
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
  const localized = categories.map((cat) => ({
    ...cat,
    name: lt(cat, 'name', loc),
    faqs: localizeRows(cat.faqs, ['question', 'answer'], loc),
  }));
  res.render('pages/faq', { title: res.locals.t('pages.faq'), categories: localized, q });
});

router.get('/blog', async (req, res) => {
  const loc = req.locale || 'fa';
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
    title: res.locals.t('pages.blog'),
    posts: localizeRows(posts, ['title', 'excerpt', 'authorName'], loc).map((p) => ({
      ...p,
      category: p.category ? { ...p.category, name: lt(p.category, 'name', loc) } : null,
    })),
    categories: localizeRows(categories, ['name'], loc),
    page,
    totalPages: Math.ceil(total / 9),
    q: req.query.q,
  });
});

router.get('/blog/:slug', async (req, res) => {
  const loc = req.locale || 'fa';
  const post = await prisma.blogPost.findUnique({
    where: { slug: req.params.slug },
    include: {
      category: true,
      comments: {
        where: { approved: true, locale: loc },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!post || post.status !== 'published') {
    return res.status(404).render('pages/error', {
      title: res.locals.t('pages.blog'),
      message: res.locals.t('blog.notFound'),
      code: 404,
    });
  }
  await prisma.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } });
  const related = await prisma.blogPost.findMany({
    where: { categoryId: post.categoryId, id: { not: post.id }, status: 'published' },
    take: 3,
  });
  const localized = {
    ...localizeRows([post], ['title', 'excerpt', 'content', 'authorName'], loc)[0],
    category: post.category ? { ...post.category, name: lt(post.category, 'name', loc) } : null,
    comments: post.comments,
  };
  res.render('pages/blog-post', {
    title: localized.title,
    post: localized,
    related: localizeRows(related, ['title'], loc),
  });
});

router.get('/sessions', async (req, res) => {
  const loc = req.locale || 'fa';
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
  res.render('pages/sessions', {
    title: res.locals.t('nav.sessions'),
    upcoming: localizeRows(upcoming, ['title'], loc),
    past: localizeRows(past, ['title'], loc),
  });
});

module.exports = router;
