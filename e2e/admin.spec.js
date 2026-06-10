// @ts-check
const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test('admin navigates content and users sections', async ({ page }) => {
  await login(page, 'admin@lemontrade.com', 'Admin@12345');

  await page.goto('/admin');
  await expect(page.locator('h1')).toContainText(/داشبورد/i);

  await page.goto('/admin/content');
  await expect(page.locator('body')).toContainText(/اسلایدر|محتوا/i);
  await expect(page.locator('form[action*="/admin/content"]')).toHaveCount(await page.locator('form[action*="/admin/content"]').count());
  const broken = await page.locator('form[action*="csrf-field"]').count();
  expect(broken).toBe(0);

  await page.goto('/admin/users');
  await expect(page.locator('h1')).toContainText(/کاربران/i);

  await page.goto('/admin/pairs');
  await expect(page.locator('body')).toContainText(/جفت|ارز/i);
});

test('admin settings persist after save and reload', async ({ page }) => {
  await login(page, 'admin@lemontrade.com', 'Admin@12345');
  await page.goto('/admin/settings');
  const customName = `PW-Admin-${Date.now()}`;
  await page.locator('input[name="siteName"]').fill(customName);
  await page.getByRole('button', { name: 'ذخیره تنظیمات' }).click();
  await expect(page).toHaveURL(/saved=1/);
  await page.reload();
  await expect(page.locator('input[name="siteName"]')).toHaveValue(customName);
  await page.goto('/');
  await expect(page.locator('body')).toContainText(customName);

  await page.goto('/admin/settings');
  await page.locator('input[name="siteName"]').fill('لیموترید');
  await page.getByRole('button', { name: 'ذخیره تنظیمات' }).click();
  await expect(page).toHaveURL(/saved=1/);
});

test('admin can view signals management', async ({ page }) => {
  await login(page, 'admin@lemontrade.com', 'Admin@12345');
  await page.goto('/admin/signals');
  await expect(page.locator('body')).toContainText(/سیگنال/i);
  await expect(page.locator('form[action*="/status"]').first()).toBeVisible();
});
