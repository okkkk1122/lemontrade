const path = require('path');
const { execSync } = require('child_process');
const request = require('supertest');
const { loginAgent } = require('./helpers');

let app;
let dbReady = false;
let sampleSignalId = null;
let liveSignalId = null;

beforeAll(async () => {
  app = require('../src/app');
  try {
    const prisma = require('../src/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    dbReady = true;
    const sig = await prisma.signal.findFirst({
      where: { isSample: true },
      orderBy: { createdAt: 'desc' },
    });
    sampleSignalId = sig?.id;
    const live = await prisma.signal.findFirst({
      where: { isSample: false, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    liveSignalId = live?.id;
  } catch {
    dbReady = false;
  }
});

afterAll(async () => {
  try {
    await require('../src/lib/prisma').$disconnect();
  } catch {}
});

describe('integration flows', () => {
  test('sample signal viewable without login', async () => {
    if (!dbReady || !sampleSignalId) return;
    const res = await request(app).get(`/signals/${sampleSignalId}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('نمونه');
  });

  test('live signals JSON API for subscribed user', async () => {
    if (!dbReady) return;
    const { agent } = await loginAgent(app, 'user@lemontrade.com', 'User@12345');
    const res = await agent.get('/signals/live?format=json');
    expect(res.status).toBe(200);
    expect(res.body.signals).toBeDefined();
    expect(Array.isArray(res.body.signals)).toBe(true);
  });

  test('settings API reflects DB (menu)', async () => {
    if (!dbReady) return;
    const res = await request(app).get('/api/menu/header');
    expect(res.status).toBe(200);
    const titles = res.body.map((m) => m.title);
    expect(titles).toContain('خانه');
  });

  test('contact page has support email from settings', async () => {
    if (!dbReady) return;
    const res = await request(app).get('/contact');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/lemontrade\.com/);
  });

  test('private live signal requires login', async () => {
    if (!dbReady || !liveSignalId) return;
    const res = await request(app).get(`/signals/${liveSignalId}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });

  test('teacher can view own live signal without subscription', async () => {
    if (!dbReady || !liveSignalId) return;
    const { agent } = await loginAgent(app, 'teacher@lemontrade.com', 'Teacher@12345');
    const res = await agent.get(`/signals/${liveSignalId}`);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/سیگنال/);
  });

  test('admin can view any live signal without subscription', async () => {
    if (!dbReady || !liveSignalId) return;
    const { agent } = await loginAgent(app, 'admin@lemontrade.com', 'Admin@12345');
    const res = await agent.get(`/signals/${liveSignalId}`);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/سیگنال/);
  });

  test('user without subscription cannot view live signal', async () => {
    if (!dbReady || !liveSignalId) return;
    const { agent } = await loginAgent(app, 'nosub@lemontrade.com', 'NoSub@12345');
    const res = await agent.get(`/signals/${liveSignalId}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/cart|subscription/);
  });

  test('seed does not reset admin site settings on restart', async () => {
    if (!dbReady) return;
    const prisma = require('../src/lib/prisma');
    const customName = `Persist-${Date.now()}`;
    const existing = await prisma.siteSetting.findUnique({ where: { id: 'main' } });
    const merged = { ...(existing?.data || {}), siteName: customName };
    await prisma.siteSetting.upsert({
      where: { id: 'main' },
      create: { id: 'main', data: merged },
      update: { data: merged },
    });
    execSync('node prisma/seed.js', {
      cwd: path.join(__dirname, '..'),
      env: process.env,
      stdio: 'pipe',
    });
    const after = await prisma.siteSetting.findUnique({ where: { id: 'main' } });
    expect(after.data.siteName).toBe(customName);
  });
});
