'use client';
import { useLocale, useT } from '@/core/i18n/client';
import type { Macros } from '@/lib/macros';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { targetStatus } from '../editor-rules';

export function LiveTargets({ totals, targets }: { totals: Macros; targets: Macros }) {
  const t = useT(messages);
  const locale = useLocale();
  const labels = { kcal: t('calories'), protein: t('protein'), carbs: t('carbs2'), fat: t('fat2') };
  return <section aria-label={t('targetsAndTotals')} className="glass-strong sticky top-0 z-10 grid grid-cols-2 gap-4 rounded-card p-4 lg:grid-cols-4">
    {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => {
      const status = targetStatus(totals[key], targets[key]);
      const percent = targets[key] > 0 ? Math.round(totals[key] / targets[key] * 100) : totals[key] > 0 ? 100 : 0;
      return <div key={key} className={status === 'within' ? 'text-lime' : status === 'over' ? 'text-warn' : 'text-muted'}>
        <div className="flex justify-between gap-2"><span>{labels[key]}</span><span>{formatNumber(percent, locale)}%</span></div>
        <output aria-live="polite" className="block text-xl font-bold tabular-nums">{formatNumber(totals[key], locale)} / {formatNumber(targets[key], locale)}</output>
        <progress aria-label={labels[key]} max={100} value={Math.min(100, percent)} className="h-2 w-full accent-current" />
      </div>;
    })}
  </section>;
}
