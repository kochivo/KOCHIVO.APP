'use client';
import { IconButton } from '@/ui/icon-button';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/ui/button';
import { TextField } from '@/ui';
import type { PaymentMethod } from '../payment-methods';
import { ManualPaymentMethod } from './manual-payment-method';

interface Props {
  name: string;
  due: number;
  onClose: () => void;
  onSave: (amount: number, method?: PaymentMethod | null) => void;
  busy?: boolean;
  error?: string;
}

export function CollectSheet({ name, due, onClose, onSave, busy, error }: Props) {
  const t = useT(messages);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState(String(due));
  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isInteger(value) && value >= 1 && value <= due;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby="collect-heading" onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line bg-surface p-section text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-card">
      <div className="mb-section flex items-center justify-between gap-card-gap">
        <h2 id="collect-heading" className="text-2xl font-extrabold">{t('collectTitle', { name })}</h2>
        {captainWorkspaceEnabled() ? <IconButton aria-label={t('closeCollect')} onClick={onClose} className="min-h-12 min-w-12 px-0"><X aria-hidden className="size-5" /></IconButton> : <Button variant="ghost" aria-label={t('closeCollect')} onClick={onClose} className="min-h-12 min-w-12 px-0"><X aria-hidden className="size-5" /></Button>}
      </div>
      <form className="space-y-card-gap" onSubmit={(event) => { event.preventDefault(); if (valid && !busy) onSave(value, method); }}>
        <ManualPaymentMethod value={method} onChange={setMethod} />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <TextField label={t('collectAmount')} type="number" inputMode="numeric" min={1} max={due} step={1} required autoFocus
          value={amount} onChange={(event) => setAmount(event.target.value)}
          hint={t('collectHint', { amount: formatNumber(due, locale) })} error={amount.trim() !== '' && !valid ? t('collectTooMuch') : undefined} />
        <p aria-live="polite" className="glass-strong rounded-control p-card text-sm">
          {valid && value < due ? t('remainingAfter', { amount: formatNumber(due - value, locale) }) : t('paidInFull')}
        </p>
        <Button type="submit" disabled={!valid || busy} className="min-h-12 w-full">{t('collect')}</Button>
      </form>
    </dialog>
  );
}
