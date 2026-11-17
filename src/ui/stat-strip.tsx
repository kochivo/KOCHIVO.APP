import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ProgressBar } from './progress-bar';

export type StatTone = 'ink' | 'lime' | 'warn' | 'danger' | 'info';

export interface StatStripItem {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  /** 0–100; draws the thin bar under the number. */
  percent?: number;
  tone?: StatTone;
  /** A short signed change such as "+6%". Rendered left-to-right so the sign stays put in Arabic. */
  delta?: string;
}

const valueTone: Record<StatTone, string> = {
  ink: 'text-ink', lime: 'text-lime', warn: 'text-warn', danger: 'text-danger', info: 'text-info',
};
const barTone: Record<StatTone, string> = {
  ink: '', lime: '', warn: '[&>div]:bg-warn [&>div]:bg-none', danger: '[&>div]:bg-danger [&>div]:bg-none', info: '[&>div]:bg-info [&>div]:bg-none',
};

// One card split into equal cells, so a row of numbers never leaves a lone card or empty space.
export function StatStrip({ items, className }: { items: readonly StatStripItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <section className={cn('glass hairline-cells grid overflow-hidden rounded-card', items.length > 2 && 'max-sm:grid-cols-2!', className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(item => (
        <div key={item.label} className="min-w-0 px-card pt-card pb-stack">
          <div className="flex items-center justify-between gap-inline text-xs text-muted">
            <span className="truncate">{item.label}</span>
            {item.delta && <bdi dir="ltr" className="tone-lime rounded-md px-inline text-micro font-bold tabular-nums">{item.delta}</bdi>}
          </div>
          <p className="mt-inline flex items-baseline gap-inline">
            <span className={cn('font-display text-[1.875rem] leading-none font-extrabold tracking-tight tabular-nums', valueTone[item.tone ?? 'ink'])}>{item.value}</span>
            {item.unit && <span className="text-xs text-faint">{item.unit}</span>}
          </p>
          {item.percent !== undefined && <ProgressBar thin value={item.percent} max={100} className={cn('mt-stack', barTone[item.tone ?? 'lime'])} />}
          {item.note && <p className="mt-inline text-micro text-faint">{item.note}</p>}
        </div>
      ))}
    </section>
  );
}
