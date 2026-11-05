'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../packages/messages';

export function BalanceBadges({ pending, frozenAt, sessionsLeft }: {
  pending?: boolean; frozenAt?: string | null; sessionsLeft?: number | null;
}) {
  const t = useT(messages), locale = useLocale();
  return <span className="flex flex-wrap gap-2 text-xs font-bold">
    {pending && <span className="rounded-control bg-warn-soft px-3 py-1 text-warn">{t('pending')}</span>}
    {frozenAt && <span className="rounded-control bg-water/10 px-3 py-1 text-water">{t('frozen')}</span>}
    {sessionsLeft !== null && sessionsLeft !== undefined && <span className="glass rounded-control px-3 py-1">{t('sessionsLeft', { count: formatNumber(sessionsLeft, locale) })}</span>}
  </span>;
}
