import { expect, test } from '@playwright/test';
import { messages as profile } from '../src/features/player-profile/messages';
import { messages as programs } from '../src/features/programs/messages';
import { openPlayerProfile, startDemo } from './support/demo';

test('captain opens a player program and adds a library exercise with feedback', async ({ page }) => {
  await startDemo(page);
  await openPlayerProfile(page);
  await page.getByRole('link', { name: profile.ar['tab.plan'], exact: true }).click();
  const program = page.getByRole('heading', { name: profile.ar.program, exact: true });
  await expect(program).toBeVisible();
  await page.getByRole('link', { name: profile.ar.edit, exact: true })
    .and(page.locator('a[href$="/programs"]')).click();
  await expect(page.getByRole('heading', { name: programs.ar.programs, exact: true })).toBeVisible();
  const active = page.getByRole('link').filter({ hasText: programs.ar.active });
  await expect(active).toHaveCount(1);
  await active.click();
  await page.getByRole('button', { name: programs.ar.addExercise, exact: true }).click();
  const library = page.getByRole('dialog', { name: programs.ar.exerciseLibrary });
  const choices = library.getByRole('listitem').getByRole('button', { name: new RegExp(`${programs.ar.add}$`) });
  await expect(choices).not.toHaveCount(0);
  const [label] = (await choices.allTextContents()).sort();
  if (!label) throw new Error('Exercise library has no unused exercise');
  const name = label.replace(new RegExp(`\\s*(${programs.ar.added}|${programs.ar.add})\\s*$`), '').trim();
  await library.getByRole('button', { name: `${name} ${programs.ar.add}`, exact: true }).click();
  await expect(library.getByRole('button', { name: `${name} ${programs.ar.added}`, exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: programs.ar.exerciseAdded.replace('{name}', name) })).toBeVisible();
});
