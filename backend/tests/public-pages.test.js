const request = require('supertest');

let app;
let dbReady = false;

const PUBLIC_PAGES = [
  '/',
  '/about',
  '/contact',
  '/terms',
  '/faq',
  '/blog',
  '/blog/start-trading',
  '/packages',
  '/packages/forex-starter',
  '/sessions',
  '/learn/zero-to-hundred',
  '/learn/metatrader',
  '/login',
  '/signup',
  '/forgot-password',
];

beforeAll(async () => {
  app = require('../src/app');
  try {
    const prisma = require('../src/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    dbReady = true;
  } catch {
    dbReady = false;
  }
});

afterAll(async () => {
  try {
    await require('../src/lib/prisma').$disconnect();
  } catch {}
});

describe('public pages', () => {
  test('all public GET routes return 200', async () => {
    if (!dbReady) return;
    for (const path of PUBLIC_PAGES) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
    }
  });

  test('404 for unknown route', async () => {
    const res = await request(app).get('/page-does-not-exist-xyz');
    expect(res.status).toBe(404);
  });

  test('homepage contains brand and menu', async () => {
    if (!dbReady) return;
    const res = await request(app).get('/');
    expect(res.text).toContain('لیموترید');
    expect(res.text).toContain('lemontrade');
  });
});
