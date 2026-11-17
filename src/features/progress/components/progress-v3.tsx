'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Scale } from 'lucide-react';
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
import { rangePoints, weightChange } from './progress-v3-model';
import { LineChart } from './line-chart';
import { Button, buttonClass } from '@/ui/button';
import { StatStrip } from '@/ui/stat-strip';
import type { StatStripItem } from '@/ui/stat-strip';

export function ProgressV3({ today, checkins, strength, count, checkinError, strengthError, retry, onLog }: {
  today: string; checkins?: CheckIn[]; strength?: StrengthHistory; count?: number;
  checkinError: boolean; strengthError: boolean; retry: () => void; onLog: () => void;
}) {
  const t = useT(messages);
  const old = useT(legacyMessages);
  const locale = useLocale();
  const [months, setMonths] = useState(1);
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
    <header className="flex items-center justify-between gap-inline">
      <h1 className="text-h font-black">{t('title')}</h1>
      <div role="group" aria-label={t('range')} className="glass flex rounded-control p-inline">
        {([1, 3] as const).map(value => <button key={value} type="button" aria-pressed={months === value} onClick={() => setMonths(value)} className={`min-h-12 rounded-control px-stack text-xs ${months === value ? 'bg-surface-raised font-extrabold text-ink' : 'text-muted'}`}>{t(value === 1 ? 'month' : 'quarter')}</button>)}
      </div>
    </header>
    <StatStrip items={stats} className={`${stats.length === 3 ? 'max-sm:grid-cols-3!' : ''} [&>div]:px-stack [&>div>div]:flex-wrap [&_.truncate]:whitespace-normal [&_p]:flex-wrap [&_p>span:first-child]:wrap-anywhere [&_p>span:first-child]:text-title`} />
    <section className={`${card} gap-inline`} aria-label={t('weight')}>
      <h2 className="text-row text-muted">{t('weight')}</h2>
      {latest != null && <div className="flex items-baseline gap-stack"><span dir="ltr" className="glass-strong rounded-xl font-display text-stat-wide leading-none font-extrabold">{number(latest)}</span><span className="text-row text-muted">{t('kg')}</span>
        {change && <span className="ms-auto flex h-[30px] items-center rounded-[15px] bg-water/15 px-stack text-xs font-bold text-water">{t(change.direction, { value: number(change.amount) })}</span>}</div>}
      {checkinError ? <ErrorState message={old('couldntLoadCheckinsCheckYourConnection')} retryLabel={old('tryAgain')} onRetry={retry} /> : !checkins ? <LoadingState /> : weight.length ? <LineChart points={weight} title={t('weight')} unit={t('kg')} compact="lime" showDates today={today} /> : <p className="py-page-y text-sm text-muted">{t('noWeight')}</p>}
    </section>
    <section className={`${card} gap-stack`} aria-label={t('strength')}>
      <h2 className="text-row text-muted">{t('strength')}</h2>
      <div className="flex flex-wrap gap-inline">{lifts.map(lift => <button key={lift} type="button" aria-pressed={active === lift} onClick={() => setSelected(lift)} className={`min-h-12 rounded-full px-card text-xs ${active === lift ? 'bg-lime font-extrabold text-on-lime' : 'border border-line-soft text-muted'}`}>{strength?.names[lift] || old('exercise')}</button>)}</div>
      {strengthError ? <ErrorState message={old('couldntLoadYourWorkouts')} retryLabel={old('tryAgain')} onRetry={retry} /> : !strength ? <LoadingState /> : top.length ? <>
        <div className="flex items-baseline gap-inline"><span dir="ltr" className="glass-strong rounded-xl font-display text-stat font-extrabold">{number(Math.max(...top.map(point => point.value)))}</span><span className="text-row text-muted">{t('kg')}</span>{delta !== null && <span className="ms-auto text-row font-bold text-lime">{t('delta', { value: `${delta >= 0 ? '+' : '−'}${number(Math.abs(delta))}` })}</span>}</div>
        <LineChart points={top} title={t('strength')} unit={t('kg')} compact="lime" />
      </> : <p className="py-page-y text-sm text-muted">{t('noStrength')}</p>}
    </section>
    <div className="glass flex items-center justify-between gap-stack rounded-card px-card py-stack">
      <Scale aria-hidden className="size-5 shrink-0 text-lime" />
      <h2 className="min-w-0 flex-1 text-sm font-bold">{old('sendWeeklyCheckin')}</h2>
      <Button type="button" onClick={onLog} variant="secondary" className="min-h-12 text-row font-bold">{t('log')}</Button>
    </div>
    <Link href="/player/history" className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-[60px] items-center gap-stack bg-surface px-page-x text-sm" })}><span className="flex-1">{t('history')}</span><ChevronLeft aria-hidden size={18} className="text-muted rtl:rotate-0 ltr:rotate-180" /></Link>
  </>;
}
