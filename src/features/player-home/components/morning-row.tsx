'use client';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { ChevronLeft, Moon } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { localDb, useLiveQuery } from '@/core/offline';
import { readDailyCheck } from '@/features/readiness';
import { formatNumber } from '@/lib/format';
import { messages } from '../v6-messages';
import { messages as copy } from '../v4/messages';

export function MorningRow({ children, playerId, today, rest }: {
  children?: ReactNode; playerId?: string; today: string; rest?: boolean;
}) {
  const t = useT(messages);
  const v4 = useT(copy);
  const locale = useLocale();
  const read = useCallback(() => playerId ? readDailyCheck(localDb(), playerId, today) : Promise.resolve(null), [playerId, today]);
  const row = useLiveQuery(read);
  return <details id="home-morning" className="glass rounded-card">
    <summary className="press flex min-h-16 cursor-pointer list-none items-center gap-stack rounded-card px-card py-stack text-sm font-bold">
      <Moon aria-hidden className="size-5 shrink-0 text-lime" />
      <span className="min-w-0 flex-1">
        {v4('readiness')}
        <span className="block text-xs font-normal text-muted">{row?.sleep_hours == null || row.soreness == null
          ? t('morning') : v4('sleep', { hours: formatNumber(row.sleep_hours, locale) })}</span>
        {rest && row !== undefined && <span className="block text-xs font-normal text-muted">
          {v4('waterLogged', { litres: formatNumber((row?.water_ml ?? 0) / 1000, locale) })}
        </span>}
      </span>
      <ChevronLeft aria-hidden className="size-4 text-faint ltr:rotate-180" />
    </summary>
    <div className="space-y-stack px-card pb-card">{children}</div>
  </details>;
}
