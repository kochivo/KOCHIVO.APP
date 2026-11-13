'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState, useTransition } from 'react';
import { Button } from '@/ui/button';
import { Package } from 'lucide-react';
import { EmptyState } from '@/ui/empty-state';
import { Stepper } from '@/ui/stepper';
import { activatePlan } from '../data/activate-plan';
import { tierLabel } from '../format';
import type { CaptainRow, PlanTier, Tier } from '../types';

interface Props { captain: CaptainRow; plans: PlanTier[]; onClose: () => void; onSuccess: (message: string) => void }
export function ActivatePanel({ captain, plans, onClose, onSuccess }: Props) {
  const t = useT(messages);
  const locale = useLocale();
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
        onSuccess(t('activated'));
      } catch { setError(t('failed')); }
    });
  }
  return <aside aria-labelledby="activation-title" className="glass-strong rounded-card p-5 lg:sticky lg:top-6">
    <div className="mb-5 flex items-center justify-between gap-2">
      <h2 id="activation-title" className="text-xl font-bold">{t('activatePlan')}</h2>
      <Button variant="secondary" onClick={onClose} disabled={pending}>{t('cancel')}</Button>
    </div>
    <p className="mb-5 break-words text-muted">{captain.full_name}</p>
    <form onSubmit={event => { event.preventDefault(); submit(); }}>
      <fieldset disabled={pending} className="space-y-5">
        <legend className="sr-only">{t('planDetails')}</legend>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('choosePlan')}>
          {plans.map(item => <button key={item.tier} type="button" aria-pressed={tier === item.tier}
            onClick={() => setTier(item.tier)}
            className={`min-h-20 rounded-control border p-3 text-start ${tier === item.tier ? 'border-lime bg-lime-soft' : 'border-line bg-surface'}`}>
            <span className="block font-bold">{tierLabel(item.tier)}</span>
            <span className="text-sm text-muted">{t('monthlyPrice', { price: formatNumber(item.price_egp, locale) })}</span>
          </button>)}
        </div>
        {!plans.length && <EmptyState icon={Package} title={t('plansFailed')} body={t('emptyHint')} action={{ label: t('manageCaptains'), onClick: onClose }} />}
        <Stepper label={t('monthCount')} value={months} min={1} step={1} onChange={value => setMonths(Math.min(12, value))} />
        <p className="text-sm text-muted">{t('monthsHint')}</p>
        <label className="block space-y-2"><span>{t('paymentRef')}</span>
          <input value={paymentRef} onChange={event => setPaymentRef(event.target.value)} maxLength={80}
            className="min-h-12 w-full rounded-control border border-line bg-surface px-3" />
        </label>
        {plan && <p className="text-lg font-bold tabular-nums">{t('total', { price: formatNumber(plan.price_egp, locale), months: formatNumber(months, locale), total: formatNumber(plan.price_egp * months, locale) })}</p>}
        <Button type="submit" className="w-full" disabled={!plan || pending}>
          {pending ? t('activating') : t('activateTier', { tier: tierLabel(tier) })}
        </Button>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
    </form>
  </aside>;
}
