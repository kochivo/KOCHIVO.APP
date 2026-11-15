'use client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { messages } from '../methods/messages';
import type { AcceptedMethod, PaymentMethod } from '../payment-methods';
import { Button } from '@/ui/button';

export function PaymentMethodPicker({ methods, value, onChange, optional = false }: {
  methods: AcceptedMethod[]; value: PaymentMethod | null; onChange: (value: PaymentMethod | null) => void; optional?: boolean;
}) {
  const t = useT(messages);
  const [feedback, setFeedback] = useState('');
  const selected = methods.find(row => row.method === value);
  if (!methods.length) return null;
  return <fieldset className="space-y-2">
    <legend className="mb-2 text-sm font-semibold">{t('method')}</legend>
    <select aria-label={t('method')} required={!optional} value={value ?? ''} onChange={event => { onChange(methods.find(row => row.method === event.target.value)?.method ?? null); setFeedback(''); }}
      className={captainWorkspaceEnabled() ? `${editableFieldClass} glass min-h-12 w-full rounded-control border border-line px-3` : "glass min-h-12 w-full rounded-control border border-line px-3"}>
      <option value="">{t(optional ? 'unset' : 'choose')}</option>
      {methods.map(row => <option key={row.method} value={row.method}>{t(row.method)}</option>)}
    </select>
    {selected?.account_detail && <div className="glass-strong flex items-center justify-between gap-3 rounded-control p-3">
      <span dir="ltr" className="break-all font-display tabular-nums">{selected.account_detail}</span>
      <Button type="button" variant={'secondary'} block={false} className={"min-h-12 shrink-0 px-4"} onClick={async () => {
        try { await navigator.clipboard.writeText(selected.account_detail ?? ''); setFeedback(t('copied')); }
        catch { setFeedback(t('copyFailed')); }
      }}>{t('copy')}</Button>
    </div>}
    {feedback && <p role="status" className="text-sm text-muted">{feedback}</p>}
  </fieldset>;
}
