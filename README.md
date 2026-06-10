# لیموترید (lemontrade)

پلتفرم آموزش ترید، سیگنال زنده، فروش پکیج و صندوق سرمایه‌گذاری — فارسی RTL.

## ساختار ماژولار

```
limootrade/
├── backend/                 # Node.js + Express + Prisma
│   ├── prisma/              # Schema و seed
│   └── src/modules/         # ماژول‌های جدا: auth, signals, admin, ...
├── frontend/
│   ├── public/              # CSS, JS, لوگو، آپلودها
│   └── views/               # قالب EJS (صفحات + پنل ادمین)
├── docker-compose.yml
└── Dockerfile
```

## اجرا با Docker Desktop

1. Docker Desktop را باز کنید.
2. در پوشه پروژه:

```bash
docker compose up --build
```

3. مرورگر: **http://localhost:3010**

> **توجه:** تنظیمات پنل ادمین در دیتابیس PostgreSQL ذخیره می‌شوند و بعد از restart کانتینر حفظ می‌مانند. اگر تغییرات برمی‌گردند، یک‌بار `docker compose up --build -d` بزنید تا نسخه اصلاح‌شده seed اعمال شود.

### تست خودکار

```bash
# همه تست‌ها (QA + Jest + Playwright + Load)
npm install
cd backend && npm install && cd ..
node scripts/run-all-tests.mjs

# فقط Jest
cd backend && npm test

# فقط Playwright E2E (مرورگر)
npm run test:e2e

# بدون Playwright
SKIP_PLAYWRIGHT=1 node scripts/run-all-tests.mjs
```

Suiteها: `qa-audit` (66)، `qa-security`، `qa-functional`، `qa-forms`، `qa-load`، `e2e-extended`، Jest (36)، Playwright E2E (35 — ثبت‌نام، محدودیت اشتراک، سیگنال استاد، ادمین).

### قابلیت‌های تست‌شده اخیر

- CSRF روی همه فرم‌ها (از جمله multipart سیگنال استاد)
- Fallback زرین‌پال در sandbox
- استاد بدون اشتراک می‌تواند سیگنال خودش را ببیند
- آپلود تصویر چارت در ثبت و ویرایش سیگنال

## حساب‌های پیش‌فرض (بعد از seed)

| نقش | ایمیل | رمز |
|-----|--------|-----|
| ادمین | admin@lemontrade.com | Admin@12345 |
| استاد | teacher@lemontrade.com | Teacher@12345 |
| کاربر (با اشتراک) | user@lemontrade.com | User@12345 |
| کاربر (بدون اشتراک) | nosub@lemontrade.com | NoSub@12345 |

## توسعه محلی (بدون Docker)

```bash
cd backend
npm install
cp ../.env.example ../.env
# PostgreSQL را اجرا کنید و DATABASE_URL را تنظیم کنید
npx prisma db push
npm run db:seed
npm run dev
```

## CI (GitHub Actions)

روی هر push/PR به `main` یا `master`، workflow در `.github/workflows/ci.yml` اجرا می‌شود:
Docker Compose → نصب وابستگی‌ها → Playwright → `node scripts/run-all-tests.mjs`

## پشتیبان‌گیری دیتابیس

```powershell
# Windows
.\scripts\backup-db.ps1
```

```bash
# Linux / macOS
sh scripts/backup-db.sh
```

فایل SQL در پوشه `backups/` ذخیره می‌شود.

## استقرار production

1. `.env.production.example` را به `.env` کپی کنید و مقادیر واقعی را تنظیم کنید.
2. `DOMAIN`، `SESSION_SECRET` و `POSTGRES_PASSWORD` را تنظیم کنید.
3. با Caddy (HTTPS خودکار):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

4. فقط محلی بدون HTTPS: `docker compose up -d --build`

متغیر `SKIP_SEED=true` در کانتینر app مانع اجرای seed در startup می‌شود (فقط برای محیط‌های خاص).

اسکریپت `backend/docker/entrypoint.sh` مرجع شل است؛ در Docker از CMD داخلی استفاده می‌شود تا روی Windows مشکل خط‌پایان (CRLF) نداشته باشد.

## تنظیمات مهم (.env)

- `ZARINPAL_MERCHANT` — درگاه زرین‌پال
- `SMTP_*` — ایمیل تأیید و بازیابی رمز
- `SESSION_SECRET` — حداقل ۳۲ کاراکتر در production

## صفحات پیاده‌سازی‌شده

- عمومی: خانه، ثبت‌نام، ورود، ۲FA، آموزش ۷/۱۰ مرحله، پکیج‌ها، سبد، درباره، تماس، قوانین، FAQ، وبلاگ، جلسات
- کاربر: داشبورد، سیگنال زنده/گذشته، کیف پول، پروفایل، پشتیبانی، معرفی، سرمایه‌گذاری، پکیج‌های من
- استاد: پنل استاد و ثبت سیگنال
- ادمین: داشبورد، کاربران، اساتید، سیگنال‌ها، اشتراک، پکیج، محتوا، وبلاگ، جلسات، تیکت، سرمایه‌گذاری، تنظیمات

## تم‌ها

سه تم در هدر: **روشن**، **تیره** (پیش‌فرض)، **رنگی** (زرد/لیمو برند)
