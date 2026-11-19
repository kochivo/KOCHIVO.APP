'use client';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Segmented, Stepper } from '@/ui';
import { messages } from '../invites/messages';
import type { InvitePackage, InvitePlan } from '../invite-plan';
import { durationLabel, durationPresets } from '@/features/billing';
import { messages as pageMessages } from '../invites/page-messages';

export function PackagePicker({ packages, plan, onPick, onChange }: {
  packages: InvitePackage[]; plan: InvitePlan; onPick: (pkg?: InvitePackage) => void; onChange: (patch: Partial<InvitePlan>) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const p = useT(pageMessages);
  return <fieldset className="space-y-stack">
    <legend className="mb-inline font-semibold">{t('package')}</legend>
    {!packages.length && <p className="text-sm text-muted">{t('noPackages')} <Link className="inline-flex min-h-12 items-center underline" href="/captain/billing#packages">{t('packagesLink')}</Link></p>}
    <div className="grid gap-stack min-[760px]:grid-cols-2">{packages.map(pkg => <label key={pkg.id} className={`press glass flex min-h-24 cursor-pointer items-center gap-stack rounded-[16px] border p-stack hover:bg-ink/5 focus-within:ring-2 focus-within:ring-lime ${plan.packageId === pkg.id ? 'border-ink/40' : 'border-line'}`}>
      <input type="radio" name="package" value={pkg.id} checked={plan.packageId === pkg.id} onChange={() => onPick(pkg)} className="size-5 accent-lime" />
      <span className="min-w-0 flex-1"><span className="block font-bold">{pkg.name}</span>
        <span className="text-sm text-muted">{pkg.kind === 'days' ? durationLabel(pkg.days, p, locale) : t('durationSessions', { n: pkg.sessions ?? 1, count: formatNumber(pkg.sessions ?? 1, locale) })}</span></span>
      <span>{t('money', { amount: formatNumber(pkg.price_egp, locale) })}</span>
    </label>)}
    <label className="press glass flex min-h-24 cursor-pointer items-center gap-stack rounded-[16px] border border-dashed border-line p-stack hover:bg-ink/5 focus-within:ring-2 focus-within:ring-lime">
      <input type="radio" name="package" value="" checked={plan.packageId === null} onChange={() => onPick()} className="size-5 accent-lime" />{t('custom')}
    </label></div>
    {plan.packageId === null && <>
      <Segmented aria-label={t('kind')} value={plan.kind} options={[{ value: 'days', label: t('days') }, { value: 'sessions', label: t('sessions') }]}
        onChange={value => onChange({ kind: value === 'sessions' ? 'sessions' : 'days', quantity: 1 })} />
      <Stepper label={t('quantity')} value={plan.quantity} min={1} max={plan.kind === 'sessions' ? 200 : 365} step={1} onChange={quantity => onChange({ quantity })} />
      {plan.kind === 'days' && <div className="flex flex-wrap gap-inline">{durationPresets.map(days => <button key={days} type="button" aria-pressed={plan.quantity === days}
        onClick={() => onChange({ quantity: days })} className="press glass min-h-12 cursor-pointer rounded-control border border-line px-stack text-sm hover:bg-ink/10 focus-visible:ring-2 focus-visible:ring-lime">{durationLabel(days, p, locale)}</button>)}</div>}
    </>}
  </fieldset>;
}
