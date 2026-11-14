'use client';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResource } from '@/core/resource';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { decidePaymentReceipt, listPaymentReceipts } from '../data/receipt-actions';
import { messages } from './messages';
import { ReceiptReviewRow } from './review-row';
import type { ReceiptReview } from './types';
export function CaptainReceipts() {
  const t = useT(messages), locale = useLocale(), router = useRouter();
  const load = useCallback(() => listPaymentReceipts(), []), resource = useResource(`billing:receipts:${locale}`, load, { pollMs: 60_000 });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const lock = useRef(false);
  const rows = resource.data?.data;
  async function decide(receipt: ReceiptReview, days: number | null, reason?: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const ok = await resource.mutate(current => ({ data: (current?.data ?? []).filter(row => row.id !== receipt.id), error: undefined }), async () => {
        const result = await decidePaymentReceipt({ id: receipt.id, photo: receipt.photo_path, revision: receipt.revision, days, ...(reason === undefined ? {} : { reason }) });
        if (result.error) throw new Error(result.error);
      });
      if (!ok) { setError(t('error')); await resource.retry(); }
      else { setNotice(t('saved')); await resource.retry(); router.refresh(); }
    } catch { setError(t('error')); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="glass rounded-card border border-line-soft p-[18px]" aria-busy={busy}>
    <header className="mb-2 flex items-center justify-between gap-3"><h2 className="font-semibold">{t('title')}</h2>
      {rows && <span className="rounded-full bg-surface-raised px-3 py-1 text-xs tabular-nums">{formatNumber(rows.length, locale)}</span>}</header>
    {error && <p role="alert" className="text-danger">{error}</p>}{notice && <p role="status" className="text-muted">{notice}</p>}
    {resource.error || resource.data?.error ? <div role="alert">{t('loadError')}<button className="min-h-12 px-4" onClick={() => void resource.retry()}>{t('retry')}</button></div>
      : !rows ? <p role="status" className="py-4 text-muted">{t('loading')}</p>
        : rows.length ? <ul>{rows.map((receipt, index) => <ReceiptReviewRow key={receipt.id} receipt={receipt} first={index === 0} busy={busy} onDecide={decide} />)}</ul>
          : <p className="py-4 text-sm text-faint">{t('empty')}</p>}
  </section>;
}
