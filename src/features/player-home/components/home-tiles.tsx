'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Droplet, Plus, Utensils } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { localDb, useLiveQuery } from '@/core/offline';
import { eatenTotals, targetsOf, useMealLogs, useNutritionSnapshot } from '@/features/nutrition';
import { readDailyCheck, playerWaterGoalMl, saveDailyCheck } from '@/features/readiness';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { EmptyState, ErrorState, LoadingState } from '@/ui';
import { IconButton } from '@/ui/icon-button';
import { ProgressBar } from '@/ui/progress-bar';
import { dayNutrition } from '../day-nutrition';
import { messages } from '../messages';
import { messages as copy } from '../v4/messages';
import { messages as waterCopy } from '../v6-messages';

export function HomeTiles({ weightKg, today, playerId, rest }: {
  weightKg?: number; today: string; playerId?: string; rest?: boolean;
}) {
  const t = useT(messages);
  const v4 = useT(copy);
  const wt = useT(waterCopy);
  const locale = useLocale();
  const timezone = useTimezone();
  const nutrition = useNutritionSnapshot();
  const logs = useMealLogs(today, nutrition.onError, nutrition.retryKey);
  const [error, setError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [revision, setRevision] = useState(0);
  const onError = useCallback(() => setError(true), []);
  const read = useCallback(() => playerId && today
    ? readDailyCheck(localDb(), playerId, today) : Promise.resolve(null), [playerId, today]);
  const row = useLiveQuery(read, onError, revision);
  if (nutrition.status === 'error' || error) return <ErrorState message={t('couldntLoadYourMealPlan')} retryLabel={t('tryAgain')}
    onRetry={() => { setError(false); setRevision(value => value + 1); nutrition.retry(); }} />;
  if (nutrition.status === 'loading' || !logs || row === undefined) return <LoadingState variant="detail" />;

  const snapshot = nutrition.snapshot;
  const summary = snapshot ? dayNutrition(snapshot, logs, today, today) : null;
  const goals = snapshot ? targetsOf(snapshot) : null;
  const eaten = snapshot ? eatenTotals(snapshot, logs, today) : null;
  const next = snapshot?.meals.find(meal => !logs.some(log => log.meal_id === meal.id &&
    log.log_date === today && log.completed_at && !log.deleted_at));
  const waterMl = row?.water_ml ?? 0;
  const waterGoal = playerWaterGoalMl(snapshot?.water_target_ml, weightKg);
  const number = (value: number) => formatNumber(value, locale);
  const percent = summary && summary.targetKcal > 0 ? Math.min(100, Math.round((summary.eatenKcal ?? 0) / summary.targetKcal * 100)) : 0;

  async function addWater() {
    if (!playerId || waterMl >= 10000) return;
    setSaveError(false);
    try { await saveDailyCheck(localDb(), playerId, {}, 250, Date.now(), timezone); }
    catch { setSaveError(true); }
  }

  return <div className="space-y-card-gap">
    {!snapshot?.meals.length ? <EmptyState icon={Utensils} title={t('todaysMeals')}
      body={t('yourCoachIsPreparingYourMealPlan')} secondary={{ label: t('messageCoach'), href: '/player/captain' }} /> :
      <Link href="/player/nutrition" className="press glass flex min-h-12 items-center gap-stack rounded-card p-card">
      {summary && summary.targetKcal > 0 && <span className="relative grid size-16 shrink-0 place-items-center">
        <svg aria-hidden viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-line" />
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round" pathLength="100"
            strokeDasharray={`${percent} 100`} className={rest ? 'stroke-info' : 'stroke-lime'} />
        </svg>
        <b className="font-display text-sm tabular-nums">{t('homePercent', { percent: number(percent) })}</b>
      </span>}
      <div className="flex min-w-0 flex-1 flex-col gap-inline">
        <b className="text-sm">{t('todaysMeals')}</b>
        {summary && summary.targetKcal > 0 && <span className="text-xs text-muted">
          {v4('calories', { eaten: number(summary.eatenKcal ?? 0), target: number(summary.targetKcal) })}
          {eaten && !rest && <> · {v4('protein', { grams: number(Math.round(eaten.protein)) })}</>}
        </span>}
        {eaten && !rest && <div className="grid grid-cols-4 gap-inline">
          {[
            { label: t('homeCalories'), value: summary?.eatenKcal ?? 0, max: summary?.targetKcal ?? 0 },
            { label: t('homeProtein'), value: eaten.protein, max: goals?.protein ?? 0 },
            { label: v4('carbs'), value: eaten.carbs, max: goals?.carbs ?? 0 },
            { label: v4('fat'), value: eaten.fat, max: goals?.fat ?? 0 },
          ].map(item => <ProgressBar key={item.label} thin value={item.value} max={item.max} aria-label={item.label} />)}
        </div>}
        <span className="text-micro text-muted">{next
          ? t('homeNextMeal', { name: starterText(next.name, locale, snapshot.title) }) : t('youveEatenAllYourMealsToday')}</span>
        {nutrition.stale && <span className="text-micro text-muted">{t('lastUpdatedAWhileAgo')}</span>}
      </div>
      <ChevronLeft aria-hidden className="size-4 shrink-0 text-faint ltr:rotate-180" />
    </Link>}
    {!rest && <section className="glass flex items-center gap-stack rounded-card p-card">
      <Droplet aria-hidden className="size-5 shrink-0 text-info" />
      <div className="min-w-0 flex-1 space-y-inline">
        <h2 className="text-sm font-bold">{t('homeWater')}</h2>
        <p className="text-xs text-muted"><bdi className="font-display text-title font-extrabold text-ink">{number(waterMl / 1000)}</bdi>
          {' '}{v4('litres', { goal: number(waterGoal / 1000) })}</p>
        <ProgressBar thin value={waterMl} max={waterGoal} aria-label={t('homeWater')} className="[&>div]:bg-info" />
      </div>
      <IconButton aria-label={wt('addWater')} disabled={!playerId || waterMl >= 10000}
        onClick={() => void addWater()}><Plus aria-hidden className="size-5 text-lime" /></IconButton>
    </section>}
    {saveError && <p role="alert" className="text-xs text-danger">{wt('saveFailed')}</p>}
  </div>;
}
