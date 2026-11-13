'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
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
  const card = 'flex flex-col rounded-[26px] border border-line-soft bg-surface p-4';
  return <>
    <header className="flex items-center justify-between gap-2">
      <h1 className="text-[26px] font-black">{t('title')}</h1>
      <div role="group" aria-label={t('range')} className="flex rounded-[22px] bg-surface-raised p-1">
        {([1, 3] as const).map(value => <button key={value} type="button" aria-pressed={months === value} onClick={() => setMonths(value)} className={`min-h-12 rounded-[18px] px-3.5 text-xs ${months === value ? 'bg-ink font-extrabold text-on-lime' : 'text-muted'}`}>{t(value === 1 ? 'month' : 'quarter')}</button>)}
      </div>
    </header>
    <section className={`${card} gap-2`} aria-label={t('weight')}>
      <h2 className="text-[13px] text-muted">{t('weight')}</h2>
      {latest != null && <div className="flex items-baseline gap-2.5"><span dir="ltr" className="glass-strong rounded-xl font-display text-[40px] leading-none font-extrabold">{number(latest)}</span><span className="text-[13px] text-muted">{t('kg')}</span>
        {change && <span className="ms-auto flex h-[30px] items-center rounded-[15px] bg-water/15 px-2.5 text-xs font-bold text-water">{t(change.direction, { value: number(change.amount) })}</span>}</div>}
      {checkinError ? <ErrorState message={old('couldntLoadCheckinsCheckYourConnection')} retryLabel={old('tryAgain')} onRetry={retry} /> : !checkins ? <LoadingState /> : weight.length ? <LineChart points={weight} title={t('weight')} unit={t('kg')} compact="water" /> : <p className="py-5 text-sm text-muted">{t('noWeight')}</p>}
      <button type="button" onClick={onLog} className="min-h-12 rounded-full border border-line-soft text-[13px] font-bold">{t('log')}</button>
    </section>
    <section className={`${card} gap-2.5`} aria-label={t('strength')}>
      <h2 className="text-[13px] text-muted">{t('strength')}</h2>
      <div className="flex flex-wrap gap-1.5">{lifts.map(lift => <button key={lift} type="button" aria-pressed={active === lift} onClick={() => setSelected(lift)} className={`min-h-12 rounded-full px-3.5 text-xs ${active === lift ? 'bg-lime font-extrabold text-on-lime' : 'border border-line-soft text-muted'}`}>{strength?.names[lift] || old('exercise')}</button>)}</div>
      {strengthError ? <ErrorState message={old('couldntLoadYourWorkouts')} retryLabel={old('tryAgain')} onRetry={retry} /> : !strength ? <LoadingState /> : top.length ? <>
        <div className="flex items-baseline gap-2"><span dir="ltr" className="glass-strong rounded-xl font-display text-[32px] font-extrabold">{number(Math.max(...top.map(point => point.value)))}</span><span className="text-[13px] text-muted">{t('kg')}</span>{delta !== null && <span className="ms-auto text-[13px] font-bold text-lime">{t('delta', { value: `${delta >= 0 ? '+' : '−'}${number(Math.abs(delta))}` })}</span>}</div>
        <LineChart points={top} title={t('strength')} unit={t('kg')} compact="lime" />
      </> : <p className="py-5 text-sm text-muted">{t('noStrength')}</p>}
    </section>
    <Link href="/player/history" className="flex min-h-[60px] items-center gap-2.5 rounded-[22px] border border-line-soft bg-surface px-4 text-sm"><span className="flex-1">{t('history')}</span>{count !== undefined && <span className="font-display font-extrabold">{number(count)}</span>}<ChevronLeft aria-hidden size={18} className="text-muted rtl:rotate-0 ltr:rotate-180" /></Link>
  </>;
}
