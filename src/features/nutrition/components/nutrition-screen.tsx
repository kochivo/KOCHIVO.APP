'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Utensils } from 'lucide-react';
import { Button, EmptyState, ErrorState, LoadingState, SyncPill } from '@/ui';
import { useNutritionSnapshot } from '../hooks/use-nutrition-snapshot';
import { useMealLogs } from '../hooks/use-meal-logs';
import { eatenTotals, targetsOf } from '../macros';
import { MacroRing } from './macro-ring';
import { MealCard } from './meal-card';
import { starterText } from '@/lib/starter-text';
import { PlayerSupplements } from '@/features/supplements';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { MacroTiles } from './macro-tiles';
import dynamic from 'next/dynamic';
const DayType = dynamic(() => import('./day-type').then(module => module.DayType), { ssr: false });

export function NutritionScreen() {
  const t = useT(messages);
  const locale = useLocale();
  const v6 = captainWorkspaceEnabled();
  const { snapshot, status, stale, online, pending, parked, retrySync, today, retry, onError, retryKey } = useNutritionSnapshot();
  const logs = useMealLogs(today, onError, retryKey);
  return <main className="mx-auto max-w-lg space-y-4 px-5 pt-6 pb-32">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">{t(v6 ? 'todaysNutrition' : 'todaysMeals')}</h1>
        {snapshot && <p className="text-sm text-muted">{starterText(snapshot.title, locale)}</p>}{v6 && <DayType today={today} />}</div>
      <SyncPill state={!online ? 'offline' : parked && parked > 0 ? 'attention' : pending === undefined || pending > 0 ? 'pending' : 'synced'} pending={pending} onRetry={retrySync} />
    </header>
    {status === 'error' ? <ErrorState message={t('couldntLoadYourMealPlan')} retryLabel={t('tryAgain')} onRetry={retry} /> :
      status === 'loading' || logs === undefined ? <LoadingState variant="cards" /> : !snapshot || !snapshot.meals.length ?
        <EmptyState icon={Utensils} title={t('yourCoachIsPreparingYourMealPlan')} body={t('itWillAppearHereWhenReady')} action={{ label: t('messageCoach'), href: '/player/captain' }} /> : <>
          {stale && <div className="flex items-center justify-between gap-2 text-sm text-muted">
            <p>{t('lastUpdatedAWhileAgo')}</p><Button variant={v6 ? 'secondary' : 'ghost'} onClick={retry}>{t('tryAgain')}</Button>
          </div>}
          {v6 ? <MacroTiles eaten={eatenTotals(snapshot, logs, today)} target={targetsOf(snapshot)} /> : <MacroRing eaten={eatenTotals(snapshot, logs, today)} target={targetsOf(snapshot)} />}
          <ul className={v6 ? 'glass divide-y divide-line-soft overflow-hidden rounded-card border border-line-soft' : 'space-y-4'} aria-label={t('todaysMealsList')}>{snapshot.meals.map((meal) => <li key={`${today}-${meal.id}`}><MealCard meal={meal} today={today} planTitle={snapshot.title} primary={meal.id === snapshot.meals.find(candidate => candidate.items.length > 0 && !logs.some(row => row.meal_id === candidate.id && row.completed_at && !row.deleted_at))?.id}
            log={logs.find((row) => row.meal_id === meal.id)} /></li>)}</ul>
        </>}
    <PlayerSupplements />
  </main>;
}
