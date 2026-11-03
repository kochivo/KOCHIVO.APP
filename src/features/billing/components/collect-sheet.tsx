'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button, TextField } from '@/ui';

interface Props {
  name: string;
  due: number;
  onClose: () => void;
  onSave: (amount: number) => void;
}

export function CollectSheet({ name, due, onClose, onSave }: Props) {
  const t = useT(messages);
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
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line bg-surface p-6 text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-card">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="collect-heading" className="text-2xl font-extrabold">{t('collectTitle', { name })}</h2>
        <Button variant="ghost" aria-label={t('closeCollect')} onClick={onClose} className="min-h-12 min-w-12 px-0"><X aria-hidden className="size-5" /></Button>
      </div>
      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (valid) onSave(value); }}>
        <TextField label={t('collectAmount')} type="number" inputMode="numeric" min={1} max={due} step={1} required autoFocus
          value={amount} onChange={(event) => setAmount(event.target.value)}
          hint={t('collectHint', { amount: formatNumber(due, locale) })} error={amount.trim() !== '' && !valid ? t('collectTooMuch') : undefined} />
        <p aria-live="polite" className="glass-strong rounded-control p-4 text-sm">
          {valid && value < due ? t('remainingAfter', { amount: formatNumber(due - value, locale) }) : t('paidInFull')}
        </p>
        <Button type="submit" disabled={!valid} className="min-h-12 w-full">{t('collect')}</Button>
      </form>
    </dialog>
  );
}
