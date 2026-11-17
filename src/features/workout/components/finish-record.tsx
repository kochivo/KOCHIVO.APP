'use client';
import { useLocale, useT } from '@/core/i18n/client';
import type { SetLogRow } from '@/core/offline';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { messages as v4Messages } from '../v4/messages';
import { Trophy } from 'lucide-react';

export function FinishRecord({ record, name, previous, v4 = false }: {
  record?: SetLogRow; name: string; previous?: { weight_kg: number; reps: number }; v4?: boolean;
}) {
  const t = useT(messages);
  const vt = useT(v4Messages);
  const locale = useLocale();
  if (!record) return null;
  const number = (value: number) => formatNumber(value, locale);
  if (v4) return <section className="glass flex items-center gap-stack rounded-card p-stack">
    <Trophy aria-hidden className="size-6 shrink-0 text-warn" />
    <div className="min-w-0">
      <p className="text-sm font-bold">{vt('record', { name, weight: number(record.weight_kg ?? 0), reps: number(record.reps ?? 0) })}</p>
      {previous && <p className="text-micro text-muted">{vt('previousRecord', { weight: number(previous.weight_kg), reps: number(previous.reps) })}</p>}
    </div>
  </section>;
  return <div className="flex items-center gap-stack rounded-[22px] border border-gold-2/45 bg-gold-2/10 p-card">
    <svg width="44" height="48" viewBox="0 0 52 56" aria-hidden className="shrink-0">
      <path d="M26 3l21 12v26L26 53 5 41V15z" className="fill-gold-face-1 stroke-gold-2" strokeWidth="3" />
      <path d="M26 17l3 7 7 .5-5.5 4.5 2 7L26 32l-6.5 4 2-7-5.5-4.5 7-.5z" className="fill-gold-4" />
    </svg>
    <div className="flex min-w-0 flex-1 flex-col gap-inline">
      <b className="text-md text-gold-4">{t('v3Record')}</b>
      <span className="text-row"><bdi>{name}</bdi>{' '}<bdi dir="ltr" className="font-display font-bold">
        {formatNumber(record.weight_kg ?? 0, locale)} × {formatNumber(record.reps ?? 0, locale)}
      </bdi></span>
    </div>
  </div>;
}
