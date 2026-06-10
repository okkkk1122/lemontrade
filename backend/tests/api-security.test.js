const request = require('supertest');
const { extractCsrf } = require('./helpers');

let app;

beforeAll(() => {
  app = require('../src/app');
});

describe('API endpoints', () => {
  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, service: 'lemontrade', nameFa: 'لیموترید' });
  });

  test('GET /api/captcha returns question', async () => {
    const res = await request(app).get('/api/captcha');
    expect(res.status).toBe(200);
    expect(res.body.question).toMatch(/\d+ \+ \d+ = \?/);
  });

  test('GET /api/menu/header', async () => {
    let dbOk = false;
    try {
      await require('../src/lib/prisma').$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {}
    if (!dbOk) return;
    const res = await request(app).get('/api/menu/header');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('security', () => {
  test('POST /login without CSRF returns 403', async () => {
    const res = await request(app).post('/login').type('form').send({
      identifier: 'admin@lemontrade.com',
      password: 'Admin@12345',
    });
    expect(res.status).toBe(403);
  });

  test('invalid login credentials return 400', async () => {
    const agent = request.agent(app);
    const page = await agent.get('/login');
    const csrf = extractCsrf(page.text);
    const res = await agent.post('/login').type('form').send({
      identifier: 'admin@lemontrade.com',
      password: 'wrong-password',
      _csrf: csrf,
    });
    expect(res.status).toBe(400);
  });

  test('SQLi in login rejected', async () => {
    const agent = request.agent(app);
    const page = await agent.get('/login');
    const csrf = extractCsrf(page.text);
    const res = await agent.post('/login').type('form').send({
      identifier: "' OR 1=1--",
      password: 'x',
      _csrf: csrf,
    });
    expect(res.status).toBe(400);
  });
});
