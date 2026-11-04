'use client';
import { useId, useState } from 'react';
import { Scale } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import { Button, EmptyState } from '@/ui';
import { messages } from '../messages';
import { scaleSeries } from '../series';
import type { TrendPoint } from '../trends';

export function LineChart({ points, bodyFat = [], title, unit }: {
  points: readonly TrendPoint[]; bodyFat?: readonly TrendPoint[]; title: string; unit: string;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const id = useId();
  const [table, setTable] = useState(false);
  const weeks = [...new Set([...points, ...bodyFat].map(point => point.date))].sort();
  if (!weeks.length) return <EmptyState icon={Scale} title={t('noMeasurementsYet')} body={t('yourFirstCheckinIsYourStartingPoint')} action={{ label: t('sendWeeklyCheckin'), href: '/player/progress' }} />;
  const series = [
    { points: scaleSeries(points, weeks, locale === 'ar'), label: title, unit, className: 'text-lime' },
    { points: scaleSeries(bodyFat, weeks, locale === 'ar'), label: t('bodyFat'), unit: t('percent'), className: 'text-muted' },
  ];
  const date = (value: string) => formatDateAr(value, { day: 'numeric', month: 'long', year: 'numeric' }, locale);
  return <div className="glass space-y-3 rounded-control p-3">
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
    <div className="flex flex-wrap gap-3 text-sm">{series.map(series => {
      const last = series.points.at(-1);
      return last ? <p key={series.label} className={series.className}>{series.label}: {formatNumber(last.value, locale)} {series.unit}</p> : null;
    })}</div>
    <p id={`${id}-summary`} className="sr-only">{series.flatMap(series => series.points.map(point => `${series.label}: ${date(point.date)}: ${formatNumber(point.value, locale)} ${series.unit}`)).join(t('separator'))}</p>
    <Button variant="ghost" aria-expanded={table} aria-controls={`${id}-table`} onClick={() => setTable(value => !value)}>{t(table ? 'hideTable' : 'showTable')}</Button>
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
