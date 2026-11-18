'use client';
import { useId, useState } from 'react';
import { Scale } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import { Button, EmptyState } from '@/ui';
import { messages } from '../messages';
import { messages as chartMessages } from '../player-v3-messages';
import { scaleSeries } from '../series';
import type { TrendPoint } from '../trends';
import { CalmChart } from './chart/calm-chart';

export type LineChartProps = {
  points: readonly TrendPoint[]; bodyFat?: readonly TrendPoint[]; title: string; unit: string;
  compact?: 'water' | 'lime'; showDates?: boolean; today?: string; target?: number | null;
};

export function LineChart(props: LineChartProps) {
  return process.env.NEXT_PUBLIC_CAPTAIN_WORKSPACE === '1' ? <CalmChart {...props} /> : <LegacyChart {...props} />;
}

function LegacyChart({ points, bodyFat = [], title, unit, compact, showDates = false, today }: LineChartProps) {
  const t = useT(messages);
  const ct = useT(chartMessages);
  const locale = useLocale();
  const id = useId();
  const [table, setTable] = useState(false);
  if (compact && points.length) {
    const height = showDates ? 120 : compact === 'water' ? 70 : 80;
    const values = points.map(point => point.value);
    const min = Math.min(...values);
    const span = Math.max(...values) - min || 1;
    const coordinates = points.map((point, index) => ({ x: points.length === 1 ? 160 : 5 + index * 310 / (points.length - 1), y: height - 10 - (point.value - min) / span * (height - 20) }));
    const end = coordinates.at(-1);
    const ticks = points.filter((_, index) => index === 0 || index === points.length - 1 || (points.length > 2 && index === Math.floor((points.length - 1) / 2)));
    return <div><svg width="100%" height={height} viewBox={`0 0 320 ${height}`} preserveAspectRatio="none" role="img" aria-label={`${title}: ${points.map(point => `${point.date}: ${formatNumber(point.value, locale)} ${unit}`).join(t('separator'))}`} className={compact === 'water' ? 'text-water' : 'text-lime'}>
      {showDates && [height / 3, height * 2 / 3].map(y => <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="currentColor" className="text-line-soft" />)}
      <polyline points={coordinates.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {end && (!showDates || points.length === 1) && <circle cx={end.x} cy={end.y} r="5" fill="currentColor" />}
    </svg>{showDates && <div dir="ltr" className="flex justify-between gap-inline text-micro text-muted">{ticks.map(point => <time dir="auto" key={point.date} dateTime={point.date}>{point.date === today ? ct('chartToday') : formatDateAr(point.date, { day: 'numeric', month: 'short' }, locale)}</time>)}</div>}</div>;
  }
  const weeks = [...new Set([...points, ...bodyFat].map(point => point.date))].sort();
  if (!weeks.length) return <EmptyState icon={Scale} title={t('noMeasurementsYet')} body={t('yourFirstCheckinIsYourStartingPoint')} action={{ label: t('sendWeeklyCheckin'), href: '/player/progress' }} />;
  const series = [
    { points: scaleSeries(points, weeks, locale === 'ar'), label: title, unit, className: 'text-lime' },
    { points: scaleSeries(bodyFat, weeks, locale === 'ar'), label: t('bodyFat'), unit: t('percent'), className: 'text-muted' },
  ];
  const date = (value: string) => formatDateAr(value, { day: 'numeric', month: 'long', year: 'numeric' }, locale);
  return <div className="glass space-y-stack rounded-control p-stack">
    <svg viewBox="0 0 350 160" role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-summary`} className="w-full">
      <title id={`${id}-title`}>{title}</title>
      <line x1="25" x2="325" y1="125" y2="125" stroke="currentColor" className="text-line" />
      {series.map((series, index) => {
        if (!series.points.length) return null;
        const values = series.points.map(point => point.value);
        const x = (index === 0) !== (locale === 'ar') ? 2 : 348;
        return <g key={`${series.label}-scale`} className={series.className}>
          {[Math.max(...values), Math.min(...values)].map((value, row) => <text key={row} x={x} y={row === 0 ? 15 : 122} textAnchor={x === 2 ? 'start' : 'end'} fill="currentColor" className="text-[10px]">{formatNumber(value, locale)} {series.unit}</text>)}
        </g>;
      })}
      {series.map(series => <g key={series.label} className={series.className}>
        <polyline points={series.points.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        {series.points.map(point => <circle key={point.date} cx={point.x} cy={point.y} r="4" fill="currentColor" />)}
      </g>)}
      {weeks.map((week, index) => {
        if (index !== 0 && index !== weeks.length - 1 && index % Math.ceil(weeks.length / 4) !== 0) return null;
        const x = weeks.length === 1 ? 175 : 35 + index * 280 / (weeks.length - 1);
        return <text key={week} x={locale === 'ar' ? 350 - x : x} y="148" textAnchor="middle" fill="currentColor" className="text-muted text-xs">{t('weekLabel', { count: formatNumber(index + 1, locale) })}</text>;
      })}
    </svg>
    <div className="flex flex-wrap gap-stack text-sm">{series.map(series => {
      const last = series.points.at(-1);
      return last ? <p key={series.label} className={series.className}>{series.label}: {formatNumber(last.value, locale)} {series.unit}</p> : null;
    })}</div>
    <p id={`${id}-summary`} className="sr-only">{series.flatMap(series => series.points.map(point => `${series.label}: ${date(point.date)}: ${formatNumber(point.value, locale)} ${series.unit}`)).join(t('separator'))}</p>
    <Button variant="secondary" aria-expanded={table} aria-controls={`${id}-table`} onClick={() => setTable(value => !value)}>{t(table ? 'hideTable' : 'showTable')}</Button>
    <div id={`${id}-table`} hidden={!table} className="overflow-x-auto">
      <table className="w-full text-start text-sm">
        <caption className="sr-only">{title}</caption>
        <thead><tr><th scope="col">{t('weekDate')}</th>{series.map(series => <th key={series.label} scope="col">{series.label} ({series.unit})</th>)}</tr></thead>
        <tbody>{weeks.map(week => <tr key={week}><th scope="row">{date(week)}</th>{series.map(series => {
          const point = series.points.find(point => point.date === week);
          return <td key={series.label}>{point ? formatNumber(point.value, locale) : t('missingValue')}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>
  </div>;
}
