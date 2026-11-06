'use client';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Segmented, Stepper } from '@/ui';
import { messages } from '../invites/messages';
import type { InvitePackage, InvitePlan } from '../invite-plan';

export function PackagePicker({ packages, plan, onPick, onChange }: {
  packages: InvitePackage[]; plan: InvitePlan; onPick: (pkg?: InvitePackage) => void; onChange: (patch: Partial<InvitePlan>) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  return <fieldset className="space-y-3">
    <legend className="mb-2 font-semibold">{t('package')}</legend>
    {!packages.length && <p className="text-sm text-muted">{t('noPackages')} <Link className="inline-flex min-h-12 items-center underline" href="/captain/billing#packages">{t('packagesLink')}</Link></p>}
    {packages.map(pkg => <label key={pkg.id} className="glass flex min-h-12 cursor-pointer items-center gap-3 rounded-control p-3">
      <input type="radio" name="package" value={pkg.id} checked={plan.packageId === pkg.id} onChange={() => onPick(pkg)} className="size-5 accent-lime" />
      <span className="min-w-0 flex-1"><span className="block font-bold">{pkg.name}</span>
        <span className="text-sm text-muted">{t(pkg.kind === 'days' ? 'durationDays' : 'durationSessions', { count: formatNumber(pkg.kind === 'days' ? pkg.days : pkg.sessions ?? 1, locale) })}</span></span>
      <span>{t('money', { amount: formatNumber(pkg.price_egp, locale) })}</span>
    </label>)}
    <label className="glass flex min-h-12 cursor-pointer items-center gap-3 rounded-control p-3">
      <input type="radio" name="package" value="" checked={plan.packageId === null} onChange={() => onPick()} className="size-5 accent-lime" />{t('custom')}
    </label>
    {plan.packageId === null && <>
      <Segmented aria-label={t('kind')} value={plan.kind} options={[{ value: 'days', label: t('days') }, { value: 'sessions', label: t('sessions') }]}
        onChange={value => onChange({ kind: value === 'sessions' ? 'sessions' : 'days', quantity: 1 })} />
      <Stepper label={t('quantity')} value={plan.quantity} min={1} max={plan.kind === 'sessions' ? 200 : 365} step={1} onChange={quantity => onChange({ quantity })} />
    </>}
  </fieldset>;
}
