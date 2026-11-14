'use client';
import { useCallback, useState } from 'react';
import { useResource } from '@/core/resource';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { formatTimestampAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { ErrorState, LoadingState, Button } from '@/ui';
import { loadPaymentHistory } from '../data/history';
import type { HistoryCursor } from '../data/history';
import { messages } from '../workspace/messages';
import { messages as legacyMessages } from '../messages';
import { messages as methodMessages } from '../methods/messages';

export function PaymentHistory({ playerId }: { playerId: string }) {
  const t = useT(messages), legacy = useT(legacyMessages), locale = useLocale(), timezone = useTimezone();
  const methodT = useT(methodMessages);
  const [page, setPage] = useState(0);
  const [cursors, setCursors] = useState<HistoryCursor[]>([{ payments: 0, collections: 0 }]);
  const cursor = cursors[page] ?? { payments: 0, collections: 0 };
  const load = useCallback(() => loadPaymentHistory(playerId, { payments: cursor.payments, collections: cursor.collections }), [playerId, cursor.payments, cursor.collections]);
  const history = useResource(`billing:history:${playerId}:${cursor.payments}:${cursor.collections}`, load, { staleMs: 0 });
  const rows = history.data ? [...history.data.payments.map(p => ({ ...p, kind: 'renewal' as const })),
    ...history.data.collections.map(p => ({ ...p, kind: 'collection' as const, notes: null }))].sort((a, b) => b.created_at.localeCompare(a.created_at)) : [];
  return <section className="glass rounded-card border border-line-soft p-5"><h2 className="mb-3 font-display text-[19px] font-semibold">{t('history')}</h2>
    {history.error ? <ErrorState message={t('failure')} retryLabel={t('retry')} onRetry={() => void history.retry()} />
      : !history.data ? <LoadingState variant="detail" /> : rows.length === 0 ? <p className="text-faint">{t('empty')}</p>
        : <ul>{rows.map(row => <li key={`${row.kind}:${row.id}`} className="space-y-2 border-t border-line-soft py-3 first:border-t-0">
          <div className="flex flex-wrap justify-between gap-2"><span>{t(row.kind)}</span><span className="font-display font-extrabold">{row.amount_egp === null ? legacy('noAmount') : t('money', { amount: formatNumber(row.amount_egp, locale) })}</span></div>
          <p className="text-xs text-muted">{formatTimestampAr(row.created_at, { day: 'numeric', month: 'long', year: 'numeric' }, locale, timezone)}</p>
          <p className="text-xs text-muted">{methodT('method')}: {methodT(row.method ?? 'unset')}</p>
          {row.kind === 'renewal' && <p className="text-xs text-faint">{row.period_start} · {row.period_end}</p>}
          {row.notes && <p className="text-sm text-muted">{t('notes')}: {row.notes}</p>}
        </li>)}</ul>}
    <div className="mt-3 flex gap-2">{page > 0 && <Button variant="secondary" onClick={() => setPage(value => value - 1)}>{t('previous')}</Button>}
      {history.data?.more && <Button variant="secondary" onClick={() => {
        if (!history.data) return;
        const next = history.data.next;
        setCursors(previous => [...previous.slice(0, page + 1), next]); setPage(value => value + 1);
      }}>{t('next')}</Button>}</div>
  </section>;
}
