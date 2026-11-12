'use client';
import type { Macros } from '@/lib/macros';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { ProgressBar } from '@/ui/progress-bar';
import { messages } from '../v6-messages';

export function MacroTiles({ eaten, target }: { eaten: Macros; target: Macros }) {
  const t = useT(messages);
  const locale = useLocale();
  return <section aria-label={t('today')} className="space-y-3">
    <div className="grid grid-cols-2 gap-3">{(['kcal', 'protein'] as const).map(key =>
      <div key={key} className="glass-strong min-w-0 space-y-3 rounded-card border border-line-soft p-4">
        <h2 className="text-xs text-muted">{t(key)}</h2>
        <p className="font-display text-[28px] font-extrabold tabular-nums">{formatNumber(eaten[key], locale)} <small className="text-xs font-normal text-faint">/ {formatNumber(target[key], locale)}</small></p>
        <ProgressBar value={eaten[key]} max={target[key] || 1} aria-label={t(key)} className={eaten[key] > target[key] ? '[&>div]:bg-warn' : undefined} />
      </div>)}</div>
    <p className="text-xs text-faint">{t('otherMacros', { carbs: formatNumber(eaten.carbs, locale), carbsTarget: formatNumber(target.carbs, locale),
      fat: formatNumber(eaten.fat, locale), fatTarget: formatNumber(target.fat, locale) })}</p>
  </section>;
}
