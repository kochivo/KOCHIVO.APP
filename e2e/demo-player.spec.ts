import { expect, test } from '@playwright/test';
import { createT } from '../src/core/i18n/messages';
import { formatNumber } from '../src/lib/format';
import { messages as home } from '../src/features/player-home/messages';
import { messages as workout } from '../src/features/workout/messages';
import { messages as ui } from '../src/ui/messages';
import { startDemo } from './support/demo';

test('demo player logs sets online and offline and syncs on reconnect', async ({ page, context }) => {
  await startDemo(page, 'player');
  await page.getByRole('link', { name: home.ar.startWorkout, exact: true }).click();
  const t = createT(workout, 'ar');
  const controls = createT(ui, 'ar');
  const weight = page.getByRole('status', { name: workout.ar.weightKg, exact: true });
  const before = await weight.innerText();
  await page.getByRole('button', {
    name: controls('increase', { controlLabel: workout.ar.weightKg }), exact: true,
  }).click();
  await expect(weight).not.toHaveText(before);
  await page.getByRole('button', { name: workout.ar.completeSet, exact: true }).click();
  await expect(page.getByRole('button', {
    name: t('editSet', { value0: formatNumber(1, 'ar') }), exact: true,
  })).toBeEnabled();
  await expect(page.getByRole('status').filter({ hasText: ui.ar.synced })).toBeVisible();
  await page.getByRole('button', { name: workout.ar.skip, exact: true }).click();
  await context.setOffline(true);
  try {
    await expect(page.getByRole('status').filter({ hasText: ui.ar.offline })).toBeVisible();
    await page.getByRole('button', {
      name: controls('increase', { controlLabel: workout.ar.reps }), exact: true,
    }).click();
    await page.getByRole('button', { name: workout.ar.completeSet, exact: true }).click();
    await expect(page.getByRole('button', {
      name: t('editSet', { value0: formatNumber(2, 'ar') }), exact: true,
    })).toBeEnabled();
  } finally {
    await context.setOffline(false);
  }
  await expect(page.getByRole('status').filter({ hasText: ui.ar.synced })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
