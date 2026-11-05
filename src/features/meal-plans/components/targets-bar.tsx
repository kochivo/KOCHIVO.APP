'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { Button } from '@/ui';
import type { Macros } from '@/lib/macros';
import { macroTargetsFromKcal, targetDelta } from '../totals';


export function TargetsBar({ targets, totals, onChange }: { targets: Macros; totals: Macros; onChange: (targets: Macros) => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const labels = { kcal: t('calories'), protein: t('protein'), carbs: t('carbs2'), fat: t('fat2') };
  const delta = targetDelta(totals, targets);
  return <section aria-label={t('targetsAndTotals')} className="glass-strong grid gap-4 rounded-card p-5">
    <h2 className="text-xl font-bold">{t('targetsAndTotals')}</h2>
    {(Object.keys(labels) as (keyof Macros)[]).map(key => <div key={key} className="grid gap-2">
      <label className="flex items-center justify-between gap-3">{labels[key]}
        <input type="number" min={key === 'kcal' ? 800 : 0} max={key === 'kcal' ? 8000 : 32767} step={1}
          value={targets[key]} onChange={event => onChange({ ...targets, [key]: Number(event.target.value) })}
          className="min-h-12 w-28 rounded-control border border-line bg-surface px-3" />
      </label>
      <output aria-live="polite" className="text-2xl font-bold">{formatNumber(totals[key], locale)} / {formatNumber(targets[key], locale)} {key === 'kcal' ? t('kcal') : t('g2')}</output>
      <span className={Math.abs(delta[key]) <= targets[key] * .05 ? 'text-lime' : 'text-warn'}>
         {t('difference')} {delta[key] > 0 ? '+' : ''}{formatNumber(Math.round(delta[key] * 10) / 10, locale)}
      </span>
    </div>)}
    <Button variant="secondary" className="min-h-12" onClick={() => onChange(macroTargetsFromKcal(targets.kcal))}>{t('calculateFromCalories')}</Button>
  </section>;
}
