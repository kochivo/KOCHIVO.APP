import { readinessScore } from '../score';

/** Keep optional analytics reads and the offline database behind their lazy boundary. */
export async function loadTodayReadiness(playerId: string, today: string, self: boolean) {
  const { fetchCoachReadiness } = await import('./coach-readiness');
  const daily = await fetchCoachReadiness(playerId, today);
  let row: { sleep_hours: number | null; water_ml: number; soreness: number | null; client_updated_at: string } | undefined =
    daily.checks.find(check => check.log_date === today);
  if (self) {
    const [{ localDb }, { readDailyCheck }] = await Promise.all([import('@/core/offline'), import('./daily-checks')]);
    const local = await readDailyCheck(localDb(), playerId, today);
    if (local && (!row || Date.parse(local.client_updated_at) >= Date.parse(row.client_updated_at))) row = local;
  }
  return row ? readinessScore({ sleepHours: row.sleep_hours, waterMl: row.water_ml,
    waterGoalMl: daily.goal, soreness: row.soreness })?.score ?? null : null;
}
