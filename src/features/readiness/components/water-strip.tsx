'use client';

import { Droplet } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

export function WaterStrip({ waterMl, goal, onAdd, disabled = false }: {
  waterMl: number; goal: number; onAdd: () => void; disabled?: boolean;
}) {
  const t = useT(messages);
  return <section data-testid="water-strip" className="glass space-y-2 rounded-card p-4">
    <div className="flex items-center gap-3">
      <Droplet aria-hidden className="size-5 shrink-0 text-water" />
      <div className="min-w-0 flex-1"><h2>{t('water')}</h2>
        <p className="text-sm text-water">{t('litres', { value: waterMl / 1000, goal: goal / 1000 })}</p>
        <div aria-hidden className="mt-2 flex gap-1">{Array.from({ length: 12 }, (_, index) =>
          <span key={index} className={`h-1.5 flex-1 rounded-full ${waterMl >= (index + 1) * 250 ? 'bg-water' : 'bg-line'}`} />)}</div>
      </div>
      <button type="button" disabled={disabled || waterMl >= 10000} onClick={onAdd} aria-label={t('addWater')}
        className="min-h-12 min-w-12 rounded-control border border-water text-2xl text-water">{t('plus')}</button>
    </div>
    <p className="text-xs text-muted">{t('waterHint')}</p>
  </section>;
}
