'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import type { AcceptedMethod, PaymentMethod } from '@/features/billing';
import { messages } from '../payment-methods/messages';
import { savePaymentMethod } from '../data/payment-methods';

export function PaymentMethodRow({ method, initial, position, onSaved }: {
  method: PaymentMethod; initial?: AcceptedMethod; position: number; onSaved: (row: AcceptedMethod, enabled: boolean) => void;
}) {
  const t = useT(messages);
  const [enabled, setEnabled] = useState(Boolean(initial));
  const [detail, setDetail] = useState(initial?.account_detail ?? '');
  const [stored, setStored] = useState({ enabled: Boolean(initial), detail: initial?.account_detail ?? '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(false);
  async function persist(nextEnabled: boolean) {
    if (nextEnabled && method !== 'cash' && !detail.trim()) { setError(true); return; }
    setBusy(true); setError(false);
    try {
      const result = await savePaymentMethod({ enabled: nextEnabled, row: { method, account_detail: detail.trim() || null, position } });
      if (!result.ok) { setEnabled(stored.enabled); setDetail(stored.detail); setError(true); }
      else { setStored({ enabled: nextEnabled, detail }); onSaved({ method, account_detail: detail.trim() || null, position }, nextEnabled); }
    } catch { setEnabled(stored.enabled); setDetail(stored.detail); setError(true); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2 border-t border-line-soft py-3 first:border-t-0" aria-busy={busy}>
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={`method-${method}`} className="flex min-h-12 flex-1 items-center text-sm">{t(method)}</label>
      {enabled && method !== 'cash' && <input aria-label={t('account')} dir="ltr" maxLength={80} required disabled={busy} value={detail}
        className="glass min-h-12 min-w-0 flex-1 rounded-control border border-line px-2 text-start font-display text-xs tabular-nums"
        onChange={event => setDetail(event.target.value)} onBlur={() => { if (detail !== stored.detail || enabled !== stored.enabled) void persist(true); }} />}
      <button id={`method-${method}`} type="button" role="switch" aria-checked={enabled} aria-label={t(method)} disabled={busy}
        className="flex min-h-12 min-w-12 items-center justify-center" onClick={() => {
          const next = !enabled; setEnabled(next); void persist(next);
        }}><span className={`flex h-6 w-11 items-center rounded-full border border-line p-1 ${enabled ? 'bg-lime-soft' : 'bg-surface-raised'}`}>
          <span className={`size-4 rounded-full ${enabled ? 'ms-auto bg-lime' : 'bg-muted'}`} />
        </span></button>
    </div>
    {error && <p role="alert" className="text-xs text-danger">{t('error')}</p>}
  </div>;
}
