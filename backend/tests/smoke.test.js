const request = require('supertest');
const { extractCsrf } = require('./helpers');

let app;
let dbReady = false;

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
    const prisma = require('../src/lib/prisma');
    await prisma.$disconnect();
  } catch {}
});

describe('lemontrade smoke tests', () => {
  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('lemontrade');
  });

  test('GET /signup renders', async () => {
    const res = await request(app).get('/signup');
    expect(res.status).toBe(200);
    expect(res.text).toContain('ثبت‌نام');
    expect(extractCsrf(res.text)).toBeTruthy();
  });

  test('GET public pages', async () => {
    if (!dbReady) return;
    for (const path of ['/', '/about', '/login', '/packages']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
    }
  });

  test('protected routes redirect', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(302);
  });

  test('admin login and dashboard', async () => {
    if (!dbReady) return;
    const agent = request.agent(app);
    const loginPage = await agent.get('/login');
    const csrf = extractCsrf(loginPage.text);
    const res = await agent
      .post('/login')
      .type('form')
      .send({ identifier: 'admin@lemontrade.com', password: 'Admin@12345', _csrf: csrf });
    expect(res.status).toBe(302);
    const admin = await agent.get('/admin');
    expect(admin.status).toBe(200);
  });

  test('user blocked from admin', async () => {
    if (!dbReady) return;
    const agent = request.agent(app);
    const loginPage = await agent.get('/login');
    const csrf = extractCsrf(loginPage.text);
    await agent
      .post('/login')
      .type('form')
      .send({ identifier: 'user@lemontrade.com', password: 'User@12345', _csrf: csrf });
    const res = await agent.get('/admin');
    expect(res.status).toBe(403);
  });

  test('POST without CSRF rejected', async () => {
    const res = await request(app).post('/login').type('form').send({
      identifier: 'admin@lemontrade.com',
      password: 'Admin@12345',
    });
    expect(res.status).toBe(403);
  });
});
