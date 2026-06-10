const { expect } = require('@playwright/test');

/** @param {import('@playwright/test').Page} page */
async function login(page, email, password) {
  await page.goto('/login');
  await page.locator('input[name="identifier"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form .btn-primary, form button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

/** @param {import('@playwright/test').Page} page */
async function getCaptchaAnswer(page) {
  const res = await page.request.get('/api/captcha');
  const json = await res.json();
  const m = String(json.question || '').match(/(\d+)\s*\+\s*(\d+)/);
  if (!m) throw new Error(`Cannot parse captcha: ${json.question}`);
  return String(Number(m[1]) + Number(m[2]));
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ fullName?: string, email?: string, mobile?: string, password?: string }} [overrides]
 */
async function signup(page, overrides = {}) {
  const ts = Date.now();
  const user = {
    fullName: overrides.fullName || `Playwright User ${ts}`,
    email: overrides.email || `pw_${ts}@lemontrade.com`,
    mobile: overrides.mobile || `09${String(ts).slice(-9)}`,
    password: overrides.password || 'Test@12345',
  };

  await page.goto('/signup');
  const questionEl = page.locator('#captcha-question');
  await questionEl.waitFor({ state: 'visible', timeout: 10_000 });
  await expect(questionEl).not.toHaveText('...', { timeout: 10_000 });
  const question = await questionEl.textContent();
  const m = String(question || '').match(/(\d+)\s*\+\s*(\d+)/);
  if (!m) throw new Error(`Cannot parse captcha UI: ${question}`);
  const captcha = String(Number(m[1]) + Number(m[2]));

  await page.locator('input[name="fullName"]').fill(user.fullName);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="mobile"]').fill(user.mobile);
  await page.locator('input[name="password"]').fill(user.password);
  await page.locator('input[name="passwordConfirm"]').fill(user.password);
  await page.locator('input[name="captcha"]').fill(captcha);
  await page.locator('input[name="terms"]').check();
  await page.getByRole('button', { name: 'ثبت‌نام' }).click();

  return user;
}

module.exports = { login, getCaptchaAnswer, signup };
