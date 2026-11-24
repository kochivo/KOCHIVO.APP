'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import Link from 'next/link';
import { buttonClass } from '@/ui/button';
import { Package, Utensils } from 'lucide-react';
import { Button, EmptyState, ErrorState, LoadingState, SyncPill } from '@/ui';
import { useNutritionSnapshot } from '../hooks/use-nutrition-snapshot';
import { useMealLogs } from '../hooks/use-meal-logs';
import { dayNutritionTargets, eatenTotals } from '../macros';
import { filterMeals } from '../day-type-filter';
import { MacroRing } from './macro-ring';
import { MealCard } from './meal-card';
import { starterText } from '@/lib/starter-text';
import { formatNumber } from '@/lib/format';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { FoodMacroSummary } from './food-macro-summary';
import { FoodWater } from './food-water';
import { messages as v6Messages } from '../v6-messages';
import { messages as v4Messages } from '../player-v4/messages';
import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRamadan } from '@/lib/use-ramadan';
const RamadanMeals = dynamic(() => import('./ramadan-meals').then(m => m.RamadanMeals));
const DayType = dynamic(() => import('./day-type').then(module => module.DayType), { ssr: false });
const BudgetSummary = dynamic(() => import('./budget-summary').then(module => module.BudgetSummary));
const CoachButton = dynamic(() => import('@/features/player-shell').then(module => module.CoachButton), { ssr: false });
const PlayerSupplements = dynamic(() => import('@/features/supplements').then(module => module.PlayerSupplements), { loading: () => <LoadingState /> });

export function NutritionScreen() {
  const t = useT(messages);
  const ramadan = useRamadan();
  const v6t = useT(v6Messages);
  const v4t = useT(v4Messages);
  const [day, setDay] = useState<{ today: string; rest: boolean | null | undefined }>();
  const locale = useLocale();
  const v6 = captainWorkspaceEnabled();
  const { snapshot, status, stale, online, pending, parked, retrySync, today, retry, onError, retryKey } = useNutritionSnapshot();
  const logs = useMealLogs(today, onError, retryKey);
  const rest = day?.today === today ? day.rest : undefined;
  const setRest = useCallback((rest: boolean | null | undefined) => setDay({ today, rest }), [today]);
  const visible = snapshot ? { ...snapshot, meals: filterMeals(snapshot.meals, rest, logs ?? [], today) } : null;
  const planTitle = snapshot ? starterText(snapshot.title, locale) : '';
  const target = snapshot ? dayNutritionTargets(snapshot, rest) : null;
  const eaten = logs ? eatenTotals(snapshot ?? null, logs, today) : null;
  const calories = target?.kcal ?? 0;
  const hasEaten = eaten && Object.values(eaten).some(value => value > 0);
  const summary = eaten && (target || hasEaten) && (v6
    ? <FoodMacroSummary eaten={eaten} target={target ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }} />
    : <MacroRing eaten={eaten} target={target ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }} />);
  const sync = <SyncPill state={!online ? 'offline' : parked && parked > 0 ? 'attention' : pending === undefined || pending > 0 ? 'pending' : 'synced'} pending={pending} onRetry={retrySync} />;
  const mealLog = (id: string) => logs?.find(row => row.meal_id === id && row.log_date === today && !row.deleted_at);
  const nextMeal = v6 && !ramadan.data?.active && visible?.meals.find(meal => meal.items.length > 0 && !mealLog(meal.id)?.completed_at);
  const water = <div data-food-section="water"><FoodWater playerId={snapshot?.player_id} today={today} /></div>;
  const budget = status !== 'error' && status !== 'loading' && visible?.meals.length && logs
    ? <BudgetSummary showShopping={!v6} meals={visible.meals} swaps={Object.assign({}, ...logs.filter(log => log.log_date === today && !log.deleted_at).map(log => log.swaps))} />
    : null;
  return <main data-mood={v6 && rest ? 'rest' : undefined} className={v6 ? 'mx-auto flex max-w-lg flex-col gap-card-gap px-page-x pt-card' : 'mx-auto max-w-lg space-y-card-gap px-page-x pt-section pb-32'}>
    {v6 ? <header className="flex min-h-12 items-center gap-inline">
      <div className="min-w-0 flex-1"><h1 className="text-h font-extrabold">{v4t('food')}</h1>
        {snapshot && <p className="text-xs text-muted">{calories > 0 ? v4t('target', { plan: planTitle, goal: formatNumber(calories, locale) }) : planTitle}</p>}</div>
      <Link href="/player/nutrition/shopping" aria-label={v6t('shopping')} className={buttonClass({ variant: 'secondary', className: 'size-12 shrink-0 px-0' })}><Package aria-hidden className="size-5" /></Link>
      <CoachButton />
    </header> : <header className="flex flex-wrap items-center justify-between gap-stack">
      <div><h1 className="text-2xl font-extrabold">{t(v6 ? 'todaysNutrition' : 'todaysMeals')}</h1>
        {snapshot && <p className="text-sm text-muted">{starterText(snapshot.title, locale)}</p>}{!v6 && <DayType key={today} today={today} playerId={snapshot?.player_id} onRestChange={setRest} />}</div>
      {sync}
    </header>}
    {status === 'error' ? <ErrorState message={t('couldntLoadYourMealPlan')} retryLabel={t('tryAgain')} onRetry={retry} /> :
      status === 'loading' || logs === undefined ? <LoadingState variant="cards" /> : !visible || !visible.meals.length ?
        <>{(hasEaten || Boolean(snapshot?.meals.length)) && summary}<EmptyState icon={Utensils} title={t('yourCoachIsPreparingYourMealPlan')} body={t('itWillAppearHereWhenReady')} action={{ label: t('messageCoach'), href: '/player/captain' }} /></> : <>
          {stale && <div className="flex items-center justify-between gap-inline text-sm text-muted">
            <p>{t('lastUpdatedAWhileAgo')}</p><Button variant={v6 ? 'secondary' : 'ghost'} onClick={retry}>{t('tryAgain')}</Button>
          </div>}
          {nextMeal && <div data-food-section="next-meal"><MealCard key={`${today}-${nextMeal.id}`} meal={nextMeal}
            today={today} planTitle={visible.title} primary log={mealLog(nextMeal.id)} /></div>}
          {v6 && water}
          {summary}
          {!v6 && budget}
          {ramadan.data?.active ? <RamadanMeals meals={visible.meals} logs={logs} today={today} title={visible.title} /> : v6 ? <ol data-food-section="meals" className="flex list-none flex-col gap-card-gap" aria-label={v6t('meals')}>{visible.meals.filter(meal => meal.id !== (nextMeal || undefined)?.id).map(meal => <li key={`${today}-${meal.id}`}>
            <MealCard meal={meal} today={today} planTitle={visible.title}
              log={mealLog(meal.id)} />
          </li>)}</ol> : <ul className="space-y-card-gap" aria-label={t('todaysMealsList')}>{visible.meals.map(meal => <li key={`${today}-${meal.id}`}>
            <MealCard meal={meal} today={today} planTitle={visible.title} log={logs.find(row => row.meal_id === meal.id && row.log_date === today && !row.deleted_at)} />
          </li>)}</ul>}
        </>}
    {v6 && <>
      {(status === 'error' || status === 'loading' || logs === undefined || !visible?.meals.length) && water}
      {budget}
      <div className="flex flex-wrap items-center justify-between gap-stack">
        <DayType key={today} today={today} playerId={snapshot?.player_id} onRestChange={setRest} />{sync}
      </div>
    </>}
    <PlayerSupplements />
  </main>;
}
