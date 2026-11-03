'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import Link from 'next/link';
import { eatenTotals, targetsOf, useMealLogs, useNutritionSnapshot } from '@/features/nutrition';
import { ErrorState, GlassCard, LoadingState } from '@/ui';
import { formatNumber } from '@/lib/format';

export function NutritionSlot() {
  const t = useT(messages);
  const locale = useLocale();
  const { snapshot, status, stale, today, retry, onError, retryKey } = useNutritionSnapshot();
  const logs = useMealLogs(today, onError, retryKey);
  if (status === 'error') return <ErrorState message={t('couldntLoadYourMealPlan')} retryLabel={t('tryAgain')} onRetry={retry} />;
  if (status === 'loading' || logs === undefined) return <LoadingState />;
  const next = snapshot?.meals.find((meal) => !logs.some((row) => row.meal_id === meal.id && row.completed_at));
  return <Link href="/player/nutrition" className="block min-h-12 rounded-card">
    <GlassCard className="space-y-2 p-5 text-sm">
      <h2 className="font-bold">{t('todaysMeals')}</h2>
      {snapshot && snapshot.meals.length > 0 ? <>
        <p>{formatNumber(eatenTotals(snapshot, logs, today).kcal, locale)} / {formatNumber(targetsOf(snapshot).kcal, locale)} {t('kcal')}</p>
        <p className="text-muted">{next ? t('nextMeal', { value0: next.name }) : t('youveEatenAllYourMealsToday')}</p>
        {stale && <p className="text-muted">{t('lastUpdatedAWhileAgo')}</p>}
      </> : <p className="text-muted">{t('yourCoachIsPreparingYourMealPlan')}</p>}
    </GlassCard>
  </Link>;
}
