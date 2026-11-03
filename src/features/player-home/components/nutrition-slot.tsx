'use client';

import Link from 'next/link';
import { eatenTotals, targetsOf, useMealLogs, useNutritionSnapshot } from '@/features/nutrition';
import { ErrorState, GlassCard, LoadingState } from '@/ui';

export function NutritionSlot() {
  const { snapshot, status, stale, today, retry, onError, retryKey } = useNutritionSnapshot();
  const logs = useMealLogs(today, onError, retryKey);
  if (status === 'error') return <ErrorState message="مش قادرين نحمّل نظام أكلك" retryLabel="جرّب تاني" onRetry={retry} />;
  if (status === 'loading' || logs === undefined) return <LoadingState />;
  const next = snapshot?.meals.find((meal) => !logs.some((row) => row.meal_id === meal.id && row.completed_at));
  return <Link href="/player/nutrition" className="block min-h-12 rounded-card">
    <GlassCard className="space-y-2 p-5 text-sm">
      <h2 className="font-bold">أكل النهارده</h2>
      {snapshot && snapshot.meals.length > 0 ? <>
        <p>{eatenTotals(snapshot, logs, today).kcal.toLocaleString('en-US')} / {targetsOf(snapshot).kcal.toLocaleString('en-US')} سعرة</p>
        <p className="text-muted">{next ? `الوجبة الجاية: ${next.name}` : 'كلت كل وجباتك النهارده'}</p>
        {stale && <p className="text-muted">آخر تحديث من شوية</p>}
      </> : <p className="text-muted">الكابتن لسه بيجهز نظام أكلك</p>}
    </GlassCard>
  </Link>;
}
