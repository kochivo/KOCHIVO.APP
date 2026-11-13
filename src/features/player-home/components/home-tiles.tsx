'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { localDb, useLiveQuery } from '@/core/offline';
import { useMealLogs, useNutritionSnapshot } from '@/features/nutrition';
import { readDailyCheck, waterGoalMl } from '@/features/readiness';
import { ErrorState, LoadingState } from '@/ui';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { dayNutrition } from '../day-nutrition';
import { messages } from '../messages';
import { waterGlasses } from './home-metrics';

export function HomeTiles({ today, playerId, rest, streak, done, planned, onWater }: {
  today: string; playerId?: string; rest?: boolean; streak?: number; done: number; planned: number;
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
  const water = waterGlasses(row?.water_ml ?? 0, waterGoalMl());
  const tile = 'glass-strong flex min-w-0 flex-col rounded-[24px] border-line-soft! bg-surface! p-4 text-ink shadow-none backdrop-blur-none';
  return <div className="grid grid-cols-2 gap-3">
    <Link href="/player/nutrition" className={`${tile} min-h-[136px] gap-2.5`}>
      <span className="text-[13px] text-muted">{t('homeFood')}</span>
      <svg width="60" height="60" viewBox="0 0 60 60" role="img" aria-label={t('homeFoodPercent', { percent: formatNumber(percent, locale) })}>
        <circle cx="30" cy="30" r="25" fill="none" className="stroke-line" strokeWidth="7" />
        <circle cx="30" cy="30" r="25" fill="none" className="stroke-lime" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${percent * Math.PI / 2} ${50 * Math.PI}`} transform="rotate(-90 30 30)" />
        <text x="30" y="35" textAnchor="middle" className="fill-ink font-[family-name:var(--font-manrope)] text-sm font-extrabold">{t('homePercent', { percent: formatNumber(percent, locale) })}</text>
      </svg>
      <span className="text-xs text-muted">{!nutrition.snapshot?.meals.length ? t('yourCoachIsPreparingYourMealPlan') : next
        ? t('homeNextMeal', { name: starterText(next.name, locale, nutrition.snapshot.title) }) : t('youveEatenAllYourMealsToday')}</span>
    </Link>
    <a href="#home-morning" onClick={() => { onWater?.(); document.getElementById('home-morning')?.setAttribute('open', ''); }}
      className={`${tile} min-h-[136px] gap-2.5`}>
      <span className="text-[13px] text-muted">{t('homeWater')}</span>
      <span className="font-[family-name:var(--font-manrope)] text-[30px] font-extrabold text-water">
        {formatNumber(water.done, locale)}<span className="text-base font-normal text-muted">{t('homeRatio', { done: '', planned: formatNumber(water.planned, locale) })}</span>
      </span>
      <span className="flex gap-1" aria-hidden>{Array.from({ length: 8 }, (_, index) =>
        <span key={index} className={`h-2 flex-1 rounded ${index < Math.floor(Math.min(1, water.done / (water.planned || 1)) * 8) ? 'bg-water' : 'bg-line'}`} />)}</span>
      <span className="text-xs text-muted">{t('homeGlasses')}</span>
    </a>
    {!rest && <>
      <Link href="/player/history" className={`${tile} min-h-[120px] gap-1.5`}>
        <span className="text-[13px] text-muted">{t('homeStreak')}</span>
        {streak === undefined ? <span className="text-xs text-muted">{t('homeStreakUnavailable')}</span> :
          <span className="font-[family-name:var(--font-manrope)] text-[34px] font-extrabold text-sore">{formatNumber(streak, locale)}</span>}
        <span className="text-xs text-muted">{t('streakConsecutive')}</span>
      </Link>
      <Link href="/player/rank" className={`${tile} min-h-[120px] gap-1.5`}>
        <span className="text-[13px] text-muted">{t('homeMedal')}</span>
        <span className="font-[family-name:var(--font-manrope)] text-[34px] font-extrabold text-gold-2">
          {formatNumber(done, locale)}<span className="text-base font-normal text-muted">{t('homeRatio', { done: '', planned: formatNumber(planned, locale) })}</span>
        </span>
        <span className="text-xs text-muted">{t('homeWeek')}</span>
      </Link>
    </>}
  </div>;
}
