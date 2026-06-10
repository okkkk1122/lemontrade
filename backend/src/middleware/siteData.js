const prisma = require('../lib/prisma');

const defaultHeaderMenu = [
  { title: 'خانه', link: '/', sortOrder: 0 },
  { title: 'آموزش', link: '/learn/zero-to-hundred', sortOrder: 1 },
  { title: 'پکیج‌ها', link: '/packages', sortOrder: 2 },
  { title: 'جلسات زنده', link: '/sessions', sortOrder: 3 },
  { title: 'وبلاگ', link: '/blog', sortOrder: 4 },
  { title: 'سوالات', link: '/faq', sortOrder: 5 },
];

async function loadSiteData(req, res, next) {
  try {
    const [headerMenu, footerMenu, socials] = await Promise.all([
      prisma.menuItem.findMany({
        where: { menuType: 'header', isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.menuItem.findMany({
        where: { menuType: 'footer', isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.socialLink.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    res.locals.headerMenu =
      headerMenu.length > 0 ? headerMenu : defaultHeaderMenu.map((m, i) => ({ ...m, id: String(i) }));
    res.locals.footerMenu = footerMenu;
    res.locals.socialLinks = socials;

    const s = res.locals.settings || {};
    res.locals.contactEmail = s.supportEmail || 'support@lemontrade.com';
    res.locals.contactPhone = s.supportPhone || '۰۲۱-۹۱۰۰۰۰۰۰';
    res.locals.contactAddress = s.supportAddress || 'تهران، ایران';
  } catch (e) {
    console.error('loadSiteData', e);
    res.locals.headerMenu = defaultHeaderMenu;
    res.locals.footerMenu = [];
    res.locals.socialLinks = [];
    const s = res.locals.settings || {};
    res.locals.contactEmail = s.supportEmail || 'support@lemontrade.com';
    res.locals.contactPhone = s.supportPhone || '۰۲۱-۹۱۰۰۰۰۰۰';
    res.locals.contactAddress = s.supportAddress || 'تهران، ایران';
  }
  next();
}

module.exports = { loadSiteData };
