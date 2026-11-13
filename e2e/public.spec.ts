import { expect, test } from '@playwright/test';
import { messages as marketing } from '../src/features/marketing/messages';
import { messages as auth } from '../src/features/auth/messages';
import { messages as ui } from '../src/ui/messages';

test('Arabic landing hero and phone header work', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.getByRole('heading', { level: 1, name: marketing.ar.sloganLabel })).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.setViewportSize({ width: 360, height: 851 });
    await expect(page.locator('header nav')).toBeHidden();
    const header = page.locator('header');
    await expect(header.getByRole('group', { name: ui.ar.language })).toBeVisible();
    await expect(header.getByRole('button', { name: /English/ })).toBeVisible();
    await expect(header.getByRole('button', { name: ui.ar.themeCycle.split('{current}')[0] })).toBeVisible();
    await expect(header.getByRole('link', { name: marketing.ar.login, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const controls = await header.locator('button, a:visible').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    }));
    for (const control of controls) {
      expect(control.height).toBeGreaterThanOrEqual(48);
      expect(control.width).toBeGreaterThanOrEqual(48);
    }
    expect(Math.max(...controls.map(control => control.top))).toBeLessThan(Math.min(...controls.map(control => control.bottom)));
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
