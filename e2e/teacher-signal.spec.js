// @ts-check
const path = require('path');
const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

const chartFixture = path.join(__dirname, 'fixtures', 'test-chart.png');

test('teacher submits live signal successfully', async ({ page }) => {
  await login(page, 'teacher@lemontrade.com', 'Teacher@12345');
  await page.goto('/teacher');

  const pair = 'EUR/USD';
  const entry = '1.0910';
  const uniqueTag = `PW-${Date.now()}`;

  await page.locator('#toggle-signal-form').click();
  await expect(page.locator('#new-signal-form')).toBeVisible();

  await page.locator('select[name="pairSymbol"]').selectOption(pair);
  await page.locator('select[name="timeframe"]').selectOption('1h');
  await page.locator('select[name="tradeType"]').selectOption('BUY');
  await page.locator('input[name="entryPrice"]').fill(entry);
  await page.locator('input[name="stopLoss"]').fill('1.0880');
  await page.locator('input[name="takeProfit1"]').fill('1.0950');
  await page.locator('textarea[name="analysis"]').fill(`Playwright E2E signal ${uniqueTag}`);

  await page.getByRole('button', { name: 'انتشار سیگنال زنده' }).click();

  await expect(page).toHaveURL(/\/teacher\?created=1/, { timeout: 15_000 });
  await expect(page.locator('.alert-success')).toContainText(/ثبت شد/i);
  const firstRow = page.locator('table.teacher-table tbody tr').first();
  await expect(firstRow).toContainText(pair);
  await expect(firstRow).toContainText('1.091');
});

test('subscribed user sees new teacher signal on live page', async ({ page }) => {
  const pair = 'GBP/USD';
  const entry = '1.2710';
  const tag = `PW-LIVE-${Date.now()}`;

  await login(page, 'teacher@lemontrade.com', 'Teacher@12345');
  await page.goto('/teacher');
  await page.locator('#toggle-signal-form').click();
  await page.locator('select[name="pairSymbol"]').selectOption(pair);
  await page.locator('select[name="timeframe"]').selectOption('4h');
  await page.locator('select[name="tradeType"]').selectOption('SELL');
  await page.locator('input[name="entryPrice"]').fill(entry);
  await page.locator('input[name="stopLoss"]').fill('1.2750');
  await page.locator('input[name="takeProfit1"]').fill('1.2650');
  await page.locator('textarea[name="analysis"]').fill(tag);
  await page.getByRole('button', { name: 'انتشار سیگنال زنده' }).click();
  await expect(page).toHaveURL(/created=1/);

  await page.goto('/logout');
  await login(page, 'user@lemontrade.com', 'User@12345');
  await page.goto('/signals/live');
  await expect(page.locator('body')).toContainText(pair);
});

test('teacher submits signal with chart image upload', async ({ page }) => {
  const pair = 'USD/JPY';
  const entry = '149.50';
  const tag = `PW-CHART-${Date.now()}`;

  await login(page, 'teacher@lemontrade.com', 'Teacher@12345');
  await page.goto('/teacher');
  await page.locator('#toggle-signal-form').click();
  const form = page.locator('#new-signal-form');

  await form.locator('select[name="pairSymbol"]').selectOption(pair);
  await form.locator('select[name="timeframe"]').selectOption('1h');
  await form.locator('select[name="tradeType"]').selectOption('BUY');
  await form.locator('input[name="entryPrice"]').fill(entry);
  await form.locator('input[name="stopLoss"]').fill('149.00');
  await form.locator('input[name="takeProfit1"]').fill('150.00');
  await form.locator('textarea[name="analysis"]').fill(tag);
  await form.locator('input[name="chart"]').setInputFiles(chartFixture);

  await form.getByRole('button', { name: 'انتشار سیگنال زنده' }).click();
  await expect(page).toHaveURL(/\/teacher\?created=1/, { timeout: 15_000 });

  const signalRow = page.locator('table.teacher-table tbody tr', { hasText: pair }).first();
  await signalRow.getByRole('link', { name: 'ویرایش' }).click();
  await expect(page.locator('#edit-signal-form a', { hasText: 'مشاهده' })).toHaveAttribute(
    'href',
    /\/uploads\/signal-/
  );

  await page.goto('/teacher');
  await signalRow.getByRole('link', { name: 'مشاهده' }).click();
  await expect(page).toHaveURL(/\/signals\//);
  await expect(page.locator('img[alt="چارت"]')).toHaveAttribute('src', /\/uploads\/signal-/);
});

test('teacher views own live signal detail without subscription', async ({ page }) => {
  await login(page, 'teacher@lemontrade.com', 'Teacher@12345');
  await page.goto('/teacher');
  const viewHref = await page
    .locator('table.teacher-table tbody tr')
    .first()
    .getByRole('link', { name: 'مشاهده' })
    .getAttribute('href');
  await page.goto(viewHref);
  await expect(page).toHaveURL(/\/signals\//);
  await expect(page.locator('h1')).toContainText(/سیگنال/);
  await expect(page).not.toHaveURL(/cart|setup-2fa|login/);
});

test('teacher edits signal and uploads new chart image', async ({ page }) => {
  const pair = 'EUR/USD';
  const entry = '1.0920';
  const tag = `PW-EDIT-${Date.now()}`;

  await login(page, 'teacher@lemontrade.com', 'Teacher@12345');
  await page.goto('/teacher');
  await page.locator('#toggle-signal-form').click();
  const form = page.locator('#new-signal-form');

  await form.locator('select[name="pairSymbol"]').selectOption(pair);
  await form.locator('select[name="timeframe"]').selectOption('1h');
  await form.locator('select[name="tradeType"]').selectOption('BUY');
  await form.locator('input[name="entryPrice"]').fill(entry);
  await form.locator('input[name="stopLoss"]').fill('1.0890');
  await form.locator('input[name="takeProfit1"]').fill('1.0960');
  await form.locator('textarea[name="analysis"]').fill(tag);
  await form.getByRole('button', { name: 'انتشار سیگنال زنده' }).click();
  await expect(page).toHaveURL(/created=1/);

  const signalRow = page.locator('table.teacher-table tbody tr', { hasText: pair }).first();
  await signalRow.getByRole('link', { name: 'ویرایش' }).click();
  await page.locator('#edit-signal-form textarea[name="analysis"]').fill(`${tag} — updated`);
  await page.locator('#edit-signal-form input[name="chart"]').setInputFiles(chartFixture);
  await page.locator('#edit-signal-form').getByRole('button', { name: 'ذخیره' }).click();

  await expect(page).toHaveURL(/\/teacher\?updated=1/, { timeout: 15_000 });
  await expect(page.locator('.alert-success')).toContainText(/به‌روزرسانی شد/i);

  await signalRow.getByRole('link', { name: 'ویرایش' }).click();
  await expect(page.locator('#edit-signal-form a', { hasText: 'مشاهده' })).toHaveAttribute(
    'href',
    /\/uploads\/signal-/
  );
});
