'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button, Segmented, TextField } from '@/ui';
import { renewalPreview } from '../renew';

interface Props {
  name: string;
  accessUntil: string;
  today: string;
  onClose: () => void;
  onSave: (days: number, amount: number | null) => void;
}

export function RenewSheet({ name, accessUntil, today, onClose, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [period, setPeriod] = useState('30');
  const [custom, setCustom] = useState('');
  const [amount, setAmount] = useState('');
  const days = Number(period === 'custom' ? custom : period);
  const validDays = Number.isInteger(days) && days >= 1 && days <= 365;
  const value = amount.trim() === '' ? null : Number(amount);
  const validAmount = value === null || (Number.isInteger(value) && value >= 0 && value <= 100000);
  const preview = validDays ? renewalPreview(accessUntil, today, days) : null;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="renew-heading" onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line bg-surface p-6 text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-card">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="renew-heading" className="text-2xl font-extrabold">جدّد اشتراك {name}</h2>
        <Button variant="ghost" aria-label="اقفل التجديد" onClick={onClose} className="min-h-12 min-w-12 px-0"><X aria-hidden className="size-5" /></Button>
      </div>
      <form className="space-y-5" onSubmit={(event) => {
        event.preventDefault();
        if (validDays && validAmount) onSave(days, value);
      }}>
        <Segmented aria-label="مدة التجديد" value={period} onChange={setPeriod}
          options={[{ value: '30', label: '30 يوم' }, { value: '90', label: '90 يوم' }, { value: 'custom', label: 'مدة تانية' }]} />
        {period === 'custom' && <TextField label="عدد الأيام" type="number" min={1} max={365} step={1} required
          value={custom} onChange={(event) => setCustom(event.target.value)} hint="من يوم لـ 365 يوم" />}
        <TextField label="المبلغ بالجنيه (اختياري)" type="number" min={0} max={100000} step={1}
          value={amount} onChange={(event) => setAmount(event.target.value)} />
        <div aria-live="polite" className="glass-strong space-y-2 rounded-control p-4">
          {preview ? <><p>من <time dateTime={preview.start}>{preview.start}</time></p><p>لحد <time dateTime={preview.end}>{preview.end}</time></p></>
            : <p className="text-muted">اختار مدة من يوم لـ 365 يوم</p>}
        </div>
        {!validAmount && <p role="alert" className="text-danger">المبلغ من صفر لـ 100000 جنيه، من غير كسور</p>}
        <Button type="submit" disabled={!validDays || !validAmount} className="min-h-12 w-full">جدّد</Button>
      </form>
    </dialog>
  );
}
