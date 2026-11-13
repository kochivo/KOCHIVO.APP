'use client';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { warmupMinutes, type DayWarmup } from '@/features/programs';
import { formatNumber } from '@/lib/format';
import { messages } from '../warmup/messages';
import { messages as workoutMessages } from '../messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function WarmupCard({ warmup, checked, disabled, onToggle }: {
  warmup: DayWarmup; checked: readonly string[]; disabled: boolean; onToggle: (id: string) => void;
}) {
  const t = useT(messages);
  const wt = useT(workoutMessages);
  const v3 = captainWorkspaceEnabled();
  const locale = useLocale();
  if (!warmup.items.length) return null;
  return <section id="warmup-checklist" aria-label={t('title', { step: formatNumber(1, locale) })}
    className={v3 ? 'rounded-[24px] border border-line-soft bg-surface px-4 py-3.5' : 'glass rounded-[22px] border border-warn/35 px-5 py-[18px]'}>
    <div className={`${v3 ? 'mb-2' : 'mb-1.5'} flex items-center justify-between gap-2`}>
      <span className={v3 ? 'text-[15px] font-bold' : 'rounded-full bg-warn-soft px-2.5 py-1 text-xs text-warn'}>{v3 ? wt('v3Warmup') : t('title', { step: formatNumber(1, locale) })}</span>
      <span className={v3 ? 'text-xs text-sore' : 'text-xs tabular-nums text-faint'}>{v3 ? wt('v3Minutes', { minutes: formatNumber(warmupMinutes(warmup), locale) }) : t('min', { amount: formatNumber(warmupMinutes(warmup), locale) })}</span>
    </div>
    <ul className={v3 ? 'space-y-0' : 'divide-y divide-line-soft'}>{warmup.items.map(item => {
      const done = checked.includes(item.id);
      return <li key={item.id}>
        <label className={`flex min-h-12 cursor-pointer items-center gap-2.5 ${v3 ? 'text-sm' : 'py-2 text-[13px]'}`}>
          <span className={v3 ? 'relative flex size-12 shrink-0 items-center justify-center' : 'relative flex size-[26px] shrink-0 items-center justify-center'}>
            <input type="checkbox" checked={done} disabled={disabled} onChange={() => onToggle(item.id)}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0" />
            <span aria-hidden className={`flex ${v3 ? 'size-6 rounded-full' : 'size-full rounded-lg'} items-center justify-center border peer-focus-visible:ring-2 peer-focus-visible:ring-lime ${done
              ? 'border-lime bg-lime text-on-lime' : 'border-line text-muted'}`}>
              {done && <Check aria-hidden className="size-4" />}
            </span>
          </span>
          <span className="min-w-0 flex-1">{item.name}{item.note && <small className="mt-1 block text-xs text-faint">{item.note}</small>}</span>
          <bdi className={v3 ? 'shrink-0 text-xs text-muted tabular-nums' : 'shrink-0 tabular-nums text-faint'}>{t(item.unit, { amount: formatNumber(item.amount, locale) })}</bdi>
        </label>
      </li>;
    })}</ul>
  </section>;
}
