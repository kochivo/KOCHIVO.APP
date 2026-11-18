import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import type { Locale } from '@/core/i18n/locale';
import { dateTicks, yTicks } from '../../series';
import type { TrendPoint } from '../../trends';

export function ChartPlot({ points, secondary, dates, target, compact, today, todayLabel, locale, id }: {
  points: readonly TrendPoint[]; secondary: readonly TrendPoint[]; dates: readonly string[];
  target?: number | null; compact: boolean; today: string; todayLabel: string; locale: Locale; id: string;
}) {
  const ticks = yTicks(points.map(point => point.value), target);
  const fatTicks = secondary.length ? yTicks(secondary.map(point => point.value)) : ticks;
  const rtl = locale === 'ar';
  const y = (value: number, [max, , min]: typeof ticks) => 10 + (max - value) / (max - min) * 80;
  const coordinates = (series: readonly TrendPoint[], scale: typeof ticks) => series.map(point => {
    const offset = 2 + dates.indexOf(point.date) / (dates.length - 1) * 96;
    return { x: rtl ? 100 - offset : offset, y: y(point.value, scale), offset };
  });
  const line = coordinates(points, ticks);
  const fatLine = coordinates(secondary, fatTicks);
  const first = line[0];
  const last = line.at(-1);
  const pairs = (coords: typeof line) => coords.map(point => `${point.x},${point.y}`).join(' ');
  const goalY = target == null ? null : y(target, ticks);
  const labels = dateTicks(dates);
  return <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)_auto] gap-inline">
    <div className={compact ? 'relative h-[120px]' : 'relative h-[140px] min-[760px]:h-[180px]'}>
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
      {last && <span className="absolute size-2.5 -ms-1.25 -translate-y-1/2 rounded-full bg-lime ring-4 ring-bg"
        style={{ insetInlineStart: `${last.offset}%`, insetBlockStart: `${last.y}%` }} />}
    </div>
    <div className="relative grid min-w-8 text-end font-display text-micro tabular-nums text-muted">
      {ticks.map(tick => <span key={tick} className="absolute end-0 -translate-y-1/2"
        style={{ insetBlockStart: `${y(tick, ticks)}%` }}>{formatNumber(tick, locale)}</span>)}
      {ticks.map(tick => <span key={tick} className="invisible col-start-1 row-start-1">{formatNumber(tick, locale)}</span>)}
    </div>
    <div className="flex justify-between gap-inline whitespace-nowrap text-micro text-muted">
      {labels.map((date, index) => <time key={date} dateTime={date}
        className={index === 0 || index === labels.length - 1 ? undefined : 'hidden min-[760px]:inline'}>
        {date === today ? todayLabel : formatDateAr(date, { day: 'numeric', month: 'long' }, locale)}
      </time>)}
    </div>
  </div>;
}
