const request = require('supertest');
const { loginAgent } = require('./helpers');

let app;
let dbReady = false;

const PROTECTED_UNAUTH = [
  '/dashboard',
  '/signals/live',
  '/signals/past',
  '/cart',
  '/wallet',
  '/profile',
  '/support',
  '/referrals',
  '/investment',
  '/teacher',
  '/admin',
];

beforeAll(async () => {
  app = require('../src/app');
  try {
    await require('../src/lib/prisma').$queryRaw`SELECT 1`;
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

describe('unauthenticated access', () => {
  test('protected routes redirect to login', async () => {
    for (const path of PROTECTED_UNAUTH) {
      const res = await request(app).get(path);
      expect([302, 303]).toContain(res.status);
    }
  });
});

describe('user role', () => {
  test('user can access dashboard and live signals', async () => {
    if (!dbReady) return;
    const { agent, status } = await loginAgent(app, 'user@lemontrade.com', 'User@12345');
    expect(status).toBe(302);
    expect((await agent.get('/dashboard')).status).toBe(200);
    expect((await agent.get('/signals/live')).status).toBe(200);
    expect((await agent.get('/signals/past')).status).toBe(200);
    expect((await agent.get('/cart')).status).toBe(200);
    expect((await agent.get('/wallet')).status).toBe(200);
    expect((await agent.get('/support')).status).toBe(200);
  });

  test('user denied admin and teacher', async () => {
    if (!dbReady) return;
    const { agent } = await loginAgent(app, 'user@lemontrade.com', 'User@12345');
    expect((await agent.get('/admin')).status).toBe(403);
    expect((await agent.get('/teacher')).status).toBe(403);
  });
});

describe('teacher role', () => {
  test('teacher can access teacher panel', async () => {
    if (!dbReady) return;
    const { agent, status } = await loginAgent(app, 'teacher@lemontrade.com', 'Teacher@12345');
    expect(status).toBe(302);
    const panel = await agent.get('/teacher');
    expect(panel.status).toBe(200);
    expect(panel.text).toContain('پنل استاد');
  });

  test('teacher denied admin', async () => {
    if (!dbReady) return;
    const { agent } = await loginAgent(app, 'teacher@lemontrade.com', 'Teacher@12345');
    expect((await agent.get('/admin')).status).toBe(403);
  });

  test('teacher can view own live signal without subscription', async () => {
    if (!dbReady) return;
    const prisma = require('../src/lib/prisma');
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@lemontrade.com' },
      include: { teacherProfile: true },
    });
    const ownSignal = await prisma.signal.findFirst({
      where: { teacherId: teacher.teacherProfile.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    if (!ownSignal) return;

    const { agent } = await loginAgent(app, 'teacher@lemontrade.com', 'Teacher@12345');
    const res = await agent.get(`/signals/${ownSignal.id}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(ownSignal.pairSymbol);
    expect(res.headers.location).toBeUndefined();
  });
});

describe('admin role', () => {
  const ADMIN_PAGES = [
    '/admin',
    '/admin/settings',
    '/admin/content',
    '/admin/users',
    '/admin/teachers',
    '/admin/signals',
    '/admin/pairs',
    '/admin/subscriptions',
    '/admin/packages',
    '/admin/blog',
    '/admin/sessions',
    '/admin/tickets',
    '/admin/investments',
  ];

  test('admin can access all admin sections', async () => {
    if (!dbReady) return;
    const { agent, status } = await loginAgent(app, 'admin@lemontrade.com', 'Admin@12345');
    expect(status).toBe(302);
    for (const path of ADMIN_PAGES) {
      const res = await agent.get(path);
      expect(res.status).toBe(200);
    }
  });
});
