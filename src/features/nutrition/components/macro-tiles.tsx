'use client';
import type { Macros } from '@/lib/macros';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { StatStrip } from '@/ui/stat-strip';
import { messages } from '../v6-messages';

export function MacroTiles({ eaten, target }: { eaten: Macros; target: Macros }) {
  const t = useT(messages);
  const locale = useLocale();
  const left = target.kcal - eaten.kcal;
  const number = (value: number) => formatNumber(value, locale);
  const macros = (['protein', 'carbs', 'fat'] as const).map(key => ({
    key, eaten: number(eaten[key]), target: number(target[key]),
    percent: target[key] > 0 ? eaten[key] / target[key] * 100 : eaten[key] > 0 ? 100 : 0,
  }));
  return <section aria-label={t('calories')} className="glass-strong cut-corner grid grid-cols-[auto_minmax(0,1fr)] items-center gap-stack rounded-card p-card">
    <div className="flex min-w-0 flex-col gap-inline">
      <strong className={`font-[family-name:var(--font-manrope)] text-stat leading-none font-extrabold tabular-nums ${left < 0 ? 'text-warn' : 'engraved'}`}>
        <bdi>{left < 0 ? t('over', { value: formatNumber(-left, locale) }) : formatNumber(left, locale)}</bdi>
      </strong>
      <span className="text-micro text-muted">{t('leftOf', { target: formatNumber(target.kcal, locale) })}</span>
    </div>
    <ul className="sr-only">{macros.map(macro => <li key={macro.key}>{t(macro.key)} <bdi>{t('grams', macro)}</bdi></li>)}</ul>
    <div aria-hidden className="min-w-0"><StatStrip className="grid-cols-1! border-0 bg-none! shadow-none! max-sm:grid-cols-1! [&>div]:grid [&>div]:grid-cols-[1fr_auto] [&>div]:items-center [&>div]:gap-x-inline [&>div]:border-s-0 [&>div]:p-0 [&>div+div]:pt-inline [&_p]:mt-0 [&_span]:text-xs [&_[role=progressbar]]:col-span-full [&_[role=progressbar]]:mt-0"
      items={macros.map(macro => ({
        label: t(macro.key),
        value: <bdi>{macro.eaten}/{macro.target}</bdi>,
        percent: macro.percent,
        tone: macro.key === 'protein' ? 'lime' : macro.key === 'carbs' ? 'info' : 'warn',
      }))} /></div>
  </section>;
}
