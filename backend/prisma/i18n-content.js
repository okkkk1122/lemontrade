/** Trilingual seed content — fa / ar / en */

const IMG = {
  hero: '/images/hero-trading.svg',
  signals: '/images/card-signals.svg',
  learn: '/images/card-learn.svg',
  invest: '/images/card-invest.svg',
  package: '/images/package-cover.svg',
  blog: '/images/blog-cover.svg',
  team: '/images/team-member.svg',
};

function tri(fa, ar, en) {
  return { fa, ar, en };
}

const sliderContent = [
  {
    sortOrder: 0,
    imageUrl: IMG.hero,
    buttonLink: '/signup',
    translations: {
      fa: {
        title: 'لیموترید — آموزش و سیگنال حرفه‌ای',
        subtitle: 'از صفر تا صد ترید با اساتید برتر',
        buttonText: 'شروع کنید',
      },
      ar: {
        title: 'ليموتريد — تعليم وإشارات احترافية',
        subtitle: 'من الصفر إلى الاحتراف مع أفضل المعلمين',
        buttonText: 'ابدأ الآن',
      },
      en: {
        title: 'Lemontrade — Pro Education & Signals',
        subtitle: 'From zero to pro with top trading mentors',
        buttonText: 'Get Started',
      },
    },
  },
  {
    sortOrder: 1,
    imageUrl: IMG.signals,
    buttonLink: '/signals/live',
    translations: {
      fa: { title: 'سیگنال‌های زنده', subtitle: 'با اشتراک هفتگی و احراز ۲FA', buttonText: 'مشاهده' },
      ar: { title: 'إشارات مباشرة', subtitle: 'اشتراك أسبوعي ومصادقة ثنائية', buttonText: 'عرض' },
      en: { title: 'Live Signals', subtitle: 'Weekly subscription with 2FA security', buttonText: 'View' },
    },
  },
];

const homeCardContent = [
  {
    sortOrder: 0,
    imageUrl: IMG.signals,
    buttonLink: '/signals/live',
    icon: '📈',
    translations: {
      fa: {
        title: 'سیگنال‌های زنده',
        description: 'سیگنال لحظه‌ای از اساتید با ۲FA و اشتراک',
        buttonText: 'مشاهده',
      },
      ar: {
        title: 'إشارات مباشرة',
        description: 'إشارات فورية من المعلمين مع المصادقة الثنائية',
        buttonText: 'عرض',
      },
      en: {
        title: 'Live Signals',
        description: 'Real-time signals from verified teachers with 2FA',
        buttonText: 'View',
      },
    },
  },
  {
    sortOrder: 1,
    imageUrl: IMG.learn,
    buttonLink: '/learn/zero-to-hundred',
    icon: '🎓',
    translations: {
      fa: {
        title: 'آموزش صفر تا صد',
        description: 'مسیر ۷ و ۱۰ مرحله‌ای ویدیویی',
        buttonText: 'شروع آموزش',
      },
      ar: {
        title: 'تعليم من الصفر',
        description: 'مسار تعليمي من ٧ و١٠ مراحل بالفيديو',
        buttonText: 'ابدأ التعلم',
      },
      en: {
        title: 'Zero to Pro Course',
        description: '7-step and 10-step video learning paths',
        buttonText: 'Start Learning',
      },
    },
  },
  {
    sortOrder: 2,
    imageUrl: IMG.invest,
    buttonLink: '/investment',
    icon: '💰',
    translations: {
      fa: {
        title: 'صندوق سرمایه‌گذاری',
        description: 'مدیریت حرفه‌ای سرمایه با شفافیت',
        buttonText: 'اطلاعات',
      },
      ar: {
        title: 'صندوق الاستثمار',
        description: 'إدارة احترافية وشفافة لرأس المال',
        buttonText: 'التفاصيل',
      },
      en: {
        title: 'Investment Fund',
        description: 'Transparent professional capital management',
        buttonText: 'Learn More',
      },
    },
  },
];

