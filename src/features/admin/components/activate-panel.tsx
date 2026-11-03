'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/ui/button';
import { Stepper } from '@/ui/stepper';
import { activatePlan } from '../data/activate-plan';
import { tierLabel } from '../format';
import type { CaptainRow, PlanTier, Tier } from '../types';

interface Props { captain: CaptainRow; plans: PlanTier[]; onClose: () => void; onSuccess: (message: string) => void }
export function ActivatePanel({ captain, plans, onClose, onSuccess }: Props) {
  const [tier, setTier] = useState<Tier>('legend');
  const [months, setMonths] = useState(1);
  const [paymentRef, setPaymentRef] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const plan = plans.find(item => item.tier === tier);
  function submit() {
    setError('');
    startTransition(async () => {
      try {
        const result = await activatePlan({ captain_id: captain.id, tier, months, payment_ref: paymentRef });
        if (result.error) { setError(result.error); return; }
        onSuccess('اتفعّلت الباقة');
      } catch { setError('العملية ما كملتش، جرّب تاني'); }
    });
  }
  return <aside aria-labelledby="activation-title" className="glass-strong rounded-card p-5 lg:sticky lg:top-6">
    <div className="mb-5 flex items-center justify-between gap-2">
      <h2 id="activation-title" className="text-xl font-bold">تفعيل باقة</h2>
      <Button variant="ghost" onClick={onClose} disabled={pending}>إلغاء</Button>
    </div>
    <p className="mb-5 break-words text-muted">{captain.full_name}</p>
    <form onSubmit={event => { event.preventDefault(); submit(); }}>
      <fieldset disabled={pending} className="space-y-5">
        <legend className="sr-only">بيانات الباقة</legend>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="اختار الباقة">
          {plans.map(item => <button key={item.tier} type="button" aria-pressed={tier === item.tier}
            onClick={() => setTier(item.tier)}
            className={`min-h-20 rounded-control border p-3 text-start ${tier === item.tier ? 'border-lime bg-lime-soft' : 'border-line bg-surface'}`}>
            <span className="block font-bold">{tierLabel(item.tier)}</span>
            <span className="text-sm text-muted">{item.price_egp} ج / شهر</span>
          </button>)}
        </div>
        {!plans.length && <p role="alert">مش قادرين نحمّل الباقات. جرّب تحديث الصفحة.</p>}
        <Stepper label="عدد الشهور" value={months} min={1} step={1} onChange={value => setMonths(Math.min(12, value))} />
        <p className="text-sm text-muted">من شهر لـ 12 شهر</p>
        <label className="block space-y-2"><span>مرجع الدفع (اختياري)</span>
          <input value={paymentRef} onChange={event => setPaymentRef(event.target.value)} maxLength={80}
            className="min-h-12 w-full rounded-control border border-line bg-surface px-3" />
        </label>
        {plan && <p className="text-lg font-bold tabular-nums">{plan.price_egp} ج × {months} = {plan.price_egp * months} ج</p>}
        <Button type="submit" className="w-full" disabled={!plan || pending}>
          {pending ? 'جاري التفعيل…' : `فعّل ${tierLabel(tier)}`}
        </Button>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
    </form>
  </aside>;
}
