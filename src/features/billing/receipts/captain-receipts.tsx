'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResource } from '@/core/resource';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { decidePaymentReceipt, listPaymentReceipts } from '../data/receipt-actions';
import { messages } from './messages';
import { ReceiptReviewRow } from './review-row';
import { WorkspaceBillingTask } from '../components/workspace-billing-task';
import type { ReceiptReview } from './types';
export function CaptainReceipts({ workspace = false }: { workspace?: boolean }) {
  const t = useT(messages), locale = useLocale(), router = useRouter();
  const load = useCallback(() => listPaymentReceipts(), []), resource = useResource(`billing:receipts:${locale}`, load, { pollMs: 60_000 });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const lock = useRef(false);
  const rows = resource.data?.data;
  const linkedReceipt = useRef('');
  useEffect(() => {
    if (!workspace) return;
    function revealReceipt() {
      const id = window.location.hash.slice(1);
      if (!id.startsWith('receipt-')) { linkedReceipt.current = ''; return; }
      if (linkedReceipt.current === id) return;
      const target = document.getElementById(id);
      const list = target?.closest('details');
      if (!target || !list) return;
      list.open = true;
      target.scrollIntoView({ block: 'nearest' });
      linkedReceipt.current = id;
    }
    revealReceipt();
    window.addEventListener('hashchange', revealReceipt);
    return () => window.removeEventListener('hashchange', revealReceipt);
  }, [workspace, rows]);
  async function decide(receipt: ReceiptReview, days: number | null, reason?: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const ok = await resource.mutate(current => ({ data: (current?.data ?? []).filter(row => row.id !== receipt.id), error: undefined }), async () => {
        const result = await decidePaymentReceipt({ id: receipt.id, photo: receipt.photo_path, revision: receipt.revision, days, ...(reason === undefined ? {} : { reason }) });
        if (result.error) { setError(result.error); throw new Error(result.error); }
      });
      if (!ok) { setError(current => current || t('error')); await resource.retry(); }
      else { setNotice(t('saved')); await resource.retry(); router.refresh(); }
    } catch { setError(t('error')); }
    finally { lock.current = false; setBusy(false); }
  }
  if (workspace) return <>
    {error && <p data-billing-feedback role="alert" className="px-card text-danger">{error}</p>}
    {notice && <p data-billing-feedback role="status" className="px-card text-sm text-muted">{notice}</p>}
    {resource.error || resource.data?.error ? <div data-billing-feedback role="alert" className="px-card text-sm">
      {t('loadError')}<button type="button" className="min-h-12 px-page-x underline" onClick={() => void resource.retry()}>{t('retry')}</button>
    </div> : !rows ? <p data-billing-feedback role="status" className="px-card text-sm text-muted">{t('loading')}</p>
      : rows.length > 0 && <WorkspaceBillingTask label={t('title')} count={formatNumber(rows.length, locale)}>
        <ul aria-busy={busy}>{rows.map(receipt => <ReceiptReviewRow key={receipt.id} receipt={receipt} first={false} busy={busy} onDecide={decide} />)}</ul>
      </WorkspaceBillingTask>}
  </>;
  return <section className="glass rounded-card border border-line-soft p-card" aria-busy={busy}>
    <header className="mb-inline flex items-center justify-between gap-stack"><h2 className="font-semibold">{t('title')}</h2>
      {rows && <span className="rounded-full bg-surface-raised px-stack py-inline text-xs tabular-nums">{formatNumber(rows.length, locale)}</span>}</header>
    {error && <p role="alert" className="text-danger">{error}</p>}{notice && <p role="status" className="text-muted">{notice}</p>}
    {resource.error || resource.data?.error ? <div role="alert">{t('loadError')}<button className="min-h-12 px-page-x" onClick={() => void resource.retry()}>{t('retry')}</button></div>
      : !rows ? <p role="status" className="py-page-y text-muted">{t('loading')}</p>
        : rows.length ? <ul>{rows.map((receipt, index) => <ReceiptReviewRow key={receipt.id} receipt={receipt} first={index === 0} busy={busy} onDecide={decide} />)}</ul>
          : <p className="py-page-y text-sm text-faint">{t('empty')}</p>}
  </section>;
}
