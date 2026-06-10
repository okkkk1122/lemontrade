// @ts-check
const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test('user views live signals with subscription', async ({ page }) => {
  await login(page, 'user@lemontrade.com', 'User@12345');
  await page.goto('/signals/live');
  await expect(page.locator('body')).toContainText(/سیگنال|اشتراک/i);
});

test('contact form submission', async ({ page }) => {
  await page.goto('/contact');
  await page.locator('input[name="name"]').fill('Playwright QA');
  await page.locator('input[name="email"]').fill('pw@test.local');
  await page.locator('input[name="subject"]').fill('تست E2E');
  await page.locator('textarea[name="message"]').fill('پیام تست playwright');
  await page.getByRole('button', { name: 'ارسال' }).click();
  await expect(page).toHaveURL(/sent=1/);
  await expect(page.locator('body')).toContainText(/ارسال شد/i);
});

test('signup page shows captcha', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.locator('#captcha-question')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('input[name="captcha"]')).toBeVisible();
});

test('teacher can open signal form', async ({ page }) => {
  await login(page, 'teacher@lemontrade.com', 'Teacher@12345');
  await page.goto('/teacher');
  const toggle = page.locator('#toggle-signal-form');
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(page.locator('#new-signal-form')).toBeVisible();
    await expect(page.locator('select[name="pairSymbol"]')).toBeVisible();
  }
});

test('cart page for logged-in user', async ({ page }) => {
  await login(page, 'user@lemontrade.com', 'User@12345');
  await page.goto('/cart');
  expect((await page.goto('/cart'))?.status()).toBe(200);
  await expect(page.locator('body')).toContainText(/سبد/i);
});

test('wallet page loads', async ({ page }) => {
  await login(page, 'user@lemontrade.com', 'User@12345');
  await page.goto('/wallet');
  await expect(page.locator('body')).toContainText(/کیف پول|موجودی/i);
});
