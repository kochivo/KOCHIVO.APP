'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { Macros } from '@/lib/macros';
import { ProgressBar } from '@/ui/progress-bar';
import { tileState } from './workspace-model';
import { messages } from './workspace/messages';

export function TargetTiles({ totals, targets, incomplete = false }: { totals: Macros; targets: Macros; incomplete?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  return <div className="mb-card-gap grid grid-cols-2 gap-stack min-[1001px]:grid-cols-4">
    {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => {
      const state = tileState(totals[key], targets[key]);
      return <section key={key} data-target={key} data-over={state.over} className="glass-strong min-w-0 rounded-card border border-line-soft px-page-x py-card">
        <div className="flex justify-between gap-inline text-xs text-faint"><span>{t(key)}</span><span className="font-display">{formatNumber(targets[key], locale)} {key !== 'kcal' && t('grams')}</span></div>
        <div className="my-inline font-display text-h font-extrabold tabular-nums">{formatNumber(Math.round(totals[key]), locale)} <small className="text-xs font-medium text-faint">{t(key === 'kcal' ? 'calorieUnit' : 'grams')}</small></div>
        {incomplete && <p className="mb-inline text-xs text-warn">{t('incomplete')}</p>}
        <ProgressBar aria-label={t(key)} value={state.bar} max={100} className={`h-1.5 ${state.over ? '[&>div]:bg-warn' : ''}`} />
      </section>;
    })}
  </div>;
}