const headerMenuContent = [
  { link: '/', sortOrder: 0, translations: tri('خانه', 'الرئيسية', 'Home') },
  { link: '/learn/zero-to-hundred', sortOrder: 1, translations: tri('آموزش', 'التعليم', 'Learn') },
  { link: '/packages', sortOrder: 2, translations: tri('پکیج‌ها', 'الباقات', 'Packages') },
  { link: '/sessions', sortOrder: 3, translations: tri('جلسات زنده', 'جلسات مباشرة', 'Live Sessions') },
  { link: '/blog', sortOrder: 4, translations: tri('وبلاگ', 'المدونة', 'Blog') },
  { link: '/faq', sortOrder: 5, translations: tri('سوالات', 'الأسئلة', 'FAQ') },
  { link: '/about', sortOrder: 6, translations: tri('درباره ما', 'من نحن', 'About') },
  { link: '/contact', sortOrder: 7, translations: tri('تماس', 'اتصل بنا', 'Contact') },
];

const footerMenuContent = [
  { link: '/about', sortOrder: 0, translations: tri('درباره ما', 'من نحن', 'About') },
  { link: '/contact', sortOrder: 1, translations: tri('تماس', 'اتصل بنا', 'Contact') },
  { link: '/terms', sortOrder: 2, translations: tri('قوانین', 'الشروط', 'Terms') },
  { link: '/faq', sortOrder: 3, translations: tri('سوالات متداول', 'الأسئلة الشائعة', 'FAQ') },
];

const faqContent = [
  {
    sortOrder: 0,
    translations: {
      fa: {
        question: 'اشتراک هفتگی چقدر است؟',
        answer: '۱,۰۰۰,۰۰۰ تومان — قابل تغییر از پنل ادمین.',
      },
      ar: {
        question: 'كم تكلفة الاشتراك الأسبوعي؟',
        answer: '١,٠٠٠,٠٠٠ تومان — قابل للتعديل من لوحة الإدارة.',
      },
      en: {
        question: 'How much is the weekly subscription?',
        answer: '1,000,000 Toman — adjustable from the admin panel.',
      },
    },
  },
  {
    sortOrder: 1,
    translations: {
      fa: {
        question: 'برای سیگنال زنده چه لازم است؟',
        answer: 'ورود، ۲FA فعال و اشتراک فعال.',
      },
      ar: {
        question: 'ما المطلوب للإشارات المباشرة؟',
        answer: 'تسجيل الدخول، المصادقة الثنائية واشتراك نشط.',
      },
      en: {
        question: 'What do I need for live signals?',
        answer: 'Login, active 2FA, and an active subscription.',
      },
    },
  },
];

const blogPosts = [
  {
    slug: 'start-trading',
    coverImage: IMG.blog,
    translations: {
      fa: {
        title: 'چگونه ترید را شروع کنیم؟',
        excerpt: 'راهنمای گام‌به‌گام برای مبتدیان',
        content: '<p>در این مقاله با اصول شروع ترید آشنا می‌شوید.</p>',
        authorName: 'تیم لیموترید',
      },
      ar: {
        title: 'كيف تبدأ التداول؟',
        excerpt: 'دليل خطوة بخطوة للمبتدئين',
        content: '<p>في هذه المقالة تتعرف على أساسيات بدء التداول.</p>',
        authorName: 'فريق ليموتريد',
      },
      en: {
        title: 'How to Start Trading?',
        excerpt: 'A step-by-step guide for beginners',
        content: '<p>Learn the fundamentals of getting started in trading.</p>',
        authorName: 'Lemontrade Team',
      },
    },
  },
  {
    slug: 'gold-analysis',
    coverImage: IMG.blog,
    translations: {
      fa: {
        title: 'تحلیل هفتگی طلا',
        excerpt: 'بررسی روند XAU/USD',
        content: '<p>نمونه مقاله وبلاگ برای نمایش در سایت.</p>',
        authorName: 'استاد رضا کریمی',
      },
      ar: {
        title: 'تحليل أسبوعي للذهب',
        excerpt: 'مراجعة اتجاه XAU/USD',
        content: '<p>مقالة نموذجية لعرض المدونة على الموقع.</p>',
        authorName: 'الأستاذ رضا كريمي',
      },
      en: {
        title: 'Weekly Gold Analysis',
        excerpt: 'XAU/USD trend review',
        content: '<p>Sample blog article for the website.</p>',
        authorName: 'Teacher Reza Karimi',
      },
    },
  },
];

