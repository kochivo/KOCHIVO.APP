'use client';

import { Droplet } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

export function WaterGlass({ waterMl, goal, onAdd, disabled = false }: {
  waterMl: number; goal: number; onAdd: () => void; disabled?: boolean;
}) {
  const t = useT(messages);
  return <section data-testid="water-glass" className="glass-strong flex items-center gap-card-gap rounded-card p-card">
    <div aria-hidden className="relative h-28 w-20 overflow-hidden rounded-b-3xl rounded-t-control border-2 border-water/50">
      <div className="absolute inset-x-0 bottom-0 bg-water/40 transition-all motion-reduce:transition-none" style={{ height: `${Math.min(waterMl / goal, 1) * 100}%` }} />
      <Droplet className="absolute inset-0 m-auto size-8 text-water" />
    </div>
    <div className="flex-1 space-y-inline"><h2>{t('water')}</h2>
      <p className="font-display text-2xl text-water">{t('litres', { value: waterMl / 1000, goal: goal / 1000 })}</p>
      <button type="button" disabled={disabled || waterMl >= 10000} onClick={onAdd}
        className="min-h-12 rounded-control border border-water px-page-x font-bold text-water">{t('addWater')}</button>
    </div>
  </section>;
}
