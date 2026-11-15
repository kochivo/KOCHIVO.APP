'use client';
import { ArrowUpRight, Clock, Activity, UserPlus, Users } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { clickableClass } from '@/ui/button';
import { messages } from '../dashboard/messages';
import type { AdminActionCounts } from '../dashboard-types';
import type { CaptainFilter } from '../dashboard-ui';

export function ActionStrip({ actions, onFilter, onRequests }: {
  actions: AdminActionCounts; onFilter: (filter: CaptainFilter) => void; onRequests: () => void;
}) {
  const t = useT(messages); const locale = useLocale();
  const cards = [
    ['pendingCaptains', 'pendingHint', actions.pendingCaptains, UserPlus],
    ['expiringSoon', 'expiringHint', actions.expiringSoon, Clock],
    ['overLimit', 'overHint', actions.overLimit, Users],
    ['quiet', 'quietHint', actions.quietPaid, Activity],
  ] as const;
  return <section aria-label={t('decisions')} className="grid grid-cols-2 gap-card-gap min-[1100px]:grid-cols-4">
    {cards.map(([key, hint, count, Icon]) => <button key={key} data-action={key} type="button"
      onClick={() => key === 'pendingCaptains' ? onRequests() : onFilter(key)}
      className={`glass-strong grid min-h-12 gap-stack rounded-card p-card text-start ${clickableClass} ${count ? 'border-lime/30' : 'text-muted'}`}>
      <span className="flex items-center justify-between gap-inline text-row font-semibold">{t(key)}<Icon aria-hidden className="size-5 shrink-0" /></span>
      <span className={`num text-stat font-extrabold ${count ? 'text-lime' : 'text-muted'}`}>{formatNumber(count, locale)}</span>
      <span className="flex items-center justify-between gap-inline text-xs text-muted">{t(hint)}<ArrowUpRight aria-hidden className="dir-icon size-4 shrink-0" /></span>
    </button>)}
  </section>;
}