const blogComments = [
  {
    locale: 'fa',
    content: 'مقاله بسیار مفید بود، ممنون از تیم لیموترید!',
  },
  {
    locale: 'ar',
    content: 'مقال رائع جداً، شكراً لفريق ليموتريد!',
  },
  {
    locale: 'en',
    content: 'Very helpful article, thanks Lemontrade team!',
  },
];

const packageContent = {
  slug: 'forex-starter',
  coverImageUrl: IMG.package,
  price: 2500000,
  translations: {
    fa: {
      title: 'پکیج شروع فارکس',
      shortDesc: 'آموزش جامع ورود به فارکس',
      fullDesc: '<p>پکیج کامل برای مبتدیان</p>',
    },
    ar: {
      title: 'باقة بداية الفوركس',
      shortDesc: 'تعليم شامل لدخول سوق الفوركس',
      fullDesc: '<p>باقة كاملة للمبتدئين</p>',
    },
    en: {
      title: 'Forex Starter Package',
      shortDesc: 'Complete introduction to forex trading',
      fullDesc: '<p>Full package for beginners</p>',
    },
  },
};

const pageAbout = {
  title: 'درباره ما',
  content: '<p>لیموترید پلتفرم آموزش ترید و سیگنال‌دهی برای تریدرهای ایرانی است.</p>',
  data: {
    translations: {
      fa: {
        title: 'درباره ما',
        content: '<p>لیموترید پلتفرم آموزش ترید و سیگنال‌دهی برای تریدرهای ایرانی است.</p>',
      },
      ar: {
        title: 'من نحن',
        content: '<p>ليموتريد منصة لتعليم التداول والإشارات للمتداولين.</p>',
      },
      en: {
        title: 'About Us',
        content: '<p>Lemontrade is a trading education and signals platform for traders worldwide.</p>',
      },
    },
  },
};

const pageTerms = {
  title: 'قوانین',
  content: '<p>قوانین استفاده از خدمات لیموترید.</p>',
  data: {
    translations: {
      fa: { title: 'قوانین', content: '<p>قوانین استفاده از خدمات لیموترید.</p>' },
      ar: { title: 'الشروط', content: '<p>شروط استخدام خدمات ليموتريد.</p>' },
      en: { title: 'Terms', content: '<p>Terms of use for Lemontrade services.</p>' },
    },
  },
};

const pageContact = {
  title: 'تماس با ما',
  content: '<p>ایمیل: support@lemontrade.com<br/>تلفن: ۰۲۱-۹۱۰۰۰۰۰۰</p>',
  data: {
    translations: {
      fa: { title: 'تماس با ما', content: '<p>ایمیل: support@lemontrade.com<br/>تلفن: ۰۲۱-۹۱۰۰۰۰۰۰</p>' },
      ar: { title: 'اتصل بنا', content: '<p>البريد: support@lemontrade.com<br/>الهاتف: ۰۲۱-۹۱۰۰۰۰۰۰</p>' },
      en: { title: 'Contact Us', content: '<p>Email: support@lemontrade.com<br/>Phone: +98-21-91000000</p>' },
    },
  },
};

const teamContent = [
  {
    sortOrder: 0,
    photoUrl: IMG.team,
    translations: {
      fa: { name: 'رضا کریمی', role: 'مدیر آموزشی', bio: '۱۰ سال تجربه ترید' },
      ar: { name: 'رضا كريمي', role: 'مدير تعليمي', bio: '١٠ سنوات خبرة في التداول' },
      en: { name: 'Reza Karimi', role: 'Education Director', bio: '10 years of trading experience' },
    },
  },
  {
    sortOrder: 1,
    photoUrl: IMG.team,
    translations: {
      fa: { name: 'سارا احمدی', role: 'پشتیبانی', bio: 'پاسخگویی ۲۴/۷' },
      ar: { name: 'سارة أحمدي', role: 'الدعم', bio: 'دعم على مدار الساعة' },
      en: { name: 'Sara Ahmadi', role: 'Support Lead', bio: '24/7 customer support' },
    },
  },
];

function primaryFields(translations, fields) {
  const out = {};
  for (const f of fields) {
    out[f] = translations.fa?.[f] || translations.en?.[f] || translations.ar?.[f] || '';
  }
  return out;
}

module.exports = {
  IMG,
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
};
