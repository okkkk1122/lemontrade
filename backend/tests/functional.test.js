const request = require('supertest');
const { loginAgent, extractCsrf } = require('./helpers');

let app;
let dbReady = false;

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

describe('functional flows', () => {
  test('contact form POST redirects with sent=1', async () => {
    if (!dbReady) return;
    const agent = request.agent(app);
    const page = await agent.get('/contact');
    const csrf = extractCsrf(page.text);
    const res = await agent.post('/contact').type('form').send({
      name: 'Jest QA',
      email: 'jest@test.local',
      subject: 'test',
      message: 'hello',
      _csrf: csrf,
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('sent=1');
  });

  test('user can add package to cart', async () => {
    if (!dbReady) return;
    const { agent } = await loginAgent(app, 'user@lemontrade.com', 'User@12345');
    const pkgPage = await agent.get('/packages');
    const pkgId = pkgPage.text.match(/name="packageId"\s+value="([^"]+)"/)?.[1];
    expect(pkgId).toBeTruthy();
    const csrf = extractCsrf(pkgPage.text);
    const add = await agent.post('/cart/add').type('form').send({
      packageId: pkgId,
      _csrf: csrf,
    });
    expect([302, 303]).toContain(add.status);
    const cart = await agent.get('/cart');
    expect(cart.status).toBe(200);
  });

  test('teacher can create signal', async () => {
    if (!dbReady) return;
    const { agent } = await loginAgent(app, 'teacher@lemontrade.com', 'Teacher@12345');
    const panel = await agent.get('/teacher');
    const csrf = extractCsrf(panel.text);
    const res = await agent.post('/teacher/signals').type('form').send({
      pairSymbol: 'GBP/USD',
      timeframe: '4h',
      tradeType: 'SELL',
      entryPrice: '1.2700',
      stopLoss: '1.2750',
      takeProfit1: '1.2600',
      analysis: 'jest functional test',
      _csrf: csrf,
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('created=1');
  });

  test('payment dev mode redirects to verify', async () => {
    if (!dbReady) return;
    const { agent } = await loginAgent(app, 'user@lemontrade.com', 'User@12345');
    const res = await agent.get('/payment/zarinpal?amount=50000');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/verify|zarinpal\.com/);
  });

  test('admin content slider multipart save passes CSRF', async () => {
    if (!dbReady) return;
    const { agent } = await loginAgent(app, 'admin@lemontrade.com', 'Admin@12345');
    const page = await agent.get('/admin/content');
    const csrf = extractCsrf(page.text);
    const sliderId = page.text.match(/action="\/admin\/content\/sliders\/([^"]+)"/)?.[1];
    if (!sliderId) return;
    const res = await agent
      .post(`/admin/content/sliders/${sliderId}`)
      .set('Content-Type', 'multipart/form-data')
      .field('_csrf', csrf)
      .field('title', 'QA Slider Title')
      .field('subtitle', 'sub')
      .field('sortOrder', '0')
      .field('isActive', 'true');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('saved=1');
  });

  test('admin settings persist after save', async () => {
    if (!dbReady) return;
    const { agent } = await loginAgent(app, 'admin@lemontrade.com', 'Admin@12345');
    const page = await agent.get('/admin/settings');
    const csrf = extractCsrf(page.text);
    const customName = `JestSettings-${Date.now()}`;
    const save = await agent.post('/admin/settings').type('form').send({
      siteName: customName,
      siteNameEn: 'lemontrade',
      footerCopyright: 'test footer',
      weeklySubscriptionPrice: '1000000',
      _csrf: csrf,
    });
    expect(save.status).toBe(302);
    expect(save.headers.location).toContain('saved=1');
    const again = await agent.get('/admin/settings');
    expect(again.text).toContain(customName);
    const home = await agent.get('/');
    expect(home.text).toContain(customName);

    const restorePage = await agent.get('/admin/settings');
    const restoreCsrf = extractCsrf(restorePage.text);
    await agent.post('/admin/settings').type('form').send({
      siteName: 'لیموترید',
      siteNameEn: 'lemontrade',
      footerCopyright: '© ۱۴۰۴ لیموترید — تمامی حقوق محفوظ است.',
      weeklySubscriptionPrice: '1000000',
      _csrf: restoreCsrf,
    });
  });

  test('learn progress accepts JSON with CSRF header', async () => {
    if (!dbReady) return;
    const prisma = require('../src/lib/prisma');
    const path = await prisma.learningPath.findFirst({ where: { type: 'SEVEN_STEPS' } });
    const step = path ? await prisma.learningStep.findFirst({ where: { pathId: path.id } }) : null;
    if (!step) return;
    const { agent } = await loginAgent(app, 'user@lemontrade.com', 'User@12345');
    const learn = await agent.get('/learn/zero-to-hundred');
    const csrf =
      learn.text.match(/name="csrf-token"\s+content="([^"]+)"/)?.[1] || extractCsrf(learn.text);
    const res = await agent
      .post('/learn/progress')
      .set('CSRF-Token', csrf)
      .send({ stepId: step.id, completed: true });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
