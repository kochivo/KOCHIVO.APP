'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { Button, Chip, TextField } from '@/ui';
import { KoInvite } from '@/ui/icons/ko-invite';
import { KoPlayers } from '@/ui/icons/ko-players';
import type { FormDraft } from '@/features/forms';
import { formatNumber } from '@/lib/format';
import { defaultInvitePlan, inviteAmounts, normalizeWhatsapp, shiftInviteDate } from '../invite-plan';
import type { InvitePackage, PlayerInvite } from '../invite-plan';
import { playerInviteSchema } from '../invite-schema';
import { messages } from '../invites/messages';
import { messages as pageMessages } from '../invites/page-messages';
import { PackagePicker } from './package-picker';
import { InviteAssessments } from './invite-assessments';
import { InviteSummary } from './invite-summary';
import { buttonClass } from '@/ui/button';

export function InviteForm({ packages, forms = [], today, busy = false, error, onSave }: {
  packages: InvitePackage[]; forms?: FormDraft[]; today: string; busy?: boolean; error?: string; onSave: (input: PlayerInvite) => void;
}) {
  const t = useT(messages), p = useT(pageMessages), locale = useLocale();
  const [plan, setPlan] = useState(() => defaultInvitePlan(packages[0], today));
  const [name, setName] = useState(''), [whatsapp, setWhatsapp] = useState('');
  const [price, setPrice] = useState(String(plan.price)), [paid, setPaid] = useState(String(plan.paid));
  const [selection, setSelection] = useState({ formIds: [] as string[], gate: false });
  const [step, setStep] = useState(1);
  const pkg = packages.find(row => row.id === plan.packageId);
  const input = { ...plan, ...selection, name, whatsapp, price: plan.freeTrial ? 0 : Number(price), paid: plan.freeTrial ? 0 : Number(paid) };
  const valid = (plan.freeTrial || (price.trim() !== '' && paid.trim() !== '')) && playerInviteSchema(today).safeParse(input).success;
  const amounts = inviteAmounts(input, pkg);
  const detailsValid = name.trim().length > 0 && name.trim().length <= 60 && normalizeWhatsapp(whatsapp) !== undefined;
  const money = (amount: number) => Number.isFinite(amount) ? t('money', { amount: formatNumber(amount, locale) }) : '—';
  const linkClass = buttonClass({ variant: 'secondary', block: false });
  function pick(next?: InvitePackage) {
    const value = defaultInvitePlan(next, plan.startsOn);
    setPlan(value); setPrice(String(value.price)); setPaid(String(value.paid));
  }
  const create = <><KoInvite aria-hidden className="size-5" />{t(busy ? 'creating' : 'create')}</>;
  return <form className="space-y-5 pb-28 min-[760px]:pb-0" onSubmit={event => { event.preventDefault(); if (valid && !busy) onSave(input); }}>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex w-full items-start gap-3 min-[760px]:w-auto">
        <Link href="/captain/players" aria-label={p('back')} className={linkClass}><KoPlayers aria-hidden className="size-5" /></Link>
        <div><Link href="/captain/players" className="inline-flex min-h-12 items-center text-xs text-muted">{p('players')}</Link>
          <h1 className="font-display text-2xl font-semibold">{t('title')}</h1><p className="mt-2 text-xs leading-6 text-muted">{p('subtitle')}</p></div>
      </div>
      <div className="hidden items-center gap-2 min-[760px]:flex"><Link href="/captain/players" className={linkClass}>{p('cancel')}</Link>
        <Button type="submit" disabled={!valid || busy} aria-busy={busy} className="min-h-12">{create}</Button></div>
    </header>
    <div className="grid items-start gap-4 min-[760px]:grid-cols-[minmax(0,1fr)_300px]">
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <section className={`glass space-y-4 rounded-[24px] p-4 min-[760px]:block min-[760px]:p-5 ${step > 2 ? 'hidden' : ''}`}>
          <div className="flex items-center gap-3"><span className="glass-strong flex size-8 items-center justify-center rounded-full text-sm">{formatNumber(1, locale)}</span><h2 className="flex-1 font-semibold">{p('details')}</h2>
            {step > 1 && <Button variant="secondary" className="min-h-12 min-[760px]:hidden" onClick={() => setStep(1)}>{p('edit')}</Button>}</div>
          <div className={step > 1 ? 'hidden min-[760px]:grid min-[760px]:grid-cols-2 min-[760px]:gap-4' : 'grid gap-4 min-[760px]:grid-cols-2'}>
            <TextField label={t('name')} required maxLength={60} autoComplete="name" value={name} onChange={event => setName(event.target.value)} />
            <div><TextField label={t('whatsapp')} inputMode="tel" dir="ltr" autoComplete="tel" value={whatsapp}
              onChange={event => setWhatsapp(event.target.value)} error={normalizeWhatsapp(whatsapp) === undefined ? t('invalidWhatsapp') : undefined} /><p className="mt-2 text-xs leading-6 text-muted">{p('phoneHint')}</p></div>
            <Button variant="secondary" disabled={!detailsValid} onClick={() => setStep(2)} className="min-h-12 min-[760px]:hidden">{p('next')}</Button>
          </div>
          {step > 1 && <p className="text-xs text-muted min-[760px]:hidden">{name}</p>}
        </section>
        <section className={`glass space-y-4 rounded-[24px] p-4 min-[760px]:block min-[760px]:p-5 ${step < 2 ? 'hidden' : ''}`}>
          <div className="flex items-center gap-3"><span className="glass-strong flex size-8 items-center justify-center rounded-full text-sm">{formatNumber(2, locale)}</span><div className="flex-1"><h2 className="font-semibold"><span className="hidden min-[760px]:inline">{p('payment')}</span><span className="min-[760px]:hidden">{p(step > 2 ? 'detailsAndPayment' : 'payment')}</span></h2><p className="mt-1 text-xs text-muted">{p('paymentHint')}</p></div>
            {step > 2 && <Button variant="secondary" className="min-h-12 min-[760px]:hidden" onClick={() => setStep(1)}>{p('edit')}</Button>}</div>
          <div className={step > 2 ? 'hidden space-y-4 min-[760px]:block' : 'space-y-4'}>
            <PackagePicker packages={packages} plan={plan} onPick={pick} onChange={patch => setPlan(current => ({ ...current, ...patch }))} />
            <div className="grid gap-4 min-[760px]:grid-cols-3">
              {pkg ? <TextField label={p('discount')} type="number" min={0} max={pkg.price_egp} step={1} disabled={plan.freeTrial} value={plan.freeTrial ? '0' : Math.max(0, pkg.price_egp - Number(price))}
                onChange={event => { const next = String(pkg.price_egp - Number(event.target.value)); setPrice(next); if (paid === price || Number(paid) > Number(next)) setPaid(next); }} /> :
                <TextField label={t('price')} type="number" min={0} max={100000} step={1} required value={plan.freeTrial ? '0' : price} disabled={plan.freeTrial}
                  onChange={event => { setPrice(event.target.value); if (paid === price) setPaid(event.target.value); }} />}
              <TextField label={t('paid')} type="number" min={0} max={input.price} step={1} required value={plan.freeTrial ? '0' : paid} disabled={plan.freeTrial} onChange={event => setPaid(event.target.value)} />
              <TextField label={t('start')} type="date" required value={plan.startsOn} min={shiftInviteDate(today, -30)} max={shiftInviteDate(today, 60)} onChange={event => setPlan(current => ({ ...current, startsOn: event.target.value }))} />
            </div>
            {amounts.discount > 0 && <p className="text-sm text-muted">{t('discount', { amount: formatNumber(amounts.discount, locale) })}</p>}
            <Chip pressed={plan.freeTrial} onClick={() => setPlan(current => ({ ...current, freeTrial: !current.freeTrial }))}>{t('trial')}</Chip>
            <Button variant="secondary" disabled={!valid} onClick={() => setStep(3)} className="min-h-12 w-full min-[760px]:hidden">{p('next')}</Button>
          </div>
          {step > 2 && <p className="text-xs text-muted min-[760px]:hidden">{name} · {pkg?.name ?? t('custom')} · {money(amounts.paid)}</p>}
        </section>
        <section className={`glass space-y-4 rounded-[24px] p-4 min-[760px]:block min-[760px]:p-5 ${step < 3 ? 'hidden' : ''}`}>
          <div className="flex items-center gap-3"><span className="glass-strong flex size-8 items-center justify-center rounded-full text-sm">{formatNumber(3, locale)}</span><div className="flex-1"><h2 className="font-semibold">{p('before')}</h2><p className="mt-1 text-xs text-muted">{p('beforeHint')}</p></div><span className="glass rounded-full px-3 py-2 text-xs text-muted">{p('optional')}</span></div>
          <InviteAssessments forms={forms} {...selection} onChange={setSelection} />
        </section>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </fieldset>
      <InviteSummary input={input} pkg={pkg} />
    </div>
    <footer className="glass-strong fixed inset-x-0 bottom-[var(--page-bottom-clearance)] z-30 flex items-center gap-4 border-t border-line px-4 pb-[max(0.75rem,var(--safe-bottom))] pt-3 min-[760px]:hidden">
      <div className="shrink-0 text-xs text-muted">{p('owed')}<b className="mt-1 block text-lg text-ink">{money(amounts.remaining)}</b></div>
      {step < 3 ? <Button variant="secondary" className="min-h-12 flex-1" disabled={busy || (step === 1 ? !detailsValid : !valid)} onClick={() => setStep(step + 1)}>{p('next')}</Button> :
        <Button type="submit" className="min-h-12 flex-1" disabled={!valid || busy} aria-busy={busy}>{create}</Button>}
    </footer>
  </form>;
}
