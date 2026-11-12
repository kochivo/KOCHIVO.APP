'use client';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { warmupMinutes, type DayWarmup } from '@/features/programs';
import { formatNumber } from '@/lib/format';
import { messages } from '../warmup/messages';

export function WarmupCard({ warmup, checked, disabled, onToggle }: {
  warmup: DayWarmup; checked: readonly string[]; disabled: boolean; onToggle: (id: string) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  if (!warmup.items.length) return null;
  return <section id="warmup-checklist" aria-label={t('title', { step: formatNumber(1, locale) })}
    className="glass rounded-[22px] border border-warn/35 px-5 py-[18px]">
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs text-warn">{t('title', { step: formatNumber(1, locale) })}</span>
      <span className="text-xs tabular-nums text-faint">{t('min', { amount: formatNumber(warmupMinutes(warmup), locale) })}</span>
    </div>
    <ul className="divide-y divide-line-soft">{warmup.items.map(item => {
      const done = checked.includes(item.id);
      return <li key={item.id}>
        <label className="flex min-h-12 cursor-pointer items-center gap-2.5 py-2 text-[13px]">
          <span className="relative flex size-[26px] shrink-0 items-center justify-center">
            <input type="checkbox" checked={done} disabled={disabled} onChange={() => onToggle(item.id)}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0" />
            <span aria-hidden className={`flex size-full items-center justify-center rounded-lg border peer-focus-visible:ring-2 peer-focus-visible:ring-lime ${done
              ? 'border-lime bg-lime text-on-lime' : 'border-line text-muted'}`}>
              {done && <Check aria-hidden className="size-4" />}
            </span>
          </span>
          <span className="min-w-0 flex-1">{item.name}{item.note && <small className="mt-1 block text-xs text-faint">{item.note}</small>}</span>
          <bdi className="shrink-0 tabular-nums text-faint">{t(item.unit, { amount: formatNumber(item.amount, locale) })}</bdi>
        </label>
      </li>;
    })}</ul>
  </section>;
}
