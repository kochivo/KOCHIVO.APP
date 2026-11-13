'use client';
import type { Macros } from '@/lib/macros';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../v6-messages';

export function MacroTiles({ eaten, target }: { eaten: Macros; target: Macros }) {
  const t = useT(messages);
  const locale = useLocale();
  const left = target.kcal - eaten.kcal;
  return <section aria-label={t('calories')} className="glass-strong flex flex-col gap-3.5 rounded-[28px] border border-line-soft bg-surface! p-[18px] shadow-none">
    <div className="flex items-baseline gap-2">
      <strong className={`font-[family-name:var(--font-manrope)] text-[44px] leading-none font-extrabold tabular-nums ${left < 0 ? 'text-warn' : ''}`}>
        <bdi>{left < 0 ? t('over', { value: formatNumber(-left, locale) }) : formatNumber(left, locale)}</bdi>
      </strong>
      <span className="text-sm text-muted">{t('leftOf', { target: formatNumber(target.kcal, locale) })}</span>
    </div>
    <div className="grid grid-cols-3 gap-2.5">{(['protein', 'carbs', 'fat'] as const).map(key => {
      const percent = target[key] > 0 ? Math.min(100, Math.max(0, eaten[key] / target[key] * 100)) : eaten[key] > 0 ? 100 : 0;
      return <div key={key} className="flex min-w-0 flex-col gap-1.5">
        <span className="text-xs text-muted">{t(key)}</span>
        <div role="progressbar" aria-label={t(key)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}
          aria-valuetext={t('grams', { eaten: formatNumber(eaten[key], locale), target: formatNumber(target[key], locale) })}
          className="h-2 overflow-hidden rounded bg-line">
          <div className={`h-full rounded ${key === 'protein' ? 'bg-lime' : key === 'carbs' ? 'bg-ink' : 'bg-sore'}`} style={{ width: `${percent}%` }} />
        </div>
        <bdi className="font-[family-name:var(--font-manrope)] text-[13px] font-bold">{formatNumber(eaten[key], locale)}<span className="text-muted">/{formatNumber(target[key], locale)}</span></bdi>
      </div>;
    })}</div>
  </section>;
}
