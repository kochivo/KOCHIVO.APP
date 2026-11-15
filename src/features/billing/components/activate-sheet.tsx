'use client';
import { editableFieldClass } from '@/ui/edit-in-place';
import { IconButton } from '@/ui/icon-button';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { Chip, Segmented, Stepper, TextField } from '@/ui';
import { messages } from '../packages/messages';
import type { Activation } from '../pt-types';
import type { Package } from '../types';
import type { PaymentMethod } from '../payment-methods';
import { ManualPaymentMethod } from './manual-payment-method';

export function ActivateSheet({ packages, busy = false, error, onClose, onSave, selectedPackageId }: {
  packages: Package[]; busy?: boolean; error?: string; onClose: () => void; onSave: (input: Activation) => void; selectedPackageId?: string;
}) {
  const t = useT(messages);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = packages.find(p => p.id === selectedPackageId);
  const [kind, setKind] = useState<'days' | 'sessions'>(selected?.kind ?? 'days');
  const [quantity, setQuantity] = useState(selected ? selected.kind === 'sessions' ? selected.sessions ?? 1 : selected.days : 30);
  const [packageId, setPackageId] = useState<string | null>(selected?.id ?? null);
  const [price, setPrice] = useState(String(selected?.price_egp ?? 0));
  const [paid, setPaid] = useState('0');
  const [freeTrial, setFreeTrial] = useState(false);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  function pick(id: string) {
    const pkg = packages.find(row => row.id === id);
    setPackageId(pkg?.id ?? null);
    if (pkg) { setKind(pkg.kind ?? 'days'); setQuantity(pkg.kind === 'sessions' ? pkg.sessions ?? 1 : pkg.days);
      setPrice(String(pkg.price_egp)); setPaid('0'); setFreeTrial(false); }
  }
  const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= (kind === 'sessions' ? 200 : 365)
    && price.trim() !== '' && paid.trim() !== '' && Number.isInteger(Number(price)) && Number(price) >= 0 && Number(price) <= 100000
    && Number.isInteger(Number(paid)) && Number(paid) >= 0 && Number(paid) <= Number(price);
  return <dialog ref={dialog} aria-labelledby="activate-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line p-section text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-card">
    <header className="flex items-center justify-between gap-stack"><h2 id="activate-title" className="text-2xl font-bold">{t('activate')}</h2>
      {captainWorkspaceEnabled() ? <IconButton aria-label={t('close')} disabled={busy} onClick={onClose} className="min-h-12 min-w-12"><X aria-hidden /></IconButton> : <Button variant="ghost" aria-label={t('close')} disabled={busy} onClick={onClose} className="min-h-12 min-w-12"><X aria-hidden /></Button>}</header>
    <form className="mt-card-gap space-y-card-gap" onSubmit={event => { event.preventDefault(); if (valid && !busy) onSave({ kind, quantity, packageId, price: Number(price), paid: Number(paid), freeTrial, method }); }}>
      <ManualPaymentMethod value={method} onChange={setMethod} />
      <label className="block space-y-inline"><span>{t('package')}</span><select aria-label={t('package')} value={packageId ?? ''} onChange={event => pick(event.target.value)} className={captainWorkspaceEnabled() ? `${editableFieldClass} min-h-12 w-full rounded-control border border-line bg-surface p-stack` : "min-h-12 w-full rounded-control border border-line bg-surface p-stack"}>
        <option value="">{t('custom')}</option>{packages.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}</select></label>
      <Segmented aria-label={t('kind')} value={kind} options={[{ value: 'days', label: t('byDays') }, { value: 'sessions', label: t('bySessions') }]}
        onChange={value => { setKind(value as 'days' | 'sessions'); setPackageId(null); setQuantity(1); }} />
      <Stepper label={t('quantity')} value={quantity} step={1} min={1} max={kind === 'sessions' ? 200 : 365} onChange={value => { setQuantity(value); setPackageId(null); }} />
      {kind === 'sessions' && !packageId && <p className="text-sm text-muted">{t('validity')}</p>}
      <TextField label={t('price')} type="number" min={0} max={100000} value={price} disabled={freeTrial} onChange={event => setPrice(event.target.value)} />
      <TextField label={t('paid')} type="number" min={0} max={Number(price)} value={paid} disabled={freeTrial} onChange={event => setPaid(event.target.value)} />
      <Chip pressed={freeTrial} onClick={() => { setFreeTrial(!freeTrial); setPrice('0'); setPaid('0'); }}>{t('trial')}</Chip>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" disabled={!valid || busy} className="min-h-12 w-full" aria-busy={busy}>{t('activate')}</Button>
    </form>
  </dialog>;
}
