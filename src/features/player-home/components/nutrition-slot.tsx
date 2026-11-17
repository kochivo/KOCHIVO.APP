'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import Link from 'next/link';
import { useMealLogs, useNutritionSnapshot } from '@/features/nutrition';
import { Utensils } from 'lucide-react';
import { EmptyState, ErrorState, GlassCard, LoadingState } from '@/ui';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { dayNutrition } from '../day-nutrition';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function NutritionSlot({ date }: { date?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const v3 = captainWorkspaceEnabled();
  const { snapshot, status, stale, today, retry, onError, retryKey } = useNutritionSnapshot();
  const selectedDate = date ?? today;
  const logs = useMealLogs(selectedDate, onError, retryKey);
  if (status === 'error') return <ErrorState message={t('couldntLoadYourMealPlan')} retryLabel={t('tryAgain')} onRetry={retry} />;
  if (status === 'loading' || logs === undefined) return <LoadingState variant="cards" />;
  const contact = { label: t('messageCoach'), href: '/player/captain' };
  if (!snapshot || !snapshot.meals.length) return <EmptyState icon={Utensils} title={t('todaysMeals')} body={t('yourCoachIsPreparingYourMealPlan')}
    action={v3 ? undefined : contact} secondary={v3 ? contact : undefined} />;
  const summary = dayNutrition(snapshot, logs, selectedDate, today);
  const weekday = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date(`${selectedDate}T12:00:00Z`).getUTCDay()];
  const next = snapshot.meals.find((meal) => !logs.some((row) => row.meal_id === meal.id && row.completed_at));
  const total = formatNumber(summary.mealsTotal, locale);
  const target = formatNumber(summary.targetKcal, locale);
  const content = <>
      <h2 className="font-bold">{summary.kind === 'today' ? t('todaysMeals') : t('dayMeals', { weekday: weekday ? t(weekday) : '' })}</h2>
        <p>{summary.kind === 'future'
          ? t('plannedMeals', { target, meals: t('mealCount', { n: summary.mealsTotal, count: total }) })
          : t('eatenCalories', { eaten: formatNumber(summary.eatenKcal ?? 0, locale), target })}</p>
        <p className="text-muted">{summary.kind === 'today'
          ? next ? t('nextMeal', { value0: starterText(next.name, locale, snapshot.title) }) : t('youveEatenAllYourMealsToday')
          : summary.kind === 'future' ? t('planForThatDay')
          : summary.mealsDone === 0 ? t('noFoodLoggedThatDay')
          : t('completedMeals', { done: formatNumber(summary.mealsDone ?? 0, locale),
            meals: t('mealCount', { n: summary.mealsTotal, count: total }) })}</p>
        {stale && <p className="text-muted">{t('lastUpdatedAWhileAgo')}</p>}
    </>;
  const card = v3 ? <section className="glass space-y-inline rounded-card p-card text-sm">{content}</section>
    : <GlassCard className="space-y-inline p-card text-sm">{content}</GlassCard>;
  return <div key={selectedDate} className={summary.kind !== 'today' ? 'motion-safe:animate-[surface-in_180ms_ease-out] motion-reduce:animate-none' : undefined}>
    {summary.kind === 'today' ? <Link href="/player/nutrition" className="block min-h-12 rounded-card">{card}</Link> : card}
  </div>;
}
