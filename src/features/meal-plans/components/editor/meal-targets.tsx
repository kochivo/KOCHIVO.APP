'use client';
import { useT } from '@/core/i18n/client';
import type { Macros } from '@/lib/macros';
import { V11Ring } from '../v11-ring';
import { messages } from './redesign/messages';
import { messages as labels } from '../v11/messages';

export function MealTargets({ totals, targets, onChange }: { totals: Macros; targets: Macros; onChange: (targets: Macros) => void }) {
  const t = useT(messages), label = useT(labels);
  return <section className="glass-strong flex flex-wrap items-center gap-4 rounded-card p-4">
    <V11Ring value={String(Math.round(totals.kcal))} progress={Math.min(1, totals.kcal / targets.kcal)} />
    <div className="grid min-w-0 flex-1 gap-2"><div className="flex flex-wrap justify-between gap-2"><b>{t('targets')}</b><small className="text-muted">{t('hint')}</small></div>
      <div className="grid grid-cols-2 gap-2 min-[1000px]:grid-cols-4">{(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <label key={key} data-target={key} className="recessed grid rounded-control border border-line p-2 text-xs text-muted">{label(key)}
        <input type="number" min={key === 'kcal' ? 800 : 0} max={key === 'kcal' ? 8000 : 32767} step={1} value={targets[key]} onChange={event => {
          const value = event.target.valueAsNumber;
          if (Number.isInteger(value) && value >= (key === 'kcal' ? 800 : 0) && value <= (key === 'kcal' ? 8000 : 32767)) onChange({ ...targets, [key]: value });
        }} className="min-h-12 w-full rounded-control bg-transparent font-display text-title text-ink focus-visible:ring-2 focus-visible:ring-lime" />
      </label>)}</div>
      <small className="text-muted">{t('remaining', { k: Math.round(targets.kcal - totals.kcal), p: Math.round(totals.protein), t: targets.protein })}</small>
    </div>
  </section>;
}
