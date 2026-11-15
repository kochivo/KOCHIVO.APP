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
import { FoodActions } from './food-actions';
import { FoodWater } from './food-water';
import { messages as v6Messages } from '../v6-messages';
import { useState } from 'react';
import dynamic from 'next/dynamic';
const DayType = dynamic(() => import('./day-type').then(module => module.DayType), { ssr: false });

export function NutritionScreen() {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const [rest, setRest] = useState(false);
  const locale = useLocale();
  const v6 = captainWorkspaceEnabled();
  const { snapshot, status, stale, online, pending, parked, retrySync, today, retry, onError, retryKey } = useNutritionSnapshot();
  const logs = useMealLogs(today, onError, retryKey);
  const sync = <SyncPill state={!online ? 'offline' : parked && parked > 0 ? 'attention' : pending === undefined || pending > 0 ? 'pending' : 'synced'} pending={pending} onRetry={retrySync} />;
  return <main data-mood={v6 && rest ? 'rest' : undefined} className={v6 ? 'mx-auto flex max-w-lg flex-col gap-stack bg-bg px-page-x pt-card pb-[104px]' : 'mx-auto max-w-lg space-y-card-gap px-page-x pt-section pb-32'}>
    {v6 ? <h1 className="m-0 font-sans text-h font-black!">{v6t('today')}</h1> : <header className="flex flex-wrap items-center justify-between gap-stack">
      <div><h1 className="text-2xl font-extrabold">{t(v6 ? 'todaysNutrition' : 'todaysMeals')}</h1>
        {snapshot && <p className="text-sm text-muted">{starterText(snapshot.title, locale)}</p>}{v6 && <DayType today={today} />}</div>
      {sync}
    </header>}
    {status === 'error' ? <ErrorState message={t('couldntLoadYourMealPlan')} retryLabel={t('tryAgain')} onRetry={retry} /> :
      status === 'loading' || logs === undefined ? <LoadingState variant="cards" /> : !snapshot || !snapshot.meals.length ?
        <EmptyState icon={Utensils} title={t('yourCoachIsPreparingYourMealPlan')} body={t('itWillAppearHereWhenReady')} action={{ label: t('messageCoach'), href: '/player/captain' }} /> : <>
          {stale && <div className="flex items-center justify-between gap-inline text-sm text-muted">
            <p>{t('lastUpdatedAWhileAgo')}</p><Button variant={v6 ? 'secondary' : 'ghost'} onClick={retry}>{t('tryAgain')}</Button>
          </div>}
          {v6 ? <MacroTiles eaten={eatenTotals(snapshot, logs, today)} target={targetsOf(snapshot)} /> : <MacroRing eaten={eatenTotals(snapshot, logs, today)} target={targetsOf(snapshot)} />}
          {v6 ? <ol className="flex list-none flex-col gap-inline" aria-label={v6t('meals')}>{snapshot.meals.map(meal => <li key={`${today}-${meal.id}`}>
            <MealCard meal={meal} today={today} planTitle={snapshot.title}
              primary={meal.id === snapshot.meals.find(candidate => candidate.items.length > 0 && !logs.some(row => row.meal_id === candidate.id && row.log_date === today && row.completed_at && !row.deleted_at))?.id}
              log={logs.find(row => row.meal_id === meal.id && row.log_date === today && !row.deleted_at)} />
          </li>)}</ol> : <ul className="space-y-card-gap" aria-label={t('todaysMealsList')}>{snapshot.meals.map(meal => <li key={`${today}-${meal.id}`}>
            <MealCard meal={meal} today={today} planTitle={snapshot.title} log={logs.find(row => row.meal_id === meal.id)} />
          </li>)}</ul>}
        </>}
    {v6 && <>
      <FoodWater playerId={snapshot?.player_id} today={today} />
      <FoodActions />
      <div className="flex flex-wrap items-center justify-between gap-stack">
        <div>{snapshot && <p className="text-sm text-muted">{starterText(snapshot.title, locale)}</p>}
          <DayType today={today} playerId={snapshot?.player_id} onRestChange={setRest} /></div>{sync}
      </div>
    </>}
    <PlayerSupplements />
  </main>;
}
