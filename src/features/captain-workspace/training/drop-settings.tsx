'use client';
import { useLocale, useT } from '@/core/i18n/client';
import type { DropConfig } from '@/lib/set-plan';
import { dropWeights } from '@/lib/set-plan';
import { messages } from '@/lib/training/messages';
import { formatNumber } from '@/lib/format';
import { Stepper } from '@/ui/stepper';
import { Button } from '@/ui/button';

export function DropSettings({ drop, onChange }: { drop?: DropConfig; onChange: (drop?: DropConfig) => void }) {
  const t = useT(messages), locale = useLocale();
  const change = (patch: Partial<DropConfig>) => { if (drop) onChange({ ...drop, ...patch }); };
  return <div className="space-y-stack rounded-control border border-line-soft p-stack text-start">
    <Button type="button" variant="secondary" aria-pressed={Boolean(drop)} onClick={() => onChange(drop ? undefined : { count: 2, percent: 20, mode: 'failure', reps: null })}
      className={drop ? 'text-warn' : ''}>{t('drop')}</Button>
    {drop && <>
      <p className="text-xs text-muted">{t('hint')}</p>
      <Stepper size="compact" label={t('count')} value={drop.count} min={1} max={3} step={1} onChange={count => change({ count: Math.round(count) })} />
      <Stepper size="compact" label={t('percent')} value={drop.percent} min={10} max={40} step={5} format={n => `${n}%`}
        onChange={percent => change({ percent: Math.round(percent / 5) * 5 })} />
      <div className="flex gap-inline">{(['failure', 'reps'] as const).map(mode => <Button key={mode} type="button" variant="secondary"
        aria-pressed={drop.mode === mode} className="flex-1" onClick={() => change({ mode, reps: mode === 'reps' ? drop.reps ?? 8 : null })}>{t(mode)}</Button>)}</div>
      {drop.mode === 'reps' && <Stepper size="compact" label={t('reps')} value={drop.reps ?? 8} min={1} max={50} step={1}
        onChange={reps => change({ reps: Math.round(reps) })} />}
      <p className="rounded-control bg-warn-soft p-stack text-xs text-warn">{t('example', {
        weights: [60, ...dropWeights(60, drop.count, drop.percent)].map(n => formatNumber(n, locale)).join(locale === 'ar' ? ' ← ' : ' → '),
      })}</p>
    </>}
  </div>;
}
