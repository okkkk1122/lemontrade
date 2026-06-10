// @ts-check
const { test, expect } = require('@playwright/test');

const PUBLIC = [
  { path: '/', title: /لیموترید|lemontrade/i },
  { path: '/about', title: /درباره/i },
  { path: '/contact', title: /تماس/i },
  { path: '/packages', title: /پکیج/i },
  { path: '/blog', title: /وبلاگ/i },
  { path: '/faq', title: /سوالات/i },
  { path: '/login', title: /ورود/i },
  { path: '/signup', title: /ثبت/i },
  { path: '/forgot-password', title: /فراموشی/i },
];

for (const { path, title } of PUBLIC) {
  test(`public page ${path} loads`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(title);
  });
}

test('homepage has brand and navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText('لیموترید');
  await expect(page.getByRole('link', { name: /خانه/i }).first()).toBeVisible();
});

test('homepage shows social network image icons', async ({ page }) => {
  await page.goto('/');
  const icons = page.locator('.site-header .social-icons img');
  await expect(icons.first()).toBeVisible();
  expect(await icons.count()).toBeGreaterThanOrEqual(3);
  await expect(icons.first()).toHaveAttribute('src', /\/icons\/social\//);
});

test('theme toggle works', async ({ page }) => {
  await page.goto('/');
  const dark = page.getByRole('button', { name: 'تیره' });
  if (await dark.isVisible()) {
    await dark.click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', /dark|color/);
  }
});

test('404 page', async ({ page }) => {
  const res = await page.goto('/page-not-found-xyz-123');
  expect(res?.status()).toBe(404);
});
