'use client';

import { Utensils } from 'lucide-react';
import { Button, EmptyState, ErrorState, LoadingState, SyncPill } from '@/ui';
import { useNutritionSnapshot } from '../hooks/use-nutrition-snapshot';
import { useMealLogs } from '../hooks/use-meal-logs';
import { eatenTotals, targetsOf } from '../macros';
import { MacroRing } from './macro-ring';
import { MealCard } from './meal-card';

export function NutritionScreen() {
  const { snapshot, status, stale, online, pending, today, retry, onError, retryKey } = useNutritionSnapshot();
  const logs = useMealLogs(today, onError, retryKey);
  return <main className="mx-auto max-w-lg space-y-4 px-5 pt-6 pb-32">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">أكل النهارده</h1>
        {snapshot && <p className="text-sm text-muted">{snapshot.title}</p>}</div>
      <SyncPill state={!online ? 'offline' : pending === undefined || pending > 0 ? 'pending' : 'synced'} pending={pending} />
    </header>
    {status === 'error' ? <ErrorState message="مش قادرين نحمّل نظام أكلك" retryLabel="جرّب تاني" onRetry={retry} /> :
      status === 'loading' || logs === undefined ? <LoadingState /> : !snapshot || !snapshot.meals.length ?
        <EmptyState icon={Utensils} title="الكابتن لسه بيجهز نظام أكلك" body="هيظهر هنا أول ما يجهز" /> : <>
          {stale && <div className="flex items-center justify-between gap-2 text-sm text-muted">
            <p>آخر تحديث من شوية</p><Button variant="ghost" onClick={retry}>جرّب تاني</Button>
          </div>}
          <MacroRing eaten={eatenTotals(snapshot, logs, today)} target={targetsOf(snapshot)} />
          {snapshot.meals.map((meal) => <MealCard key={`${today}-${meal.id}`} meal={meal} today={today}
            log={logs.find((row) => row.meal_id === meal.id)} />)}
        </>}
  </main>;
}
