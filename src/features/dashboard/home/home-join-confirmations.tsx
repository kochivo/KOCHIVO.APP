'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { homeV11Messages } from './messages';

type Request = { id: string; name: string };

export function HomeJoinConfirmations({ requests, retryAction }: {
  requests: Request[] | null; retryAction?: () => Promise<Request[] | null>;
}) {
  const t = useT(homeV11Messages), locale = useLocale();
  const [recovered, setRecovered] = useState<Request[] | null>(null);
  const [pending, start] = useTransition();
  const rows = requests ?? recovered;
  if (!rows) return <div className="space-y-stack px-inline py-page-y">
    <p role="alert" className="text-sm text-danger">{t('requestsFailed')}</p>
    {retryAction && <Button variant="secondary" block={false} disabled={pending} onClick={() => start(async () => {
      try { setRecovered(await retryAction()); } catch { setRecovered(null); }
    })}>{t('retryRequests')}</Button>}
  </div>;
  return rows.length ? <Link href="/captain/join"
    className="flex min-h-[58px] w-full items-center gap-stack rounded-xl p-stack text-start">
    <span className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-line bg-surface-raised"><UserPlus className="size-4" aria-hidden /></span>
    <div className="min-w-0 flex-1"><b className="block text-sm font-semibold">{t('requests', { count: formatNumber(rows.length, locale) })}</b>
      <small className="block truncate text-xs text-muted">{rows.map(row => row.name).join(t('joinNames'))}</small></div>
    <span className="rounded-full bg-lime-soft px-stack py-inline text-xs font-medium text-lime">{formatNumber(rows.length, locale)}</span>
  </Link> : <p className="px-inline py-page-y text-sm text-muted">{t('noRequests')}</p>;
}
