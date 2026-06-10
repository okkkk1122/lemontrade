// @ts-check
const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test('unauthenticated /admin redirects to login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);
});

test('user login reaches dashboard', async ({ page }) => {
  await login(page, 'user@lemontrade.com', 'User@12345');
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('body')).toContainText(/داشبورد|اشتراک/i);
});

test('user cannot access admin', async ({ page }) => {
  await login(page, 'user@lemontrade.com', 'User@12345');
  const res = await page.goto('/admin');
  expect(res?.status()).toBe(403);
});

test('teacher login and panel', async ({ page }) => {
  await login(page, 'teacher@lemontrade.com', 'Teacher@12345');
  await page.goto('/teacher');
  await expect(page.locator('body')).toContainText(/پنل استاد|ثبت سیگنال/i);
});

test('admin login and dashboard sections', async ({ page }) => {
  await login(page, 'admin@lemontrade.com', 'Admin@12345');
  await page.goto('/admin');
  await expect(page.locator('body')).toContainText(/داشبورد|ادمین|کاربران/i);
  for (const path of ['/admin/users', '/admin/signals', '/admin/content']) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
  }
});

test('user without subscription blocked from live signal detail', async ({ page }) => {
  await login(page, 'teacher@lemontrade.com', 'Teacher@12345');
  await page.goto('/teacher');
  const viewHref = await page
    .locator('table.teacher-table tbody tr')
    .first()
    .getByRole('link', { name: 'مشاهده' })
    .getAttribute('href');
  expect(viewHref).toMatch(/\/signals\//);

  await page.goto('/logout');
  await login(page, 'nosub@lemontrade.com', 'NoSub@12345');
  await page.goto(viewHref);
  await expect(page).toHaveURL(/cart|subscription/);
});

test('logout returns to public site', async ({ page }) => {
  await login(page, 'user@lemontrade.com', 'User@12345');
  await page.goto('/logout');
  await expect(page).toHaveURL(/\//);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
