const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding lemontrade database...');

  const emailDomain = '@lemontrade.com';
  const legacyEmails = ['admin@limootrade.com', 'teacher@limootrade.com', 'user@limootrade.com'];
  for (const oldEmail of legacyEmails) {
    const newEmail = oldEmail.replace('@limootrade.com', emailDomain);
    await prisma.user.updateMany({ where: { email: oldEmail }, data: { email: newEmail } }).catch(() => {});
  }

  // فقط در اولین اجرا — تغییرات پنل ادمین را بازنویسی نمی‌کند
  await prisma.siteSetting.upsert({
    where: { id: 'main' },
    create: {
      id: 'main',
      data: {
        siteName: 'لیموترید',
        siteNameEn: 'lemontrade',
        siteDescription: 'پلتفرم حرفه‌ای آموزش ترید، سیگنال زنده و صندوق سرمایه‌گذاری برای تریدرهای ایرانی.',
        weeklySubscriptionPrice: 1000000,
        require2FA: false,
        signalPollSeconds: 30,
        footerCopyright: '© ۱۴۰۴ لیموترید — تمامی حقوق محفوظ است.',
        supportEmail: 'support@lemontrade.com',
        supportPhone: '۰۲۱-۹۱۰۰۰۰۰۰',
        supportAddress: 'تهران، خیابان نمونه — پلاک ۱۰',
        telegramUrl: 'https://t.me/lemontrade',
        instagramUrl: 'https://instagram.com/lemontrade',
        youtubeUrl: 'https://youtube.com/@lemontrade',
      },
    },
    update: {},
  });
  const settingsRow = await prisma.siteSetting.findUnique({ where: { id: 'main' } });
  if (settingsRow && !settingsRow.data?.youtubeUrl) {
    await prisma.siteSetting.update({
      where: { id: 'main' },
      data: {
        data: {
          ...settingsRow.data,
          youtubeUrl: 'https://youtube.com/@lemontrade',
        },
      },
    });
  }

  await prisma.siteStat.upsert({
    where: { id: 'main' },
    create: { id: 'main', users: 1250, signals: 892, profitPercent: 72.5, sessions: 340 },
    update: {},
  });

  const adminPass = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@lemontrade.com';
  const adminHash = await bcrypt.hash(adminPass, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      fullName: 'مدیر سیستم',
      email: adminEmail,
      mobile: '09120000000',
      passwordHash: adminHash,
      role: 'ADMIN',
      emailVerified: true,
      referralCode: 'LTADMIN01',
      twoFactorEnabled: false,
      loginAttempts: 0,
      lockedUntil: null,
      wallet: { create: { balance: 0 } },
      cart: { create: {} },
    },
    update: {
      passwordHash: adminHash,
      role: 'ADMIN',
      emailVerified: true,
      isBlocked: false,
      loginAttempts: 0,
      lockedUntil: null,
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@lemontrade.com' },
    create: {
      fullName: 'استاد رضا کریمی',
      email: 'teacher@lemontrade.com',
      mobile: '09121111111',
      passwordHash: await bcrypt.hash('Teacher@12345', 12),
      role: 'TEACHER',
      emailVerified: true,
      referralCode: 'LTTEACH01',
      wallet: { create: {} },
      cart: { create: {} },
    },
    update: {},
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    create: {
      userId: teacherUser.id,
      bio: 'تحلیلگر ارشد فارکس و کریپتو',
      rating: 4.8,
      successRate: 76,
      isApproved: true,
      isActive: true,
    },
    update: { isApproved: true },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'user@lemontrade.com' },
    create: {
      fullName: 'علی محمدی',
      email: 'user@lemontrade.com',
      mobile: '09122222222',
      passwordHash: await bcrypt.hash('User@12345', 12),
      role: 'USER',
      emailVerified: true,
      referralCode: 'LTUSER001',
      wallet: { create: { balance: 500000 } },
      cart: { create: {} },
    },
    update: { emailVerified: true, isBlocked: false },
  });

  const endSub = new Date();
  endSub.setDate(endSub.getDate() + 7);
  await prisma.subscription.upsert({
    where: { id: 'seed-sub-demo' },
    create: {
      id: 'seed-sub-demo',
      userId: demoUser.id,
      startDate: new Date(),
      endDate: endSub,
      amount: 1000000,
      status: 'ACTIVE',
    },
    update: {},
  }).catch(() =>
    prisma.subscription.create({
      data: {
        userId: demoUser.id,
        startDate: new Date(),
        endDate: endSub,
        amount: 1000000,
        status: 'ACTIVE',
      },
    })
  );

  const nosubUser = await prisma.user.upsert({
    where: { email: 'nosub@lemontrade.com' },
    create: {
      fullName: 'کاربر بدون اشتراک',
      email: 'nosub@lemontrade.com',
      mobile: '09124444444',
      passwordHash: await bcrypt.hash('NoSub@12345', 12),
      role: 'USER',
      emailVerified: true,
      referralCode: 'LTNOSUB01',
      wallet: { create: { balance: 100000 } },
      cart: { create: {} },
    },
    update: { emailVerified: true, isBlocked: false },
  });
  await prisma.subscription.updateMany({
    where: { userId: nosubUser.id, status: 'ACTIVE' },
    data: { status: 'EXPIRED' },
  });

  for (const symbol of ['BTC/USDT', 'ETH/USDT', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'SOL/USDT']) {
    await prisma.currencyPair.upsert({
      where: { symbol },
      create: { symbol, isActive: true },
      update: {},
    });
  }

  const pairs = await prisma.currencyPair.findMany();
  const pairId = (sym) => pairs.find((p) => p.symbol === sym)?.id;

  const closedSamples = [
    { pairSymbol: 'BTC/USDT', entryPrice: 67500, stopLoss: 66800, takeProfit1: 68500, takeProfit2: 69000, tradeType: 'BUY', timeframe: '1h', status: 'HIT_TP' },
    { pairSymbol: 'ETH/USDT', entryPrice: 3450, stopLoss: 3380, takeProfit1: 3580, tradeType: 'BUY', timeframe: '4h', status: 'HIT_TP' },
    { pairSymbol: 'XAU/USD', entryPrice: 2320, stopLoss: 2310, takeProfit1: 2340, tradeType: 'SELL', timeframe: '1h', status: 'CLOSED' },
    { pairSymbol: 'EUR/USD', entryPrice: 1.085, stopLoss: 1.082, takeProfit1: 1.09, tradeType: 'BUY', timeframe: '15m', status: 'HIT_SL' },
  ];

  for (const s of closedSamples) {
    const exists = await prisma.signal.findFirst({
      where: { pairSymbol: s.pairSymbol, isSample: true, status: s.status, entryPrice: s.entryPrice },
    });
    if (!exists) {
      await prisma.signal.create({
        data: {
          ...s,
          teacherId: teacher.id,
          teacherUserId: teacherUser.id,
          pairId: pairId(s.pairSymbol),
          isSample: true,
          chartImageUrl: '/logo.png',
          analysis: `<p>نمونه سیگنال بسته‌شده <strong>${s.pairSymbol}</strong> — قابل مشاهده عمومی در صفحه اصلی.</p>`,
        },
      });
    }
  }

  const liveSamples = [
    {
      pairSymbol: 'BTC/USDT',
      entryPrice: 68200,
      stopLoss: 67600,
      takeProfit1: 69000,
      takeProfit2: 69500,
      tradeType: 'BUY',
      timeframe: '15m',
      analysis: '<p><strong>سیگنال زنده نمونه BTC</strong></p><p>شکست مقاومت ۶۸۰۰۰ با حجم بالا. SL زیر سطح شکست. TP1 عرضه کوتاه‌مدت، TP2 هدف اصلی.</p>',
    },
    {
      pairSymbol: 'ETH/USDT',
      entryPrice: 3520,
      stopLoss: 3460,
      takeProfit1: 3620,
      takeProfit2: 3680,
      tradeType: 'BUY',
      timeframe: '1h',
      analysis: '<p>سیگنال زنده نمونه اتریوم — روند صعودی H1 حفظ شده است.</p>',
    },
    {
      pairSymbol: 'XAU/USD',
      entryPrice: 2335,
      stopLoss: 2345,
      takeProfit1: 2318,
      tradeType: 'SELL',
      timeframe: '30m',
      analysis: '<p>فروش طلا در محدوده مقاومت — نمونه برای تست صفحه سیگنال زنده.</p>',
    },
    {
      pairSymbol: 'EUR/USD',
      entryPrice: 1.088,
      stopLoss: 1.092,
      takeProfit1: 1.082,
      tradeType: 'SELL',
      timeframe: '4h',
      analysis: '<p>سیگنال نمونه یورو/دلار — سناریوی ریزش پس از رد قیمت.</p>',
    },
  ];

  for (const s of liveSamples) {
    const exists = await prisma.signal.findFirst({
      where: { pairSymbol: s.pairSymbol, status: 'ACTIVE', entryPrice: s.entryPrice },
    });
    if (!exists) {
      await prisma.signal.create({
        data: {
          ...s,
          teacherId: teacher.id,
          teacherUserId: teacherUser.id,
          pairId: pairId(s.pairSymbol),
          status: 'ACTIVE',
          isSample: false,
          chartImageUrl: '/logo.png',
        },
      });
    }
  }
  const activeSignals = await prisma.signal.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
  const seenSig = new Set();
  for (const sig of activeSignals) {
    const key = `${sig.pairSymbol}|${sig.entryPrice}`;
    if (seenSig.has(key)) await prisma.signal.delete({ where: { id: sig.id } });
    else seenSig.add(key);
  }

  const headerMenuCount = await prisma.menuItem.count({ where: { menuType: 'header' } });
  if (!headerMenuCount) {
    await prisma.menuItem.createMany({
      data: [
        { menuType: 'header', title: 'خانه', link: '/', sortOrder: 0 },
        { menuType: 'header', title: 'آموزش', link: '/learn/zero-to-hundred', sortOrder: 1 },
        { menuType: 'header', title: 'پکیج‌ها', link: '/packages', sortOrder: 2 },
        { menuType: 'header', title: 'جلسات زنده', link: '/sessions', sortOrder: 3 },
        { menuType: 'header', title: 'وبلاگ', link: '/blog', sortOrder: 4 },
        { menuType: 'header', title: 'سوالات', link: '/faq', sortOrder: 5 },
        { menuType: 'header', title: 'درباره ما', link: '/about', sortOrder: 6 },
        { menuType: 'header', title: 'تماس', link: '/contact', sortOrder: 7 },
      ],
    });
  }

  const footerMenuCount = await prisma.menuItem.count({ where: { menuType: 'footer' } });
  if (!footerMenuCount) {
    await prisma.menuItem.createMany({
      data: [
        { menuType: 'footer', title: 'درباره ما', link: '/about', sortOrder: 0 },
        { menuType: 'footer', title: 'تماس', link: '/contact', sortOrder: 1 },
        { menuType: 'footer', title: 'قوانین', link: '/terms', sortOrder: 2 },
        { menuType: 'footer', title: 'سوالات متداول', link: '/faq', sortOrder: 3 },
      ],
    });
  }

  const socialCount = await prisma.socialLink.count();
  if (!socialCount) {
    await prisma.socialLink.createMany({
      data: [
        { platform: 'تلگرام', url: 'https://t.me/lemontrade', icon: '/icons/social/telegram.svg', sortOrder: 0 },
        { platform: 'اینستاگرام', url: 'https://instagram.com/lemontrade', icon: '/icons/social/instagram.svg', sortOrder: 1 },
        { platform: 'یوتیوب', url: 'https://youtube.com/@lemontrade', icon: '/icons/social/youtube.svg', sortOrder: 2 },
      ],
    });
  } else {
    const legacyIcons = [
      ['TG', '/icons/social/telegram.svg'],
      ['IG', '/icons/social/instagram.svg'],
      ['YT', '/icons/social/youtube.svg'],
    ];
    for (const [oldIcon, newIcon] of legacyIcons) {
      await prisma.socialLink.updateMany({ where: { icon: oldIcon }, data: { icon: newIcon } });
    }
  }

  await prisma.pageContent.upsert({
    where: { id: 'contact' },
    create: {
      id: 'contact',
      title: 'تماس با ما',
      content: '<p>ایمیل: support@lemontrade.com<br/>تلفن: ۰۲۱-۹۱۰۰۰۰۰۰</p>',
    },
    update: {},
  });

  const sliderDefs = [
    {
      title: 'لیموترید — آموزش و سیگنال حرفه‌ای',
      subtitle: 'از صفر تا صد ترید با اساتید برتر',
      buttonText: 'شروع کنید',
      buttonLink: '/signup',
      sortOrder: 0,
      imageUrl: '/logo.png',
    },
    {
      title: 'سیگنال‌های زنده',
      subtitle: 'با اشتراک هفتگی و احراز ۲FA',
      buttonText: 'مشاهده',
      buttonLink: '/signals/live',
      sortOrder: 1,
    },
  ];
  for (const def of sliderDefs) {
    const row = await prisma.slider.findFirst({ where: { title: def.title, sortOrder: def.sortOrder } });
    if (!row) await prisma.slider.create({ data: def });
  }
  const allSliders = await prisma.slider.findMany({ orderBy: [{ title: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }] });
  const seenSlider = new Set();
  for (const s of allSliders) {
    const key = `${s.title}|${s.sortOrder}`;
    if (seenSlider.has(key)) await prisma.slider.delete({ where: { id: s.id } });
    else seenSlider.add(key);
  }

  const cardDefs = [
    { title: 'سیگنال‌های زنده', description: 'سیگنال لحظه‌ای با تأیید استاد', buttonText: 'مشاهده', buttonLink: '/signals/live', sortOrder: 0 },
    { title: 'آموزش صفر تا صد', description: '۷ و ۱۰ مرحله ویدیویی', buttonText: 'شروع', buttonLink: '/learn/zero-to-hundred', sortOrder: 1 },
    { title: 'صندوق سرمایه‌گذاری', description: 'مدیریت حرفه‌ای سرمایه', buttonText: 'اطلاعات', buttonLink: '/investment', sortOrder: 2 },
  ];
  for (const def of cardDefs) {
    const row = await prisma.homeCard.findFirst({ where: { title: def.title, sortOrder: def.sortOrder } });
    if (!row) await prisma.homeCard.create({ data: def });
  }
  const allCards = await prisma.homeCard.findMany({ orderBy: [{ title: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }] });
  const seenCard = new Set();
  for (const c of allCards) {
    const key = `${c.title}|${c.sortOrder}`;
    if (seenCard.has(key)) await prisma.homeCard.delete({ where: { id: c.id } });
    else seenCard.add(key);
  }

  const path7 = await prisma.learningPath.upsert({
    where: { type: 'SEVEN_STEPS' },
    create: { type: 'SEVEN_STEPS', title: 'صفر تا صد ترید' },
    update: {},
  });
  const path10 = await prisma.learningPath.upsert({
    where: { type: 'TEN_STEPS' },
    create: { type: 'TEN_STEPS', title: 'کار با متاتریدر' },
    update: {},
  });

  const steps7 = ['مقدمات بازار', 'کندل‌شناسی', 'روند و سطوح', 'اندیکاتورها', 'مدیریت سرمایه', 'روانشناسی', 'جمع‌بندی'];
  for (let i = 0; i < steps7.length; i++) {
    const exists = await prisma.learningStep.findFirst({ where: { pathId: path7.id, sortOrder: i } });
    if (!exists) {
      await prisma.learningStep.create({
        data: {
          pathId: path7.id,
          title: steps7[i],
          sortOrder: i,
          content: `<p>محتوای مرحله ${i + 1} — قابل ویرایش از پنل ادمین.</p>`,
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
      });
    }
  }

  const steps10 = ['نصب MT5', 'حساب دمو', 'انواع اردر', 'تایم‌فریم', 'اندیکاتور', 'اکسپرت', 'بک‌تست', 'مدیریت ریسک', 'لاگ معاملات', 'جمع‌بندی'];
  for (let i = 0; i < steps10.length; i++) {
    const exists = await prisma.learningStep.findFirst({ where: { pathId: path10.id, sortOrder: i } });
    if (!exists) {
      await prisma.learningStep.create({
        data: {
          pathId: path10.id,
          title: steps10[i],
          sortOrder: i,
          content: `<p>مرحله ${i + 1} متاتریدر</p>`,
        },
      });
    }
  }

  const cat = await prisma.packageCategory.upsert({
    where: { slug: 'beginner' },
    create: { name: 'مبتدی', slug: 'beginner' },
    update: {},
  });

  await prisma.package.upsert({
    where: { slug: 'forex-starter' },
    create: {
      title: 'پکیج شروع فارکس',
      slug: 'forex-starter',
      shortDesc: 'آموزش جامع ورود به فارکس',
      fullDesc: '<p>پکیج کامل برای مبتدیان</p>',
      price: 2500000,
      categoryId: cat.id,
      syllabus: [{ title: 'معرفی بازار' }, { title: 'پلتفرم' }],
      lessons: {
        create: [
          { title: 'جلسه ۱', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', sortOrder: 0 },
          { title: 'جلسه ۲', sortOrder: 1 },
        ],
      },
    },
    update: {},
  });

  const faqCat = await prisma.faqCategory.upsert({
    where: { slug: 'subscription' },
    create: { name: 'اشتراک', slug: 'subscription' },
    update: {},
  });
  const faqDefs = [
    { categoryId: faqCat.id, question: 'اشتراک هفتگی چقدر است؟', answer: '۱,۰۰۰,۰۰۰ تومان — قابل تغییر از پنل ادمین.', sortOrder: 0 },
    { categoryId: faqCat.id, question: 'برای سیگنال زنده چه لازم است؟', answer: 'ورود، ۲FA فعال و اشتراک فعال.', sortOrder: 1 },
  ];
  for (const def of faqDefs) {
    const row = await prisma.faq.findFirst({ where: { question: def.question, categoryId: faqCat.id } });
    if (!row) await prisma.faq.create({ data: def });
  }
  const allFaqs = await prisma.faq.findMany({ orderBy: [{ question: 'asc' }, { id: 'asc' }] });
  const seenFaq = new Set();
  for (const f of allFaqs) {
    const key = f.question;
    if (seenFaq.has(key)) await prisma.faq.delete({ where: { id: f.id } });
    else seenFaq.add(key);
  }

  await prisma.pageContent.upsert({
    where: { id: 'about' },
    create: { id: 'about', title: 'درباره ما', content: '<p>لیموترید پلتفرم آموزش ترید و سیگنال‌دهی برای تریدرهای ایرانی است.</p>' },
    update: {},
  });
  await prisma.pageContent.upsert({
    where: { id: 'terms' },
    create: { id: 'terms', title: 'قوانین', content: '<p>قوانین استفاده از خدمات لیموترید.</p>' },
    update: {},
  });

  await prisma.teamMember.createMany({
    data: [
      { name: 'رضا کریمی', role: 'مدیر آموزشی', bio: '۱۰ سال تجربه ترید', sortOrder: 0 },
      { name: 'سارا احمدی', role: 'پشتیبانی', bio: 'پاسخگویی ۲۴/۷', sortOrder: 1 },
    ],
    skipDuplicates: true,
  });

  const blogCat = await prisma.blogCategory.upsert({
    where: { slug: 'education' },
    create: { name: 'آموزشی', slug: 'education' },
    update: {},
  });
  await prisma.blogPost.upsert({
    where: { slug: 'start-trading' },
    create: {
      title: 'چگونه ترید را شروع کنیم؟',
      slug: 'start-trading',
      excerpt: 'راهنمای گام‌به‌گام برای مبتدیان',
      content: '<p>در این مقاله با اصول شروع ترید آشنا می‌شوید.</p>',
      authorName: 'تیم لیموترید',
      categoryId: blogCat.id,
    },
    update: {},
  });

  const sessionStart = new Date();
  sessionStart.setDate(sessionStart.getDate() + 2);
  await prisma.liveSession.create({
    data: {
      title: 'تحلیل هفتگی BTC',
      teacherId: teacher.id,
      startAt: sessionStart,
      durationMin: 60,
      roomLink: 'https://meet.example.com/lemontrade-live',
      status: 'scheduled',
    },
  }).catch(() => {});

  const ticketExists = await prisma.ticket.findFirst({ where: { subject: 'نمونه: مشکل ورود به سیگنال' } });
  if (!ticketExists) {
    await prisma.ticket.create({
      data: {
        userId: demoUser.id,
        subject: 'نمونه: مشکل ورود به سیگنال',
        category: 'support',
        status: 'OPEN',
        priority: 'MEDIUM',
        messages: {
          create: [
            {
              content: 'سلام، بعد از خرید اشتراک صفحه سیگنال زنده را بررسی می‌کنم.',
              isStaff: false,
              userId: demoUser.id,
            },
          ],
        },
      },
    });
  }

  const notifExists = await prisma.notification.findFirst({ where: { title: 'خوش آمدید به لیموترید' } });
  if (!notifExists) {
    const n = await prisma.notification.create({
      data: {
        title: 'خوش آمدید به لیموترید',
        body: 'اشتراک نمونه شما فعال است. سیگنال‌های زنده را از منو مشاهده کنید.',
        link: '/signals/live',
        audience: 'user',
      },
    });
    await prisma.userNotification.create({
      data: { userId: demoUser.id, notificationId: n.id },
    });
  }

  await prisma.blogPost.upsert({
    where: { slug: 'gold-analysis' },
    create: {
      title: 'تحلیل هفتگی طلا',
      slug: 'gold-analysis',
      excerpt: 'بررسی روند XAU/USD',
      content: '<p>نمونه مقاله وبلاگ برای نمایش در سایت.</p>',
      authorName: 'استاد رضا کریمی',
      categoryId: blogCat.id,
    },
    update: {},
  }).catch(() => {});

  await prisma.referralSetting.upsert({
    where: { id: 'main' },
    create: {
      id: 'main',
      levels: [
        { level: 1, count: 3, reward: 'یک ماه اشتراک رایگان' },
        { level: 2, count: 6, reward: '۵۰٪ تخفیف پکیج' },
        { level: 3, count: 10, reward: 'یک پکیج رایگان' },
      ],
    },
    update: {},
  });

  console.log('✅ Seed complete');
  console.log('   Admin:', admin.email, '/', adminPass);
  console.log('   Teacher: teacher@lemontrade.com / Teacher@12345');
  console.log('   User: user@lemontrade.com / User@12345 (اشتراک فعال — 2FA در seed غیرفعال برای تست راحت)');
  console.log('   NoSub: nosub@lemontrade.com / NoSub@12345 (بدون اشتراک — تست محدودیت سیگنال)');
  console.log('   سیگنال‌های زنده نمونه: ۴ عدد ACTIVE + نمونه‌های بسته در صفحه اصلی');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
