import { expect, test } from '@playwright/test';
import { createT } from '../src/core/i18n/messages';
import { messages as auth } from '../src/features/auth/messages';
import { messages as templates } from '../src/features/templates/messages';
import { messages as programs } from '../src/features/programs/messages';
import { messages as home } from '../src/features/player-home/messages';
import { messages as workout } from '../src/features/workout/messages';
import { messages as profile } from '../src/features/player-profile/messages';
import { messages as analytics } from '../src/features/muscle-analytics/analytics/messages';
import { messages as ui } from '../src/ui/messages';
import { localDate } from '../src/lib/dates';
import { formatNumber } from '../src/lib/format';
import { journeyClient, requiredEnv, signInJourneyPlayer } from './support/journey-auth';

const required = ['E2E_COACH_EMAIL', 'E2E_COACH_PASSWORD', 'E2E_PLAYER_EMAIL', 'E2E_PLAYER_PASSWORD',
  'E2E_BASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
const missing = required.filter(name => !process.env[name]);
test.skip(missing.length > 0, `Journey requires environment variables: ${missing.join(', ')}`);
test.skip((process.env.E2E_BASE_URL ?? '').toLowerCase().includes('kochivo.site'), 'Never run the journey against kochivo.site');
test.use({ baseURL: process.env.E2E_BASE_URL || 'http://localhost:3100' });

test('coach creates and assigns a template, player logs it, coach sees the saved workout', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const controls = createT(ui, 'ar');
  const templateT = createT(templates, 'ar');
  const coachClient = journeyClient(page.context());
  await page.goto('/ar/login');
  await page.getByLabel(auth.ar.email, { exact: true }).fill(requiredEnv('E2E_COACH_EMAIL'));
  await page.getByLabel(auth.ar.password, { exact: true }).fill(requiredEnv('E2E_COACH_PASSWORD'));
  await page.getByRole('button', { name: auth.ar.signIn, exact: true }).click();
  await expect(page).toHaveURL(/\/captain/);
  const playerContext = await browser.newContext({ baseURL: requiredEnv('E2E_BASE_URL'), locale: 'ar-EG', timezoneId: 'Africa/Cairo' });
  try {
    const { client, playerId } = await signInJourneyPlayer(playerContext);
    const priorLogs = await client.from('set_logs').select('id', { count: 'exact', head: true }).eq('player_id', playerId);
    expect(priorLogs.error).toBeNull();
    expect(priorLogs.count, 'Use a fresh disposable QA player with no workout history').toBe(0);
    const playerProfile = await client.from('profiles').select('full_name').eq('id', playerId).single();
    expect(playerProfile.error).toBeNull();
    if (!playerProfile.data) throw new Error('Journey player profile missing');
    await page.goto('/ar/captain/templates');
    const mine = page.getByRole('region', { name: new RegExp(templates.ar.myTemplates) });
    await mine.getByRole('button', { name: templates.ar.newTemplate, exact: true }).click();
    await expect(page.getByLabel(programs.ar.programName, { exact: true })).toBeVisible();
    const templateId = new URL(page.url()).pathname.split('/').at(-1);
    if (!templateId) throw new Error('Template route missing');
    const title = `QA ${templateId}`;
    await page.getByLabel(programs.ar.programName, { exact: true }).fill(title);
    await page.getByRole('button', { name: programs.ar.addDay, exact: true }).click();
    await page.getByLabel(programs.ar.dayName, { exact: true }).fill(title);
    await page.getByRole('button', { name: programs.ar.addExercise, exact: true }).click();
    const library = page.getByRole('dialog', { name: programs.ar.exerciseLibrary });
    await library.getByRole('button', { name: programs.ar.chest, exact: true }).click();
    const choices = library.getByRole('listitem').getByRole('button', { name: new RegExp(`${programs.ar.add}$`) });
    for (let index = 0; index < 2; index++) {
      const choice = choices.first();
      const label = await choice.innerText();
      await choice.click();
      await expect(library.getByRole('button', {
        name: label.replace(new RegExp(`${programs.ar.add}$`), programs.ar.added), exact: true,
      })).toBeVisible();
    }
    await library.getByRole('button', { name: programs.ar.closeLibrary, exact: true }).click();
    await page.getByRole('button', { name: templates.ar.saveTemplate, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: programs.ar.saved })).toBeVisible();
    await page.goto('/ar/captain/templates');
    const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await card.getByRole('button', { name: templates.ar.assignToPlayer, exact: true }).click();
    const assign = page.getByRole('dialog', { name: templateT('assignTitle', { title }), exact: true });
    await assign.getByRole('checkbox', { name: playerProfile.data.full_name, exact: true }).check();
    await assign.getByRole('button', { name: templateT('assignMany', { n: 1 }), exact: true }).click();
    await expect(assign).not.toBeVisible();
    const assigned = await client.from('programs').select('id').eq('player_id', playerId).eq('title', title).eq('status', 'active').single();
    expect(assigned.error).toBeNull();
    if (!assigned.data) throw new Error('Assigned programme missing');
    const days = await client.from('program_days').select('id').eq('program_id', assigned.data.id).single();
    expect(days.error).toBeNull();
    if (!days.data) throw new Error('Assigned day missing');
    const dayId = days.data.id;
    const playerPage = await playerContext.newPage();
    await playerPage.goto('/ar/player');
    await playerPage.getByRole('link', { name: home.ar.startWorkout, exact: true }).click();
    const expectedSets: { weight: string; reps: string }[] = [];
    // Each library exercise defaults to three sets. The final complete-set tap finishes automatically.
    for (let index = 0; index < 6; index++) {
      const skip = playerPage.getByRole('button', { name: workout.ar.skip, exact: true });
      if (index > 0) { await expect(skip).toBeVisible(); await skip.click(); }
      await playerPage.getByRole('button', { name: controls('increase', { controlLabel: workout.ar.weightKg }), exact: true }).click();
      await playerPage.getByRole('button', { name: controls('increase', { controlLabel: workout.ar.reps }), exact: true }).click();
      expectedSets.push({
        weight: (await playerPage.getByRole('status', { name: workout.ar.weightKg, exact: true }).innerText()).trim(),
        reps: (await playerPage.getByRole('status', { name: workout.ar.reps, exact: true }).innerText()).trim(),
      });
      await playerPage.getByRole('button', { name: workout.ar.completeSet, exact: true }).click();
    }
    await expect(playerPage.getByRole('heading', { name: workout.ar.workoutComplete, exact: true })).toBeVisible();
    const today = localDate(new Date());
    let sessionId = '';
    await expect.poll(async () => {
      const result = await client.from('workout_sessions').select('id,completed_at').eq('player_id', playerId)
        .eq('program_day_id', dayId).eq('training_date', today).single();
      if (result.error) return false;
      sessionId = result.data.id;
      return Boolean(result.data.completed_at);
    }).toBe(true);
    await expect.poll(async () => {
      const result = await client.from('set_logs').select('weight_kg,reps,completed_at').eq('session_id', sessionId)
        .is('deleted_at', null).order('completed_at');
      if (result.error) return [];
      return result.data.map(row => ({ weight: formatNumber(row.weight_kg ?? -1, 'ar'), reps: formatNumber(row.reps ?? -1, 'ar') }));
    }).toEqual(expectedSets);
    await page.goto(`/ar/captain/players/${playerId}`);
    await page.getByRole('link', { name: profile.ar['tab.analysis'], exact: true }).click();
    await expect(page.getByRole('heading', { name: analytics.ar.title, exact: true })).toBeVisible();
    await expect(page.getByRole('slider', { name: new RegExp(analytics.ar.weekRange) })).toBeVisible();
    const analysisT = createT(analytics, 'ar');
    await expect(page.getByRole('img', { name: analysisT('bodyLabel', {
      view: analytics.ar.front, regions: analysisT('regionSets', { muscle: analytics.ar['region.chest'], sets: 6 }),
    }), exact: true })).toBeVisible();
    const saved = await coachClient.from('workout_sessions').select('id,completed_at').eq('id', sessionId).single();
    expect(saved.error).toBeNull();
    expect(saved.data?.completed_at).toBeTruthy();
  } finally { await playerContext.close(); }
});
