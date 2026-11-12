'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { Macros } from '@/lib/macros';
import { ProgressBar } from '@/ui/progress-bar';
import { tileState } from './workspace-model';
import { messages } from './workspace/messages';

export function TargetTiles({ totals, targets }: { totals: Macros; targets: Macros }) {
  const t = useT(messages);
  const locale = useLocale();
  return <div className="mb-[18px] grid grid-cols-2 gap-3 min-[1001px]:grid-cols-4">
    {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => {
      const state = tileState(totals[key], targets[key]);
      return <section key={key} data-target={key} data-over={state.over} className="glass-strong min-w-0 rounded-card border border-line-soft px-4 py-3.5">
        <div className="flex justify-between gap-1 text-xs text-faint"><span>{t(key)}</span><span className={state.over ? 'font-display text-warn' : 'font-display'}>{formatNumber(state.percent, locale)}%</span></div>
        <div className="my-2 font-display text-[22px] font-extrabold tabular-nums">{formatNumber(Math.round(totals[key]), locale)} <small className="text-xs font-medium text-faint">/ {formatNumber(targets[key], locale)} {key !== 'kcal' && t('grams')}</small></div>
        <ProgressBar aria-label={t(key)} value={state.bar} max={100} className={`h-1.5 ${state.over ? '[&>div]:bg-warn' : ''}`} />
      </section>;
    })}
  </div>;
}
