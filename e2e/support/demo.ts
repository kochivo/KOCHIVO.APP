import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages as demo } from '../../src/features/demo/messages';
import { messages as dashboard } from '../../src/features/dashboard/messages';
import { messages as roster } from '../../src/features/roster/messages';

export async function startDemo(page: Page, role: 'captain' | 'player' = 'captain') {
  await page.goto('/ar/demo');
  await expect(page.getByRole('heading', { name: demo.ar.tryTheDemo })).toBeVisible();
  const open = page.getByRole('button', { name: role === 'player' ? demo.ar.tryAsPlayer : demo.ar.openDemo, exact: true });
  const captcha = page.getByLabel(demo.ar.verifyYouReHuman, { exact: true });
  // The widget loads dynamically. Wait for either the widget or its unblocked action.
  await expect(async () => {
    expect(await captcha.count() > 0 || await open.isEnabled()).toBe(true);
  }).toPass({ timeout: 20_000 });
  test.skip(await captcha.count() > 0, 'Turnstile is configured on the demo. Automated tests must not solve or bypass it.');
  await open.click();
  await expect(page).toHaveURL(new RegExp(`/ar/${role}/?$`));
  if (role === 'captain') await expect(page.getByText(dashboard.ar.intro, { exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: demo.ar.demoMode })).toBeVisible();
}

export async function openPlayerProfile(page: Page) {
  await page.getByRole('navigation', { name: roster.ar.captainMenu })
    .getByRole('link', { name: roster.ar.players, exact: true }).click();
  await expect(page.getByRole('heading', { name: roster.ar.players, exact: true })).toBeVisible();
  const table = page.getByRole('table', { name: roster.ar.players });
  // Exclude the row actions, then choose a profile by its accessible name.
  const profiles = table.getByRole('link').filter({ hasNotText: new RegExp(
    [roster.ar.programs, roster.ar.nutrition, roster.ar.viewAsPlayer].join('|'),
  ) });
  await expect(profiles).toHaveCount(8);
  const [name] = (await profiles.allTextContents()).sort();
  if (!name) throw new Error('Demo roster has no player profile');
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}
