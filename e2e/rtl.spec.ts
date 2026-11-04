import { expect, test } from '@playwright/test';
import { playerDemoUnavailable, startDemo } from './support/demo';

test('Arabic captain dashboard has no horizontal overflow on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'edge-mobile', 'Overflow coverage uses the mobile viewport.');
  await startDemo(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('Arabic demo player home has no horizontal overflow on mobile', async ({ page }) => {
  test.skip(true, playerDemoUnavailable);
  await startDemo(page);
  await page.goto('/ar/player');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
