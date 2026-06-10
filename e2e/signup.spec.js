// @ts-check
const { test, expect } = require('@playwright/test');
const { signup } = require('./helpers');

test('full signup flow reaches verify-email-pending', async ({ page }) => {
  const user = await signup(page);
  await expect(page).toHaveURL(/\/verify-email-pending/, { timeout: 15_000 });
  await expect(page.locator('body')).toContainText(/ایمیل|تأیید/i);
  await expect(page.locator('body')).not.toContainText(user.email);
});

test('signup rejects wrong captcha', async ({ page }) => {
  await page.goto('/signup');
  await page.locator('#captcha-question').waitFor({ state: 'visible' });
  const ts = Date.now();
  await page.locator('input[name="fullName"]').fill('Bad Captcha Test');
  await page.locator('input[name="email"]').fill(`bad_${ts}@lemontrade.com`);
  await page.locator('input[name="mobile"]').fill(`09${String(ts).slice(-9)}`);
  await page.locator('input[name="password"]').fill('Test@12345');
  await page.locator('input[name="passwordConfirm"]').fill('Test@12345');
  await page.locator('input[name="captcha"]').fill('99999');
  await page.locator('input[name="terms"]').check();
  await page.getByRole('button', { name: 'ثبت‌نام' }).click();
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.locator('body')).toContainText(/کپچا/i);
});

test('signup rejects password mismatch', async ({ page }) => {
  await page.goto('/signup');
  await page.locator('#captcha-question').waitFor({ state: 'visible' });
  const { getCaptchaAnswer } = require('./helpers');
  const captcha = await getCaptchaAnswer(page);
  const ts = Date.now();
  await page.locator('input[name="fullName"]').fill('Mismatch Test');
  await page.locator('input[name="email"]').fill(`mm_${ts}@lemontrade.com`);
  await page.locator('input[name="mobile"]').fill(`09${String(ts + 1).slice(-9)}`);
  await page.locator('input[name="password"]').fill('Test@12345');
  await page.locator('input[name="passwordConfirm"]').fill('Other@99999');
  await page.locator('input[name="captcha"]').fill(captcha);
  await page.locator('input[name="terms"]').check();
  await page.getByRole('button', { name: 'ثبت‌نام' }).click();
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.locator('body')).toContainText(/یکسان نیست/i);
});
