const {
  sliderContent,
  homeCardContent,
  headerMenuContent,
  footerMenuContent,
  faqContent,
  blogPosts,
  blogComments,
  packageContent,
  pageAbout,
  pageTerms,
  pageContact,
  teamContent,
  primaryFields,
} = require('./i18n-content');

function isEmptyTranslations(tr) {
  if (!tr || typeof tr !== 'object') return true;
  return !tr.fa && !tr.ar && !tr.en;
}

async function syncI18nContent(prisma, demoUserId) {
  for (const def of sliderContent) {
    const row = await prisma.slider.findFirst({ where: { sortOrder: def.sortOrder } });
    const payload = {
      ...primaryFields(def.translations, ['title', 'subtitle', 'buttonText']),
      translations: def.translations,
      imageUrl: def.imageUrl,
      buttonLink: def.buttonLink,
    };
    if (row) {
      if (isEmptyTranslations(row.translations) || !row.imageUrl || row.imageUrl === '/logo.png') {
        await prisma.slider.update({ where: { id: row.id }, data: payload });
      }
    } else {
      await prisma.slider.create({ data: { ...payload, sortOrder: def.sortOrder } });
    }
  }

  for (const def of homeCardContent) {
    const row = await prisma.homeCard.findFirst({ where: { sortOrder: def.sortOrder } });
    const payload = {
      ...primaryFields(def.translations, ['title', 'description', 'buttonText']),
      translations: def.translations,
      imageUrl: def.imageUrl,
      buttonLink: def.buttonLink,
      icon: def.icon,
    };
    if (row) {
      if (isEmptyTranslations(row.translations) || !row.imageUrl) {
        await prisma.homeCard.update({ where: { id: row.id }, data: payload });
      }
    } else {
      await prisma.homeCard.create({ data: { ...payload, sortOrder: def.sortOrder } });
    }
  }

  for (const def of headerMenuContent) {
    const row = await prisma.menuItem.findFirst({ where: { menuType: 'header', link: def.link } });
    const title = def.translations.fa;
    const translations = { fa: { title: def.translations.fa }, ar: { title: def.translations.ar }, en: { title: def.translations.en } };
    if (row) {
      if (isEmptyTranslations(row.translations)) {
        await prisma.menuItem.update({ where: { id: row.id }, data: { title, translations } });
      }
    } else {
      await prisma.menuItem.create({
        data: { menuType: 'header', title, link: def.link, sortOrder: def.sortOrder, translations },
      });
    }
  }

  for (const def of footerMenuContent) {
    const row = await prisma.menuItem.findFirst({ where: { menuType: 'footer', link: def.link } });
    const title = def.translations.fa;
    const translations = { fa: { title: def.translations.fa }, ar: { title: def.translations.ar }, en: { title: def.translations.en } };
    if (row) {
      if (isEmptyTranslations(row.translations)) {
        await prisma.menuItem.update({ where: { id: row.id }, data: { title, translations } });
      }
    } else {
      await prisma.menuItem.create({
        data: { menuType: 'footer', title, link: def.link, sortOrder: def.sortOrder, translations },
      });
    }
  }

  const faqCat = await prisma.faqCategory.findFirst({ where: { slug: 'subscription' } });
  if (faqCat) {
    for (const def of faqContent) {
      const row = await prisma.faq.findFirst({ where: { categoryId: faqCat.id, sortOrder: def.sortOrder } });
      const payload = {
        ...primaryFields(def.translations, ['question', 'answer']),
        translations: def.translations,
        categoryId: faqCat.id,
        sortOrder: def.sortOrder,
      };
      if (row) {
        if (isEmptyTranslations(row.translations)) {
          await prisma.faq.update({ where: { id: row.id }, data: payload });
        }
      } else {
        await prisma.faq.create({ data: payload });
      }
    }
  }

  const blogCat = await prisma.blogCategory.findFirst({ where: { slug: 'education' } });
  if (blogCat) {
    for (const def of blogPosts) {
      const payload = {
        ...primaryFields(def.translations, ['title', 'excerpt', 'content', 'authorName']),
        translations: def.translations,
        coverImage: def.coverImage,
        categoryId: blogCat.id,
        status: 'published',
        publishedAt: new Date(),
      };
      const existing = await prisma.blogPost.findUnique({ where: { slug: def.slug } });
      if (!existing) {
        await prisma.blogPost.create({ data: { slug: def.slug, ...payload } });
      } else if (isEmptyTranslations(existing.translations)) {
        await prisma.blogPost.update({ where: { slug: def.slug }, data: payload });
      } else if (!existing.coverImage) {
        await prisma.blogPost.update({ where: { slug: def.slug }, data: { coverImage: def.coverImage } });
      }
    }

    const startPost = await prisma.blogPost.findUnique({ where: { slug: 'start-trading' } });
    if (startPost && demoUserId) {
      for (const c of blogComments) {
        const exists = await prisma.blogComment.findFirst({
          where: { postId: startPost.id, locale: c.locale, content: c.content },
        });
        if (!exists) {
          await prisma.blogComment.create({
            data: {
              postId: startPost.id,
              userId: demoUserId,
              content: c.content,
              locale: c.locale,
              approved: true,
            },
          });
        }
      }
    }
  }

  const pkgCat = await prisma.packageCategory.findFirst({ where: { slug: 'beginner' } });
  if (pkgCat) {
    const payload = {
      ...primaryFields(packageContent.translations, ['title', 'shortDesc', 'fullDesc']),
      translations: packageContent.translations,
      coverImageUrl: packageContent.coverImageUrl,
      price: packageContent.price,
      categoryId: pkgCat.id,
    };
    const existing = await prisma.package.findUnique({ where: { slug: packageContent.slug } });
    if (existing) {
      if (isEmptyTranslations(existing.translations) || !existing.coverImageUrl) {
        await prisma.package.update({ where: { slug: packageContent.slug }, data: payload });
      }
    }
  }

  for (const [id, page] of [
    ['about', pageAbout],
    ['terms', pageTerms],
    ['contact', pageContact],
  ]) {
    const row = await prisma.pageContent.findUnique({ where: { id } });
    const dataTr = page.data?.translations;
    if (row) {
      const empty = !row.data?.translations;
      if (empty) {
        await prisma.pageContent.update({
          where: { id },
          data: { title: page.title, content: page.content, data: page.data },
        });
      }
    } else {
      await prisma.pageContent.create({ data: { id, title: page.title, content: page.content, data: page.data } });
    }
    if (!row && dataTr) {
      /* created above */
    }
  }

  for (const def of teamContent) {
    const row = await prisma.teamMember.findFirst({ where: { sortOrder: def.sortOrder } });
    const payload = {
      ...primaryFields(def.translations, ['name', 'role', 'bio']),
      translations: def.translations,
      photoUrl: def.photoUrl,
      sortOrder: def.sortOrder,
    };
    if (row) {
      if (isEmptyTranslations(row.translations) || !row.photoUrl) {
        await prisma.teamMember.update({ where: { id: row.id }, data: payload });
      }
    } else {
      await prisma.teamMember.create({ data: payload });
    }
  }

  const settingsRow = await prisma.siteSetting.findUnique({ where: { id: 'main' } });
  if (settingsRow && !settingsRow.data?.siteNameAr) {
    await prisma.siteSetting.update({
      where: { id: 'main' },
      data: {
        data: {
          ...settingsRow.data,
          siteNameAr: 'ليموتريد',
        },
      },
    });
  }
}

module.exports = { syncI18nContent };
