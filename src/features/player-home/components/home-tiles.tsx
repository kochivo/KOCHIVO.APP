'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { localDb, useLiveQuery } from '@/core/offline';
import { eatenTotals, targetsOf, useMealLogs, useNutritionSnapshot } from '@/features/nutrition';
import { readDailyCheck, playerWaterGoalMl } from '@/features/readiness';
import { ErrorState, LoadingState } from '@/ui';
import { StatStrip } from '@/ui/stat-strip';
import type { StatStripItem } from '@/ui/stat-strip';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { dayNutrition } from '../day-nutrition';
import { messages } from '../messages';
import { waterGlasses } from './home-metrics';

export function HomeTiles({ weightKg, today, playerId, rest, streak, done, planned, onWater }: {
  weightKg?: number; today: string; playerId?: string; rest?: boolean; streak?: number; done: number; planned: number;
  onWater?: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const nutrition = useNutritionSnapshot();
  const logs = useMealLogs(today, nutrition.onError, nutrition.retryKey);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const onError = useCallback(() => setError(true), []);
  const read = useCallback(() => playerId && today
    ? readDailyCheck(localDb(), playerId, today) : Promise.resolve(null), [playerId, today]);
  const row = useLiveQuery(read, onError, revision);
  if (nutrition.status === 'error' || error) return <ErrorState message={t('couldntLoadYourMealPlan')} retryLabel={t('tryAgain')}
    onRetry={() => { setError(false); setRevision(value => value + 1); nutrition.retry(); }} />;
  if (nutrition.status === 'loading' || !logs || row === undefined) return <LoadingState variant="detail" />;
  const summary = nutrition.snapshot ? dayNutrition(nutrition.snapshot, logs, today, today) : null;
  const percent = summary && summary.targetKcal > 0 ? Math.min(100, Math.max(0, Math.round((summary.eatenKcal ?? 0) / summary.targetKcal * 100))) : 0;
  const next = nutrition.snapshot?.meals.find(meal => !logs.some(log => log.meal_id === meal.id &&
    log.log_date === today && log.completed_at && !log.deleted_at));
  const water = waterGlasses(row?.water_ml ?? 0, playerWaterGoalMl(nutrition.snapshot?.water_target_ml, weightKg));
  const number = (value: number) => formatNumber(value, locale);
  const ratio = (done: number, planned: number) => t('homeRatio', { done: number(done), planned: number(planned) });
  const targetLabel = (value: number) => t('homeRatio', { done: '', planned: number(value) }).trim();
  const waterStat: StatStripItem = {
    label: t('homeWater'), value: ratio(water.done, water.planned), note: t('homeGlasses'),
    percent: water.planned > 0 ? water.done / water.planned * 100 : undefined, tone: 'info',
  };
  const nutrients: StatStripItem[] = [];
  if (summary && summary.targetKcal > 0) nutrients.push({
    label: t('homeCalories'), value: number(summary.eatenKcal ?? 0), unit: targetLabel(summary.targetKcal),
    percent, note: t('homePercent', { percent: number(percent) }),
  });
  if (nutrition.snapshot) {
    const target = targetsOf(nutrition.snapshot).protein;
    if (target > 0) {
      const eaten = eatenTotals(nutrition.snapshot, logs, today).protein;
      nutrients.push({ label: t('homeProtein'), value: number(Math.round(eaten)), unit: targetLabel(target), percent: eaten / target * 100 });
    }
  }
  const week: StatStripItem[] = rest ? [] : [{
    label: t('homeStreak'), value: streak === undefined ? <span className="text-xs">{t('homeStreakUnavailable')}</span> :
      <span className="engraved">{number(streak)}</span>, note: t('streakConsecutive'),
  }, {
    label: t('homeWeek'), value: ratio(done, planned),
    percent: planned > 0 ? done / planned * 100 : undefined,
  }];
  const openWater = () => { onWater?.(); document.getElementById('home-morning')?.setAttribute('open', ''); };
  const rowClass = 'press flex min-h-12 items-center px-card py-stack text-xs text-muted';
  return <div className="space-y-card-gap">
    <StatStrip items={[...week, waterStat]} className={rest
      ? '[&_p>span:first-child]:text-title'
      : 'max-sm:[&&]:grid-cols-3! [&_p>span:first-child]:text-md [&_.engraved]:text-title'} />
    <StatStrip items={nutrients} className="[&_p]:flex-wrap [&_p>span:first-child]:text-title" />
    <section className="glass overflow-hidden rounded-card">
      <Link href="/player/nutrition" className={rowClass}>
        {!nutrition.snapshot?.meals.length ? t('yourCoachIsPreparingYourMealPlan') : next
          ? t('homeNextMeal', { name: starterText(next.name, locale, nutrition.snapshot.title) }) : t('youveEatenAllYourMealsToday')}
      </Link>
      <div className="flex flex-wrap border-t border-line-soft">
        <a href="#home-morning" onClick={openWater} className={rowClass}>{t('homeWater')}</a>
        {!rest && <>
          <Link href="/player/history" className={rowClass}>{t('homeStreak')}</Link>
          <Link href={ranksEnabled() ? '/player/rank' : '/player/history'} className={rowClass}>{t('homeMedal')}</Link>
        </>}
      </div>
    </section>
  </div>;
}
