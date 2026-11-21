'use client';

import { useId, useState } from 'react';
import { Scale } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { formatDateAr, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { Segmented } from '@/ui/segmented';
import { messages } from '../../messages';
import { filterPeriod } from '../../series';
import type { ChartPeriod } from '../../series';
import type { LineChartProps } from '../line-chart';
import { ChartPlot } from './chart-plot';

export function CalmChart({ points, bodyFat = [], title, unit, compact, today, target }: LineChartProps) {
  const t = useT(messages);
  const locale = useLocale();
  const id = useId();
  const timezone = useTimezone();
  const [initialDay] = useState(() => today ?? localDate(new Date(), timezone));
  const anchor = today ?? initialDay;
  const [period, setPeriod] = useState<ChartPeriod>(() =>
    filterPeriod([...points, ...bodyFat], 'quarter', anchor).length ? 'quarter' : 'all');
  const [table, setTable] = useState(false);
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const weight = filterPeriod(sorted, period, anchor);
  const fat = filterPeriod(bodyFat, period, anchor).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length && !bodyFat.length) return <EmptyState icon={Scale} title={t('noMeasurementsYet')}
    body={t('yourFirstCheckinIsYourStartingPoint')} action={{ label: t('sendWeeklyCheckin'), href: '/player/progress' }} />;

  const date = (value: string) => formatDateAr(value, { day: 'numeric', month: 'long', year: 'numeric' }, locale);
  const format = (value: number) => formatNumber(value, locale);
  const primary = weight.length ? weight : fat;
  const latest = primary.at(-1);
  const first = sorted[0];
  const lastWeight = weight.at(-1);
  const change = first && lastWeight && first.date !== lastWeight.date
    ? Math.round((lastWeight.value - first.value) * 10) / 10 : null;
  const goal = weight.length ? target : null;
  const improving = goal != null && first && lastWeight && Math.abs(lastWeight.value - goal) < Math.abs(first.value - goal);
  const dates = [...new Set([...weight, ...fat].map(point => point.date))].sort();
  const series = [
    { points: weight, label: title, unit },
    { points: fat, label: t('bodyFat'), unit: t('percent') },
  ].filter(entry => entry.points.length);
  const latestValue = latest && <div className="flex flex-wrap items-baseline gap-inline">
    <bdi className="font-display text-stat font-extrabold tabular-nums">{format(latest.value)}</bdi>
    <span className="text-sm text-muted">{weight.length ? unit : t('percent')}</span>
  </div>;
  const singlePoint = dates.length === 1;
  const options = [
    { value: 'month', label: t('chartMonth') },
    { value: 'quarter', label: t('chartQuarter') },
    { value: 'all', label: t('chartAll') },
  ] as const;

  return <section className="glass min-w-0 space-y-stack rounded-card p-card" aria-labelledby={`${id}-heading`}>
    <header className="flex flex-wrap items-start justify-between gap-inline">
      <div>
        <h2 id={`${id}-heading`} className="text-sm text-muted">{title}</h2>
        {!singlePoint && <div className="flex flex-wrap items-baseline gap-inline">{latestValue}
          {change !== null && <span className={`rounded-md px-inline text-micro font-semibold ${improving ? 'tone-lime' : 'tone-neutral'}`}>
            {t('chartChange', { value: `\u2066${change < 0 ? '−' : change > 0 ? '+' : ''}${format(Math.abs(change))}\u2069` })}
          </span>}
        </div>}
      </div>
      <Segmented options={options} value={period} aria-label={t('chartPeriod')} phoneScroll
        onChange={value => { if (value === 'month' || value === 'quarter' || value === 'all') setPeriod(value); }} />
    </header>
    {singlePoint || !latest
      ? <div className="glass-strong grid min-h-[120px] place-content-center justify-items-center gap-inline rounded-control border border-dashed border-line p-stack text-center">
        {latestValue}
        <p className="text-sm text-muted">{t(latest ? 'chartFirst' : 'chartEmptyPeriod')}</p>
      </div>
      : <ChartPlot points={primary} secondary={weight.length ? fat : []} dates={dates}
        target={goal} compact={Boolean(compact)} today={anchor} todayLabel={t('chartToday')} locale={locale} id={id}
        percent={t('percent')} primaryIsFat={!weight.length} />}
    <p className="sr-only">{series.flatMap(entry => entry.points.map(point =>
      `${entry.label}: ${date(point.date)}: ${format(point.value)} ${entry.unit}`)).join(t('separator'))}</p>
    <footer className="flex flex-wrap items-center justify-between gap-inline">
      {latest && <ul className="flex flex-wrap items-center gap-inline text-xs text-muted">
        {weight.length > 0 && <li className="flex items-center gap-inline"><span aria-hidden className="w-3.5 border-t-2 border-lime" />{title} ({unit})</li>}
        {goal != null && !singlePoint && <li className="flex items-center gap-inline"><span aria-hidden className="w-3.5 border-t border-dashed border-muted" />
          {t('chartGoal', { value: format(goal) })}</li>}
        {fat.length > 0 && <li className="flex items-center gap-inline"><span aria-hidden className={`w-3.5 border-t-2 ${weight.length ? 'border-muted' : 'border-lime'}`} />{t('bodyFat')} ({t('percent')})</li>}
      </ul>}
      <Button variant="ghost" className="ms-auto text-xs text-muted underline" aria-expanded={table}
        aria-controls={`${id}-table`} onClick={() => setTable(value => !value)}>{t(table ? 'chartHide' : 'chartShow')}</Button>
    </footer>
    <div id={`${id}-table`} hidden={!table} className="overflow-x-auto">
      {dates.length ? <table className="w-full text-start text-sm">
        <caption className="sr-only">{title}</caption>
        <thead><tr><th scope="col">{t('weekDate')}</th>{series.map(entry =>
          <th key={entry.label} scope="col">{entry.label} ({entry.unit})</th>)}</tr></thead>
        <tbody>{dates.map(day => <tr key={day}><th scope="row">{date(day)}</th>{series.map(entry => {
          const point = entry.points.find(point => point.date === day);
          return <td key={entry.label}>{point ? format(point.value) : t('missingValue')}</td>;
        })}</tr>)}</tbody>
      </table> : <p className="text-sm text-muted">{t('chartEmptyPeriod')}</p>}
    </div>
  </section>;
}
