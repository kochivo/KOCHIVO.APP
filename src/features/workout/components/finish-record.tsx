'use client';
import { useLocale, useT } from '@/core/i18n/client';
import type { SetLogRow } from '@/core/offline';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

export function FinishRecord({ record, name }: { record?: SetLogRow; name: string }) {
  const t = useT(messages);
  const locale = useLocale();
  if (!record) return null;
  return <div className="flex items-center gap-3 rounded-[22px] border border-gold-2/45 bg-gold-2/10 p-3.5">
    <svg width="44" height="48" viewBox="0 0 52 56" aria-hidden className="shrink-0">
      <path d="M26 3l21 12v26L26 53 5 41V15z" className="fill-gold-face-1 stroke-gold-2" strokeWidth="3" />
      <path d="M26 17l3 7 7 .5-5.5 4.5 2 7L26 32l-6.5 4 2-7-5.5-4.5 7-.5z" className="fill-gold-4" />
    </svg>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <b className="text-[15px] text-gold-4">{t('v3Record')}</b>
      <span className="text-[13px]"><bdi>{name}</bdi>{' '}<bdi dir="ltr" className="font-display font-bold">
        {formatNumber(record.weight_kg ?? 0, locale)} × {formatNumber(record.reps ?? 0, locale)}
      </bdi></span>
    </div>
  </div>;
}
