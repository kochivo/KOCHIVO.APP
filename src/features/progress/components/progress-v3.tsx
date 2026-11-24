'use client';
import type { ReactNode } from 'react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { daysBetween, formatDateAr } from '@/lib/dates';
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

export function ProgressV3({ today, checkins, strength, count, checkinError, strengthError, retry, onLog, logDisabled, partialStrength, sent, body, training, records }: {
  today: string; checkins?: CheckIn[]; strength?: StrengthHistory; count?: number;
  checkinError: boolean; strengthError: boolean; retry: () => void; onLog: () => void; logDisabled?: boolean; partialStrength?: ReactNode;
  sent?: boolean; body?: ReactNode; training?: ReactNode; records?: ReactNode;
}) {
  const t = useT(messages);
  const old = useT(legacyMessages);
  const v4t = useT(v4Messages);
  const locale = useLocale();
  const [months, setMonths] = useState(2);
  const [selected, setSelected] = useState('');
  const [section, setSection] = useState<'body' | 'training' | 'records'>('body');
  const lifts = mainLifts(strength?.sets ?? []);
  const active = lifts.includes(selected) ? selected : lifts[0] ?? '';
  const allTop = topSets(strength?.sets ?? [], active);
  const top = rangePoints(allTop, today, months);
  const delta = allTop.length > 1 ? trendDelta(allTop, daysBetween(allTop[0]?.date ?? today, allTop.at(-1)?.date ?? today) / 7) : null;
  const weightHistory = (checkins ?? []).flatMap(row => row.body_weight_kg == null ? [] : [{ date: row.week_start, value: row.body_weight_kg }]);
  const weight = rangePoints(weightHistory, today, months);
  const latest = checkins?.find(row => row.body_weight_kg != null);
  const change = weightChange([...weightHistory].sort((a, b) => a.date.localeCompare(b.date)).slice(-2));
  const number = (value: number) => formatNumber(value, locale);
  const volumeSets = strength?.sets.filter(set => set.weight_kg !== null && set.reps !== null) ?? [];
  const stats: StatStripItem[] = [];
  if (count !== undefined) stats.push({ label: t('workouts'), value: number(count) });
  if (volumeSets.length) stats.push({ label: t('volume'),
    value: number(volumeSets.reduce((total, set) => total + (set.weight_kg ?? 0) * (set.reps ?? 0), 0)), unit: t('kg') });
  const card = 'glass flex flex-col rounded-card p-card';
  return <>
    <header className="flex min-h-12 items-center gap-inline">
      <h1 className="min-w-0 flex-1 text-h font-extrabold">{v4t('title')}</h1>
      <CoachButton />
    </header>
    <section data-progress-section="weight" className="glass-strong space-y-stack rounded-card p-card" aria-label={t('weight')}>
      {checkinError ? <ErrorState message={old('couldntLoadCheckinsCheckYourConnection')} retryLabel={old('tryAgain')} onRetry={retry} /> : !checkins ? <LoadingState /> : <>
        {latest?.body_weight_kg != null ? <>
          <div className="flex flex-wrap items-start justify-between gap-inline">
            <div><h2 className="text-row text-muted">{v4t('lastWeight')}</h2>
              <p className="font-display text-stat font-extrabold"><bdi>{number(latest.body_weight_kg)}</bdi> <span className="text-row text-muted">{t('kg')}</span></p>
            </div>
            <time dateTime={latest.week_start} className="text-xs text-muted">{formatDateAr(latest.week_start, { day: 'numeric', month: 'short' }, locale)}</time>
          </div>
          {change && <bdi className="text-sm font-bold text-lime">{change.direction === 'down' ? '−' : '+'}{number(change.amount)} {t('kg')}</bdi>}
          {weightHistory.length < 2 && <p className="text-sm text-muted">{v4t('firstWeight')}</p>}
        </> : <p className="text-sm text-muted">{t('noWeight')}</p>}
        {sent ? <p role="status" className="text-sm text-muted">{old('sent')}</p> :
          !logDisabled && <Button type="button" block onClick={onLog}>{old('sendWeeklyCheckin')}</Button>}
      </>}
    </section>
    <div role="group" aria-label={v4t('title')} className="recessed grid grid-cols-3 gap-inline rounded-control p-inline">
      {(['body', 'training', 'records'] as const).map(key => <Button key={key} type="button" block
        variant={section === key ? 'secondary' : 'ghost'} aria-pressed={section === key} onClick={() => setSection(key)}>{v4t(key)}</Button>)}
    </div>
    <div hidden={section !== 'body'} className="space-y-card-gap">
      {rangePoints(weightHistory, today, 6).length >= 2 && !checkinError && <section className={`${card} gap-inline`}>
        <div role="group" aria-label={t('range')} className="recessed flex self-start rounded-control">
          {([2, 6] as const).map(value => <Button key={value} type="button" variant={months === value ? 'secondary' : 'ghost'}
            aria-pressed={months === value} onClick={() => setMonths(value)} className="px-stack text-xs">{v4t(value === 2 ? 'two' : 'six')}</Button>)}
        </div>
        {weight.length >= 2 ? <LineChart points={weight} title={t('weight')} unit={t('kg')} compact="lime" showDates today={today} /> :
          <p className="text-sm text-muted">{old('youNeed4WeeksToCompare')}</p>}
      </section>}
      {body}
    </div>
    <div hidden={section !== 'training'} className="space-y-card-gap">
      <StatStrip items={stats} className="[&>div]:px-stack [&>div>div]:flex-wrap [&_.truncate]:whitespace-normal" />
      <section data-progress-section="strength" className={`${card} gap-stack`} aria-label={t('strength')}>
        <h2 className="text-row font-bold">{t('strength')}</h2>
        {partialStrength}
        {lifts.length > 0 && <div className="flex flex-wrap gap-inline">{lifts.map(lift => <Button key={lift} type="button"
          variant={active === lift ? 'secondary' : 'ghost'} aria-pressed={active === lift} onClick={() => setSelected(lift)} className="text-xs">{strength?.names[lift] || old('exercise')}</Button>)}</div>}
        {strengthError ? <ErrorState message={old('couldntLoadYourWorkouts')} retryLabel={old('tryAgain')} onRetry={retry} /> : !strength ? <LoadingState /> : top.length ? <>
          <div className="flex items-baseline gap-inline"><span dir="ltr" className="glass-strong rounded-xl font-display text-stat font-extrabold">{number(Math.max(...top.map(point => point.value)))}</span><span className="text-row text-muted">{t('kg')}</span>{delta !== null && <span className="ms-auto text-row font-bold text-lime">{t('delta', { value: `${delta >= 0 ? '+' : '−'}${number(Math.abs(delta))}` })}</span>}</div>
          {top.length > 1 && <LineChart points={top} title={t('strength')} unit={t('kg')} compact="lime" />}
        </> : !partialStrength && <p className="py-page-y text-sm text-muted">{t('noStrength')}</p>}
      </section>
      {training}
    </div>
    <div hidden={section !== 'records'} className="space-y-card-gap">{records}</div>
  </>;
}
