'use client';
import { formatNumber } from '@/lib/format';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { messages as dashboardMessages } from '../dashboard/messages';

import { useState, useTransition } from 'react';
import { Button } from '@/ui/button';
import { Package } from 'lucide-react';
import { EmptyState } from '@/ui/empty-state';
import { KoBilling } from '@/ui/icons/ko-billing';
import { clickableClass } from '@/ui/button';
import { Stepper } from '@/ui/stepper';
import { activatePlan } from '../data/activate-plan';
import { tierLabel } from '../format';
import type { CaptainRow, PlanTier, Tier } from '../types';

interface Props { captain: CaptainRow; plans: PlanTier[]; onClose: () => void; onSuccess: (message: string) => void; embedded?: boolean; now?: number; onPendingChange?: (pending: boolean) => void }
export function ActivatePanel({ captain, plans, onClose, onSuccess, embedded = false, now, onPendingChange }: Props) {
  const t = useT(messages);
  const d = useT(dashboardMessages);
  const locale = useLocale();
  const clock = useCalendarClock();
  const currentTime = now ?? clock.now?.getTime();
  const [tier, setTier] = useState<Tier>(captain.tier === 'entry' ? 'legend' : captain.tier);
  const [months, setMonths] = useState(1);
  const [paymentRef, setPaymentRef] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const plan = plans.find(item => item.tier === tier);
  function submit() {
    setError('');
    onPendingChange?.(true);
    startTransition(async () => {
      try {
        const result = await activatePlan({ captain_id: captain.id, tier, months, payment_ref: paymentRef });
        if (result.error) { setError(result.error); return; }
        onSuccess(t('activated'));
      } catch { setError(t('failed')); }
      finally { onPendingChange?.(false); }
    });
  }
  return <aside aria-labelledby="activation-title" className={embedded ? '' : 'glass-strong rounded-card p-card'}>
    <div className="mb-card-gap flex items-center justify-between gap-inline">
      <h2 id="activation-title" className="text-title font-semibold">{t('activatePlan')}</h2>
      {!embedded && <Button variant="secondary" onClick={onClose} disabled={pending}>{t('cancel')}</Button>}
    </div>
    {!embedded && <p className="mb-card-gap break-words text-muted">{captain.full_name}</p>}
    <form onSubmit={event => { event.preventDefault(); submit(); }}>
      <fieldset disabled={pending} className="space-y-card-gap">
        <legend className="sr-only">{t('planDetails')}</legend>
        <div className="grid grid-cols-2 gap-inline" role="group" aria-label={t('choosePlan')}>
          {plans.map(item => <button key={item.tier} type="button" aria-pressed={tier === item.tier}
            onClick={() => setTier(item.tier)}
            className={`min-h-20 rounded-control border p-stack text-start ${clickableClass} ${tier === item.tier ? 'border-lime bg-lime-soft' : 'border-line bg-surface'}`}>
            <span className="block font-bold">{tierLabel(item.tier)}</span>
            <span className="text-sm text-muted">{t('monthlyPrice', { price: formatNumber(item.price_egp, locale) })}</span>
          </button>)}
        </div>
        {!plans.length && <EmptyState icon={Package} title={t('plansFailed')} body={t('emptyHint')} secondary={{ label: t('manageCaptains'), onClick: onClose }} />}
        <div className="grid grid-cols-4 gap-inline" role="group" aria-label={t('monthCount')}>
          {[1, 3, 6, 12].map(value => <Button key={value} variant="secondary" aria-pressed={months === value}
            className={months === value ? 'border-lime text-lime' : ''} onClick={() => setMonths(value)}>{formatNumber(value, locale)}</Button>)}
        </div>
        <Stepper label={t('monthCount')} value={months} min={1} step={1} onChange={value => setMonths(Math.min(12, value))} />
        <p className="text-sm text-muted">{t('monthsHint')}</p>
        <label className="block space-y-inline"><span>{t('paymentRef')}</span>
          <input value={paymentRef} onChange={event => setPaymentRef(event.target.value)} maxLength={80}
            className="min-h-12 w-full rounded-control border border-line bg-surface px-stack" />
        </label>
        {plan && <div className="glass-strong space-y-inline rounded-control p-stack">
          <p className="num text-title font-bold">{t('currency', { amount: formatNumber(plan.price_egp * months, locale) })}</p>
          <p className="text-xs text-muted">{d('period', { price: formatNumber(plan.price_egp, locale), months: formatNumber(months, locale) })}</p>
          {currentTime !== undefined && <p className="text-xs text-muted">{d(captain.tier !== 'entry' && captain.tier_ends_at && Date.parse(captain.tier_ends_at) > currentTime ? 'startsAfter' : 'startsNow')}</p>}
        </div>}
        <Button type="submit" className="w-full" disabled={!plan || pending}>
          <KoBilling aria-hidden className="size-5" />{pending ? t('activating') : d('activateMonths', { tier: tierLabel(tier), months: formatNumber(months, locale) })}
        </Button>
      </fieldset>
      {error && <p role="alert" className="mt-stack text-danger">{error}</p>}
    </form>
  </aside>;
}
