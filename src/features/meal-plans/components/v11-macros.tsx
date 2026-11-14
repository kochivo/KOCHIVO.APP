'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { Macros } from '@/lib/macros';
import { calorieState } from './v11-model';
import { V11Ring } from './v11-ring';
import { messages } from './v11/messages';

export function V11Macros({ totals, targets }: { totals: Macros; targets: Macros }) {
  const t = useT(messages), locale = useLocale();
  const n = (value: number) => formatNumber(Math.round(value), locale);
  const state = calorieState(totals.kcal, targets.kcal);
  return <section className="glass-strong flex items-center gap-4 rounded-card border border-line-soft p-5">
    <V11Ring value={n(totals.kcal)} progress={state.progress} />
    <div className="grid min-w-0 flex-1 gap-2">
      <p className="text-xs text-muted">{t('target', { n: n(targets.kcal) })} · <span className={state.over ? 'text-warn' : ''}>{state.over ? t('over') : t('remaining', { n: n(state.remaining) })}</span></p>
      {(['protein', 'carbs', 'fat'] as const).map(key => <div key={key} className="grid gap-1">
        <div className="flex justify-between gap-2 text-xs"><span className="text-muted">{t(key)}</span><b className="font-display tabular-nums">{n(totals[key])}/{n(targets[key])}</b></div>
        <div role="progressbar" aria-label={t(key)} aria-valuenow={Math.round(totals[key])} aria-valuemin={0} aria-valuemax={Math.max(targets[key], Math.round(totals[key]))} className="h-1.5 overflow-hidden rounded-full bg-surface">
          <div style={{ width: `${calorieState(totals[key], targets[key]).progress * 100}%` }} className={`h-full rounded-full ${key === 'protein' ? 'bg-lime' : key === 'carbs' ? 'bg-calm' : 'bg-warn'}`} />
        </div>
      </div>)}
    </div>
  </section>;
}
