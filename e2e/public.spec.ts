import { expect, test } from '@playwright/test';
import { messages as marketing } from '../src/features/marketing/messages';
import { messages as auth } from '../src/features/auth/messages';

test('Arabic landing hero and mobile menu work', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.getByRole('heading', { level: 1, name: marketing.ar.sloganLabel })).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    const menu = page.getByRole('navigation', { name: marketing.ar.openMenu });
    await page.getByRole('button', { name: marketing.ar.openMenu, exact: true }).click();
    await expect(menu).toBeVisible();
    await expect(page.getByRole('button', { name: marketing.ar.closeMenu })).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('button', { name: marketing.ar.closeMenu }).click();
    await expect(menu).toBeHidden();
    await expect(page.getByRole('button', { name: marketing.ar.openMenu, exact: true })).toHaveAttribute('aria-expanded', 'false');
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
