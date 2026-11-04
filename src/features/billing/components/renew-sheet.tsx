'use client';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button, Chip, Segmented, TextField } from '@/ui';
import { remaining } from '../finance';
import { renewalPreview } from '../renew';
import type { Package, RenewalInput } from '../types';

export type Renewal = Omit<RenewalInput, 'playerId'>;
interface Props {
  name: string;
  accessUntil: string;
  today: string;
  packages: Package[];
  onClose: () => void;
  onSave: (renewal: Renewal) => void;
}

export function RenewSheet({ name, accessUntil, today, packages, onClose, onSave }: Props) {
  const t = useT(messages);
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [packageId, setPackageId] = useState<string | null>(packages[0]?.id ?? null);
  const [period, setPeriod] = useState('30');
  const [custom, setCustom] = useState('');
  const chosen = packages.find((item) => item.id === packageId) ?? null;
  const [amount, setAmount] = useState(chosen ? String(chosen.price_egp) : '');
  const days = chosen ? chosen.days : Number(period === 'custom' ? custom : period);
  const validDays = Number.isInteger(days) && days >= 1 && days <= 365;
  const value = amount.trim() === '' ? null : Number(amount);
  const price = chosen?.price_egp ?? null;
  const validAmount = value === null || (Number.isInteger(value) && value >= 0 && value <= 100000 && (price === null || value <= price));
  const preview = validDays ? renewalPreview(accessUntil, today, days) : null;
  const left = remaining(price, value);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function pick(id: string | null) {
    setPackageId(id);
    const item = packages.find((row) => row.id === id);
    setAmount(item ? String(item.price_egp) : '');
  }

  return (
    <dialog ref={dialog} aria-labelledby="renew-heading" onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line bg-surface p-6 text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-card">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="renew-heading" className="text-2xl font-extrabold">{t('renewTitle', { name })}</h2>
        <Button variant="ghost" aria-label={t('close')} onClick={onClose} className="min-h-12 min-w-12 px-0"><X aria-hidden className="size-5" /></Button>
      </div>
      <form className="space-y-5" onSubmit={(event) => {
        event.preventDefault();
        if (validDays && validAmount) onSave(chosen ? { days: null, amount: value, price, packageId: chosen.id } : { days, amount: value });
      }}>
        {packages.length > 0 && <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">{t('choosePackage')}</legend>
          <div className="flex flex-wrap gap-2">
            {packages.map((item) => <Chip key={item.id} pressed={packageId === item.id} onClick={() => pick(item.id)}>
              {item.name} · {t('amount', { amount: formatNumber(item.price_egp, locale) })}
            </Chip>)}
            <Chip pressed={packageId === null} onClick={() => pick(null)}>{t('custom')}</Chip>
          </div>
        </fieldset>}
        {!chosen && <>
          <Segmented aria-label={t('period')} value={period} onChange={setPeriod}
            options={[{ value: '30', label: t('days', { n: 30, count: formatNumber(30, locale) }) }, { value: '90', label: t('days', { n: 90, count: formatNumber(90, locale) }) }, { value: 'custom', label: t('custom') }]} />
          {period === 'custom' && <TextField label={t('dayCount')} type="number" min={1} max={365} step={1} required
            value={custom} onChange={(event) => setCustom(event.target.value)} hint={t('dayHint')} />}
        </>}
        <TextField label={chosen ? t('paidNow') : t('optionalAmount')} type="number" inputMode="numeric" min={0} max={price ?? 100000} step={1}
          value={amount} onChange={(event) => setAmount(event.target.value)} />
        <div aria-live="polite" className="glass-strong space-y-2 rounded-control p-4">
          {preview ? <><p>{t('from')} <time dateTime={preview.start}>{formatDateAr(preview.start, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}</time></p><p>{t('until')} <time dateTime={preview.end}>{formatDateAr(preview.end, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}</time></p></>
            : <p className="text-muted">{t('choosePeriod')}</p>}
          {chosen && validAmount && <p className={left > 0 ? 'font-bold text-warn' : 'text-lime'}>
            {left > 0 ? t('remainingAfter', { amount: formatNumber(left, locale) }) : t('paidInFull')}</p>}
        </div>
        {!validAmount && <p role="alert" className="text-danger">{price !== null && value !== null && value > price ? t('paidOverPrice') : t('amountHint')}</p>}
        <Button type="submit" disabled={!validDays || !validAmount} className="min-h-12 w-full">{t('renew')}</Button>
      </form>
    </dialog>
  );
}
