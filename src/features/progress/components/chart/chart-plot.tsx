import { useEffect, useRef, useState } from 'react';
import { daysBetween, formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import type { Locale } from '@/core/i18n/locale';
import { dateTicks, yTicks } from '../../series';
import type { TrendPoint } from '../../trends';

export function ChartPlot({ points, secondary, dates, target, compact, today, todayLabel, locale, id, percent, primaryIsFat }: {
  points: readonly TrendPoint[]; secondary: readonly TrendPoint[]; dates: readonly string[];
  target?: number | null; compact: boolean; today: string; todayLabel: string; locale: Locale; id: string;
  percent: string; primaryIsFat: boolean;
}) {
  const ticks = yTicks(points.map(point => point.value), target);
  const fatTicks = secondary.length ? yTicks(secondary.map(point => point.value)) : null;
  const rtl = locale === 'ar';
  const start = dates[0];
  const end = dates.at(-1);
  const span = start && end ? daysBetween(start, end) : 0;
  const offsetOf = (date: string) => span && start ? 2 + daysBetween(start, date) / span * 96 : 50;
  const y = (value: number, [max, , min]: typeof ticks) => 10 + (max - value) / (max - min) * 80;
  const coordinates = (series: readonly TrendPoint[], scale: typeof ticks) => series.map(point => {
    const offset = offsetOf(point.date);
    return { x: rtl ? 100 - offset : offset, y: y(point.value, scale), offset };
  });
  const line = coordinates(points, ticks);
  const fatLine = fatTicks ? coordinates(secondary, fatTicks) : [];
  const fatPoint = fatLine.length === 1 ? fatLine[0] : null;
  const first = line[0];
  const last = line.at(-1);
  const pairs = (coords: typeof line) => coords.map(point => `${point.x},${point.y}`).join(' ');
  const goalY = target == null ? null : y(target, ticks);
  const labels = dateTicks(dates);
  const labelRow = useRef<HTMLDivElement>(null);
  const [visibleDates, setVisibleDates] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    const row = labelRow.current;
    if (!row) return;
    const times = [...row.querySelectorAll('time')];
    const measure = () => {
      const bounds = row.getBoundingClientRect();
      const visible = new Set<string>();
      const occupied: DOMRect[] = [];
      const last = times.at(-1);
      // Reserve the endpoints before trying the interior labels.
      for (const time of [times[0], last, ...times.slice(1, -1)]) {
        if (!time || visible.has(time.dateTime) || time.offsetWidth === 0) continue;
        const rect = time.getBoundingClientRect();
        if (rect.left < bounds.left || rect.right > bounds.right ||
            occupied.some(other => rect.left < other.right + 8 && rect.right + 8 > other.left)) continue;
        visible.add(time.dateTime);
        occupied.push(rect);
      }
      setVisibleDates(visible);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    times.forEach(time => observer.observe(time));
    return () => observer.disconnect();
  }, [dates, locale, today, todayLabel]);

  const axis = (scale: typeof ticks, unit = '', atStart = false) => {
    const label = (tick: number) => `${formatNumber(tick, locale)}${unit}`;
    return <div className={`relative row-start-1 grid min-w-8 font-display text-micro tabular-nums text-muted ${atStart ? 'col-start-1 text-start' : fatTicks ? 'col-start-3 text-end' : 'col-start-2 text-end'}`}>
      {scale.map(tick => <bdi key={tick} className={`absolute -translate-y-1/2 ${atStart ? 'start-0' : 'end-0'}`}
        style={{ insetBlockStart: `${y(tick, scale)}%` }}>{label(tick)}</bdi>)}
      {scale.map(tick => <bdi key={tick} className="invisible col-start-1 row-start-1">{label(tick)}</bdi>)}
    </div>;
  };
  const plotColumn = fatTicks ? 'col-start-2' : 'col-start-1';
  return <div aria-hidden="true" dir={rtl ? 'rtl' : 'ltr'}
    className={`grid gap-inline ${fatTicks ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'}`}>
    <div className={`relative row-start-1 ${plotColumn} ${compact ? 'h-[120px]' : 'h-[140px] min-[760px]:h-[180px]'}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="block size-full text-lime">
        <defs><linearGradient id={`${id}-fill`} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity=".18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient></defs>
        {[25, 50, 75].map(gridY => <line key={gridY} x1="0" x2="100" y1={gridY} y2={gridY}
          className="stroke-line-soft" vectorEffect="non-scaling-stroke" />)}
        {first && last && line.length > 1 && <polygon points={`${pairs(line)} ${last.x},100 ${first.x},100`} fill={`url(#${id}-fill)`} />}
        {goalY !== null && <line x1="0" x2="100" y1={goalY} y2={goalY} className="stroke-muted/60"
          strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />}
        {fatLine.length > 1 && <polyline points={pairs(fatLine)} className="stroke-muted" fill="none"
          strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {line.length > 1 && <polyline points={pairs(line)} stroke="currentColor" fill="none"
          strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      </svg>
      {fatPoint && <span className="absolute size-2.5 -ms-1.25 -translate-y-1/2 rounded-full bg-muted ring-4 ring-bg"
        style={{ insetInlineStart: `${fatPoint.offset}%`, insetBlockStart: `${fatPoint.y}%` }} />}
      {last && <span className="absolute size-2.5 -ms-1.25 -translate-y-1/2 rounded-full bg-lime ring-4 ring-bg"
        style={{ insetInlineStart: `${last.offset}%`, insetBlockStart: `${last.y}%` }} />}
    </div>
    {axis(ticks, primaryIsFat ? percent : '', Boolean(fatTicks))}
    {fatTicks && axis(fatTicks, percent)}
    <div ref={labelRow} className={`relative row-start-2 grid whitespace-nowrap text-micro text-muted ${plotColumn}`}>
      <span aria-hidden>&nbsp;</span>
      {labels.map(date => <time key={date} dateTime={date}
        className={`absolute ${date === start || date === end ? '' : 'hidden min-[760px]:inline'}`}
        style={{
          insetInlineStart: `${offsetOf(date)}%`,
          translate: `${!span || (date !== start && date !== end) ? (rtl ? 50 : -50) : date === end ? (rtl ? 100 : -100) : 0}%`,
          visibility: (visibleDates ? visibleDates.has(date) : date === start || date === end) ? undefined : 'hidden',
        }}>
        {date === today ? todayLabel : formatDateAr(date, { day: 'numeric', month: 'long' }, locale)}
      </time>)}
    </div>
  </div>;
}
