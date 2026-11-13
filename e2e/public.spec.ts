import { expect, test } from '@playwright/test';
import { messages as marketing } from '../src/features/marketing/messages';
import { messages as auth } from '../src/features/auth/messages';

test('Arabic landing hero and phone header work', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.getByRole('heading', { level: 1, name: marketing.ar.sloganLabel })).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    // Phones keep only the logo and the primary action in the header.
    await expect(page.locator('header nav')).toBeHidden();
    await expect(page.locator('header').getByRole('button')).toBeVisible();
  }
});

test('English landing uses English and LTR', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1, name: marketing.en.sloganLabel })).toBeVisible();
  await expect(page.getByText(marketing.en.forOnlineCoaches, { exact: true })).toBeVisible();
});

test('Open Graph image is served as PNG', async ({ request }) => {
  const response = await request.get('/opengraph-image');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toMatch(/^image\/png(?:;|$)/);
});

test('Arabic login exposes the email field', async ({ page }) => {
  await page.goto('/ar/login');
  await expect(page.getByRole('textbox', { name: auth.ar.email, exact: true })).toBeVisible();
});
