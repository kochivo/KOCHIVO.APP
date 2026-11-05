'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import type { Macros } from '@/lib/macros';
import { formatNumber } from '@/lib/format';

const ratio = (value: number, target: number) => target > 0 ? Math.min(1, Math.max(0, value / target)) : 0;

export function MacroRing({ eaten, target }: { eaten: Macros; target: Macros }) {
  const t = useT(messages);
  const locale = useLocale();
  return <section className="glass-strong flex items-center gap-5 rounded-card p-5" aria-label={t('todaysNutrition')}>
    <div className="relative size-32 shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 116 116" aria-hidden="true">
        <circle cx="58" cy="58" r="50" fill="none" className="stroke-muted/20" strokeWidth="9" />
        <circle cx="58" cy="58" r="50" fill="none" className="progress-ring" strokeWidth="9"
          strokeLinecap="round" strokeDasharray={`${ratio(eaten.kcal, target.kcal) * 314.16} 314.16`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <strong className="text-3xl font-extrabold"><bdi>{formatNumber(eaten.kcal, locale)}</bdi></strong>
        <span className="text-xs text-muted"><bdi>/ {formatNumber(target.kcal, locale)}</bdi> {t('kcal')}</span>
      </div>
    </div>
    <div className="min-w-0 flex-1 space-y-4">
      {(['protein', 'carbs', 'fat'] as const).map((key, i) => <div key={key} className="space-y-1">
        <div className="flex flex-wrap justify-between gap-1 text-xs">
          <span>{[t('protein'), t('carbs'), t('fat')][i]}</span><span className="text-muted">{formatNumber(eaten[key], locale)} / {formatNumber(target[key], locale)}{t('g')}</span>
        </div>
        <div role="progressbar" aria-label={[t('protein'), t('carbs'), t('fat')][i]} aria-valuemin={0}
          aria-valuemax={100} aria-valuenow={Math.round(ratio(eaten[key], target[key]) * 100)}
          aria-valuetext={t('macroAmount', { value0: formatNumber(eaten[key], locale), value1: formatNumber(target[key], locale) })} className="h-1.5 overflow-hidden rounded-full bg-muted/20">
          <div className="h-full rounded-full progress-lime" style={{ width: `${ratio(eaten[key], target[key]) * 100}%` }} />
        </div>
      </div>)}
    </div>
  </section>;
}
