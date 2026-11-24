'use client';
import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { localDb } from '@/core/offline';
import { useResource } from '@/core/resource';
import { ErrorState, LoadingState } from '@/ui';
import { formatNumber } from '@/lib/format';
import type { CheckIn } from '../data/checkins';
import { loadWeightGoal } from '../data/weight-goal';
import { weightSummary } from '../weight-summary';
import { messages } from '../v6-messages';

const LineChart = dynamic(() => import('./line-chart').then(module => module.LineChart), {
  ssr: false, loading: () => <div aria-hidden className="aspect-[350/155]" />,
});

export function WeightOverview({ checkins, checkinError = false, onRetry, goalOnly = false }: {
  checkins?: CheckIn[]; checkinError?: boolean; onRetry: () => void; goalOnly?: boolean;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const load = useCallback(() => loadWeightGoal(), []);
  const goal = useResource(`player-weight-goal:${localDb().userId}`, load);
  const points = (checkins ?? []).flatMap(row => row.body_weight_kg === null ? [] : [{ date: row.week_start, value: row.body_weight_kg }]).reverse();
  const current = points.at(-1)?.value;
  const summary = current === undefined ? null : weightSummary(current, goal.data?.weight_kg ?? points[0]?.value ?? null, goal.data?.target_weight_kg ?? null);
  if (goalOnly) return goal.status === 'error' ? <ErrorState message={t('goalFailed')} retryLabel={t('retry')} onRetry={() => void goal.retry()} /> :
    summary?.remaining != null ? <p className="text-sm text-muted">{t('remaining', { value: formatNumber(summary.remaining, locale) })}</p> : null;
  return <section className="glass-strong space-y-stack rounded-card border border-line-soft p-card">
    <div className="flex items-center justify-between gap-stack"><h2 className="text-sm text-muted">{t('weight')}</h2>
      {current !== undefined && <b className="font-display font-extrabold tabular-nums">{formatNumber(current, locale)} {t('kg')}</b>}</div>
    {checkinError ? <ErrorState message={t('goalFailed')} retryLabel={t('retry')} onRetry={onRetry} /> :
      !checkins ? <LoadingState variant="detail" /> : current === undefined ? <p className="text-sm text-faint">{t('noWeight')}</p> :
      <LineChart points={points} title={t('weight')} unit={t('kg')} />}
    {goal.status === 'error' && <ErrorState message={t('goalFailed')} retryLabel={t('retry')} onRetry={() => void goal.retry()} />}
    {summary && <p className="flex flex-wrap gap-x-inline text-xs text-faint">
      {summary.change !== null && <span>{t(summary.change <= 0 ? 'lost' : 'gained', { value: formatNumber(Math.abs(summary.change), locale) })}</span>}
      {summary.remaining !== null && <span>{t('remaining', { value: formatNumber(summary.remaining, locale) })}</span>}
    </p>}
  </section>;
}
