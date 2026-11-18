'use client';
import type { ReactNode } from 'react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { KoPlus } from '@/ui/icons';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { daysBetween } from '@/lib/dates';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import type { CheckIn } from '../data/checkins';
import type { StrengthHistory } from '../data/strength';
import { mainLifts, topSets, trendDelta } from '../trends';
import { messages } from '../player-v3-messages';
import { messages as legacyMessages } from '../messages';
import { messages as v4Messages } from '../player-v4/messages';
import { rangePoints, weightChange } from './progress-v3-model';
import { LineChart } from './line-chart';
import { Button } from '@/ui/button';
import { StatStrip } from '@/ui/stat-strip';
import type { StatStripItem } from '@/ui/stat-strip';

const CoachButton = dynamic(() => import('@/features/player-shell').then(module => module.CoachButton), { ssr: false });

export function ProgressV3({ today, checkins, strength, count, checkinError, strengthError, retry, onLog, logDisabled, partialStrength }: {
  today: string; checkins?: CheckIn[]; strength?: StrengthHistory; count?: number;
  checkinError: boolean; strengthError: boolean; retry: () => void; onLog: () => void; logDisabled?: boolean; partialStrength?: ReactNode;
}) {
  const t = useT(messages);
  const old = useT(legacyMessages);
  const v4t = useT(v4Messages);
  const locale = useLocale();
  const [months, setMonths] = useState(2);
  const [selected, setSelected] = useState('');
  const lifts = mainLifts(strength?.sets ?? []);
  const active = lifts.includes(selected) ? selected : lifts[0] ?? '';
  const allTop = topSets(strength?.sets ?? [], active);
  const top = rangePoints(allTop, today, months);
  const delta = allTop.length > 1 ? trendDelta(allTop, daysBetween(allTop[0]?.date ?? today, allTop.at(-1)?.date ?? today) / 7) : null;
  const weight = rangePoints((checkins ?? []).flatMap(row => row.body_weight_kg == null ? [] : [{ date: row.week_start, value: row.body_weight_kg }]), today, months);
  const latest = checkins?.find(row => row.body_weight_kg != null)?.body_weight_kg;
  const change = weightChange(weight);
  const number = (value: number) => formatNumber(value, locale);
  const volumeSets = strength?.sets.filter(set => set.weight_kg !== null && set.reps !== null) ?? [];
  const stats: StatStripItem[] = [];
  if (latest != null) stats.push({ label: t('weight'), value: number(latest), unit: t('kg'),
    delta: change ? `${change.direction === 'down' ? '−' : '+'}${number(change.amount)}` : undefined });
  if (count !== undefined) stats.push({ label: t('workouts'), value: number(count) });
  if (volumeSets.length) stats.push({ label: t('volume'),
    value: number(volumeSets.reduce((total, set) => total + (set.weight_kg ?? 0) * (set.reps ?? 0), 0)), unit: t('kg') });
  const card = 'glass flex flex-col rounded-card p-card';
  return <>
    <header className="flex min-h-12 items-center gap-inline">
      <div className="min-w-0 flex-1"><h1 className="text-h font-extrabold">{v4t('title')}</h1>
        <p className="text-xs text-muted">{v4t(months === 2 ? 'recent' : 'six')}</p></div>
      <Button type="button" variant="secondary" aria-label={old('sendWeeklyCheckin')} onClick={onLog} disabled={logDisabled} className="size-12 shrink-0 px-0"><KoPlus aria-hidden className="size-5" /></Button>
      <CoachButton />
    </header>
    <StatStrip items={stats} className={`${stats.length === 3 ? 'max-sm:grid-cols-3!' : ''} [&>div]:px-stack [&>div>div]:flex-wrap [&_.truncate]:whitespace-normal [&_p]:flex-wrap [&_p>span:first-child]:wrap-anywhere [&_p>span:first-child]:text-title`} />
    <section data-progress-section="weight" className={`${card} gap-inline`} aria-label={t('weight')}>
      <div className="flex flex-wrap items-center justify-between gap-inline">
        <h2 className="text-row font-bold">{t('weight')}</h2>
        <div role="group" aria-label={t('range')} className="recessed flex rounded-control">
          {([2, 6] as const).map(value => <Button key={value} type="button" variant={months === value ? 'secondary' : 'ghost'}
            aria-pressed={months === value} onClick={() => setMonths(value)} className="px-stack text-xs">{v4t(value === 2 ? 'two' : 'six')}</Button>)}
        </div>
      </div>
      {checkinError ? <ErrorState message={old('couldntLoadCheckinsCheckYourConnection')} retryLabel={old('tryAgain')} onRetry={retry} /> : !checkins ? <LoadingState /> : weight.length ? <LineChart points={weight} title={t('weight')} unit={t('kg')} compact="lime" showDates today={today} /> : <p className="py-page-y text-sm text-muted">{t('noWeight')}</p>}
    </section>
    <section data-progress-section="strength" className={`${card} gap-stack`} aria-label={t('strength')}>
      <h2 className="text-row font-bold">{t('strength')}</h2>
      {partialStrength}
      {lifts.length > 0 && <div className="flex flex-wrap gap-inline">{lifts.map(lift => <Button key={lift} type="button"
        variant={active === lift ? 'secondary' : 'ghost'} aria-pressed={active === lift} onClick={() => setSelected(lift)} className="text-xs">{strength?.names[lift] || old('exercise')}</Button>)}</div>}
      {strengthError ? <ErrorState message={old('couldntLoadYourWorkouts')} retryLabel={old('tryAgain')} onRetry={retry} /> : !strength ? <LoadingState /> : top.length ? <>
        <div className="flex items-baseline gap-inline"><span dir="ltr" className="glass-strong rounded-xl font-display text-stat font-extrabold">{number(Math.max(...top.map(point => point.value)))}</span><span className="text-row text-muted">{t('kg')}</span>{delta !== null && <span className="ms-auto text-row font-bold text-lime">{t('delta', { value: `${delta >= 0 ? '+' : '−'}${number(Math.abs(delta))}` })}</span>}</div>
        <LineChart points={top} title={t('strength')} unit={t('kg')} compact="lime" />
      </> : !partialStrength && <p className="py-page-y text-sm text-muted">{t('noStrength')}</p>}
    </section>
  </>;
}
