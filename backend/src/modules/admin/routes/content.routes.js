const express = require('express');
const asyncHandler = require('../../../lib/asyncHandler');
const prisma = require('../../../lib/prisma');
const { csrfProtection } = require('../../../middleware/csrf');
const { defaultSocialIcon } = require('../../../lib/socialIcons');
const { upload, publicUrl } = require('../upload');
const { logAdmin, flashRedirect, parseBool, parseIntSafe, parseJsonField, toSlug } = require('../helpers');

const router = express.Router();

router.get('/content', asyncHandler(async (req, res) => {
  const [sliders, paths, cards, pages, faqCats, menus, socials, team] = await Promise.all([
    prisma.slider.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.learningPath.findMany({
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    }),
    prisma.homeCard.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.pageContent.findMany(),
    prisma.faqCategory.findMany({
      include: { faqs: { orderBy: { sortOrder: 'asc' } } },
    }),
    prisma.menuItem.findMany({ orderBy: [{ menuType: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.socialLink.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.teamMember.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  res.render('admin/content', {
    title: 'مدیریت محتوا',
    sliders,
    paths,
    cards,
    pages,
    faqCats,
    menus,
    socials,
    team,
    saved: req.query.saved,
  });
}));

// --- Sliders ---
router.post('/content/sliders', upload.single('image'), csrfProtection, asyncHandler(async (req, res) => {
  const imageUrl = req.file ? publicUrl(req.file.filename) : req.body.imageUrl || null;
  await prisma.slider.create({
    data: {
      title: req.body.title,
      subtitle: req.body.subtitle,
      buttonText: req.body.buttonText,
      buttonLink: req.body.buttonLink,
      imageUrl,
      sortOrder: parseIntSafe(req.body.sortOrder),
      isActive: parseBool(req.body.isActive ?? true),
    },
  });
  await logAdmin(req.user.id, 'CREATE_SLIDER', req.body.title, req.ip);
  flashRedirect(res, '/admin/content');
}));

router.post('/content/sliders/:id', upload.single('image'), csrfProtection, asyncHandler(async (req, res) => {
  const data = {
    title: req.body.title,
    subtitle: req.body.subtitle,
    buttonText: req.body.buttonText,
    buttonLink: req.body.buttonLink,
    sortOrder: parseIntSafe(req.body.sortOrder),
    isActive: parseBool(req.body.isActive),
  };
  if (req.file) data.imageUrl = publicUrl(req.file.filename);
  else if (req.body.imageUrl) data.imageUrl = req.body.imageUrl;
  await prisma.slider.update({ where: { id: req.params.id }, data });
  await logAdmin(req.user.id, 'UPDATE_SLIDER', req.params.id, req.ip);
  flashRedirect(res, '/admin/content');
}));

router.post('/content/sliders/:id/delete', asyncHandler(async (req, res) => {
  await prisma.slider.delete({ where: { id: req.params.id } });
  flashRedirect(res, '/admin/content');
}));

// --- Home cards ---
router.post('/content/cards', asyncHandler(async (req, res) => {
  await prisma.homeCard.create({
    data: {
      title: req.body.title,
      description: req.body.description,
      buttonText: req.body.buttonText,
      buttonLink: req.body.buttonLink,
      icon: req.body.icon,
      sortOrder: parseIntSafe(req.body.sortOrder),
      isActive: parseBool(req.body.isActive ?? true),
    },
  });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/cards/:id/delete', asyncHandler(async (req, res) => {
  await prisma.homeCard.delete({ where: { id: req.params.id } });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/cards/:id', asyncHandler(async (req, res) => {
  await prisma.homeCard.update({
    where: { id: req.params.id },
    data: {
      title: req.body.title,
      description: req.body.description,
      buttonText: req.body.buttonText,
      buttonLink: req.body.buttonLink,
      icon: req.body.icon,
      sortOrder: parseIntSafe(req.body.sortOrder),
      isActive: parseBool(req.body.isActive),
    },
  });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/cards/:id/delete', asyncHandler(async (req, res) => {
  await prisma.homeCard.delete({ where: { id: req.params.id } });
  flashRedirect(res, '/admin/content');
}));

// --- Static pages ---
router.post('/content/pages/:id', asyncHandler(async (req, res) => {
  await prisma.pageContent.upsert({
    where: { id: req.params.id },
    create: { id: req.params.id, title: req.body.title, content: req.body.content },
    update: { title: req.body.title, content: req.body.content },
  });
  flashRedirect(res, '/admin/content');
}));

// --- Learning steps ---
router.post('/content/steps/:id', upload.fields([
  { name: 'exercise', maxCount: 1 },
]), csrfProtection, asyncHandler(async (req, res) => {
  const data = {
    title: req.body.title,
    content: req.body.content,
    videoUrl: req.body.videoUrl,
    sortOrder: parseIntSafe(req.body.sortOrder),
    isActive: parseBool(req.body.isActive ?? true),
  };
  if (req.files?.exercise?.[0]) data.exerciseFileUrl = publicUrl(req.files.exercise[0].filename);
  else if (req.body.exerciseFileUrl) data.exerciseFileUrl = req.body.exerciseFileUrl;
  await prisma.learningStep.update({ where: { id: req.params.id }, data });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/steps', asyncHandler(async (req, res) => {
  const path = await prisma.learningPath.findUnique({ where: { id: req.body.pathId } });
  if (!path) return flashRedirect(res, '/admin/content');
  const max = await prisma.learningStep.aggregate({
    where: { pathId: path.id },
    _max: { sortOrder: true },
  });
  await prisma.learningStep.create({
    data: {
      pathId: path.id,
      title: req.body.title,
      content: req.body.content || '',
      videoUrl: req.body.videoUrl,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  flashRedirect(res, '/admin/content');
}));

// --- FAQ ---
router.post('/content/faq-categories', asyncHandler(async (req, res) => {
  await prisma.faqCategory.create({
    data: { name: req.body.name, slug: toSlug(req.body.slug || req.body.name) },
  });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/faqs', asyncHandler(async (req, res) => {
  await prisma.faq.create({
    data: {
      categoryId: req.body.categoryId,
      question: req.body.question,
      answer: req.body.answer,
      sortOrder: parseIntSafe(req.body.sortOrder),
      isActive: parseBool(req.body.isActive ?? true),
    },
  });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/faqs/:id', asyncHandler(async (req, res) => {
  await prisma.faq.update({
    where: { id: req.params.id },
    data: {
      question: req.body.question,
      answer: req.body.answer,
      sortOrder: parseIntSafe(req.body.sortOrder),
      isActive: parseBool(req.body.isActive),
      categoryId: req.body.categoryId,
    },
  });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/faqs/:id/delete', asyncHandler(async (req, res) => {
  await prisma.faq.delete({ where: { id: req.params.id } });
  flashRedirect(res, '/admin/content');
}));

// --- Menu ---
router.post('/content/menus', asyncHandler(async (req, res) => {
  await prisma.menuItem.create({
    data: {
      menuType: req.body.menuType,
      title: req.body.title,
      link: req.body.link,
      icon: req.body.icon,
      sortOrder: parseIntSafe(req.body.sortOrder),
      openNewTab: parseBool(req.body.openNewTab),
      isActive: parseBool(req.body.isActive ?? true),
    },
  });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/menus/:id', asyncHandler(async (req, res) => {
  await prisma.menuItem.update({
    where: { id: req.params.id },
    data: {
      title: req.body.title,
      link: req.body.link,
      icon: req.body.icon,
      sortOrder: parseIntSafe(req.body.sortOrder),
      openNewTab: parseBool(req.body.openNewTab),
      isActive: parseBool(req.body.isActive),
    },
  });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/menus/:id/delete', asyncHandler(async (req, res) => {
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  flashRedirect(res, '/admin/content');
}));

// --- Social ---
router.post('/content/social', asyncHandler(async (req, res) => {
  await prisma.socialLink.create({
    data: {
      platform: req.body.platform,
      url: req.body.url,
      icon: defaultSocialIcon(req.body.platform, req.body.url, req.body.icon),
      sortOrder: parseIntSafe(req.body.sortOrder),
      isActive: parseBool(req.body.isActive ?? true),
    },
  });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/social/:id', asyncHandler(async (req, res) => {
  await prisma.socialLink.update({
    where: { id: req.params.id },
    data: {
      platform: req.body.platform,
      url: req.body.url,
      icon: defaultSocialIcon(req.body.platform, req.body.url, req.body.icon),
      sortOrder: parseIntSafe(req.body.sortOrder),
      isActive: parseBool(req.body.isActive),
    },
  });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/social/:id/delete', asyncHandler(async (req, res) => {
  await prisma.socialLink.delete({ where: { id: req.params.id } });
  flashRedirect(res, '/admin/content');
}));

// --- Team ---
router.post('/content/team', upload.single('photo'), csrfProtection, asyncHandler(async (req, res) => {
  await prisma.teamMember.create({
    data: {
      name: req.body.name,
      role: req.body.role,
      bio: req.body.bio,
      photoUrl: req.file ? publicUrl(req.file.filename) : req.body.photoUrl,
      sortOrder: parseIntSafe(req.body.sortOrder),
    },
  });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/team/:id', upload.single('photo'), csrfProtection, asyncHandler(async (req, res) => {
  const data = {
    name: req.body.name,
    role: req.body.role,
    bio: req.body.bio,
    sortOrder: parseIntSafe(req.body.sortOrder),
  };
  if (req.file) data.photoUrl = publicUrl(req.file.filename);
  else if (req.body.photoUrl) data.photoUrl = req.body.photoUrl;
  await prisma.teamMember.update({ where: { id: req.params.id }, data });
  flashRedirect(res, '/admin/content');
}));

router.post('/content/team/:id/delete', asyncHandler(async (req, res) => {
  await prisma.teamMember.delete({ where: { id: req.params.id } });
  flashRedirect(res, '/admin/content');
}));

module.exports = router;
