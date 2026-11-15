'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { loadRenewalChoice, requestPlayerRenewal, decideRenewalRequest } from '../data/renewal-requests';
import { messages } from './messages';
import { PricingCards } from './pricing-cards';
import { PaymentMethodPicker } from '../components/payment-method-picker';
import type { PaymentMethod } from '../payment-methods';
import { messages as methodMessages } from '../methods/messages';
import { PlayerReceipt } from '../receipts/player-receipt';
import { loadPlayerReceipt } from '../data/receipt-actions';
import { Button } from '@/ui/button';
export function RenewalChoice() {
  const t = useT(messages);
  const methodT = useT(methodMessages);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const resource = useResource('billing:renewal-choice', loadRenewalChoice);
  const receipts = useResource('billing:player-receipt', loadPlayerReceipt);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false);
  const result = resource.data;
  async function submit(packageId: string, offerId: string | null) {
    if (result?.data?.methods.length && !result.data.methods.some(row => row.method === method)) { setError(methodT('choose')); return; }
    setBusy(true); setError('');
    try {
      const response = await requestPlayerRenewal({ packageId, offerId, method: result?.data?.methods.length ? method : null });
      if (response.error) setError(response.error);
      else { setSent(true); setOpen(false); await resource.retry(); }
    } catch { setError(t('error')); }
    finally { setBusy(false); }
  }
  const retry = <Button type="button" onClick={() => void resource.retry()} variant={'secondary'} block={false} className={"min-h-12 px-page-x"}>{t('retry')}</Button>;
  if (resource.error || result?.error) return <div role="alert" className="glass rounded-card p-card">{t('error')}{retry}</div>;
  if (!result?.data) return <p role="status" className="glass rounded-card p-card text-faint">{t('loading')}</p>;
  const data = result.data;
  return <section className="glass space-y-stack rounded-card border border-line-soft p-card">
    {sent && <p role="status" className="text-lime">{t('sent')}</p>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {data.pending ? <><p>{t('pending')}</p><Button type="button" disabled={busy || !receipts.data?.data ||
      (receipts.data.data.receipt?.status === 'pending' && receipts.data.data.receipt.renewal_request_id === data.pending)} variant={'secondary'} block={false} className={"min-h-12 px-page-x"} onClick={async () => {
      setBusy(true); setError('');
      try { const response = await decideRenewalRequest(data.pending ?? '', 'cancelled');
        if (response.error) setError(response.error); else { setSent(false); await resource.retry(); }
      } catch { setError(t('error')); } finally { setBusy(false); }
    }}>{t('cancel')}</Button></> : <Button type="button" variant={'secondary'} block={false} className={"min-h-12 px-page-x"} onClick={() => setOpen(!open)}>{t(open ? 'back' : 'renew')}</Button>}
    {open && !data.pending && <><PaymentMethodPicker methods={data.methods} value={method} onChange={setMethod} />
      <PricingCards catalog={data.catalog} name={data.name} now={data.now} isRenewal busy={busy} onChoose={(pkg, offer) => void submit(pkg, offer)} /></>}
    <PlayerReceipt renewalId={data.pending} />
  </section>;
}
