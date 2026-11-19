'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { Button, Chip, TextField } from '@/ui';
import { KoInvite } from '@/ui/icons/ko-invite';
import { KoPlayers } from '@/ui/icons/ko-players';
import type { FormDraft } from '@/features/forms';
import { formatNumber } from '@/lib/format';
import { defaultInvitePlan, inviteAmounts, inviteDigits, normalizeWhatsapp, shiftInviteDate } from '../invite-plan';
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
  const [discount, setDiscount] = useState('0');
  const [attempt, setAttempt] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const focusTarget = useRef<string>(null);
  const prefix = useId();
  useEffect(() => {
    if (focusTarget.current) form.current?.querySelector<HTMLElement>(`[id="${prefix}-${focusTarget.current}"]`)?.focus();
    focusTarget.current = null;
  }, [step, attempt, prefix]);
  const pkg = packages.find(row => row.id === plan.packageId);
  const input = { ...plan, ...selection, name, whatsapp, price: plan.freeTrial ? 0 : Number(price), paid: plan.freeTrial ? 0 : Number(paid) };
  const parsed = playerInviteSchema(today).safeParse(input);
  const invalid = (field: string) => !parsed.success && parsed.error.issues.some(issue => issue.path[0] === field);
  const invalidPackage = invalid('quantity') || invalid('packageId') || invalid('kind');
  const invalidPrice = !plan.freeTrial && (invalid('price') || !price.trim() || !!pkg && (!discount.trim() || Number(discount) < 0));
  const invalidPaid = !plan.freeTrial && (invalid('paid') || !paid.trim() || input.paid > input.price);
  const amounts = inviteAmounts(input, pkg);
  const [showDetails, setShowDetails] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  function changeStep(next: number, target = `step-${next}`) {
    focusTarget.current = target;
    setStep(next);
    setAttempt(value => value + 1);
  }
  function progress(stage: number) {
    if (busy) return;
    setShowDetails(true);
    const details = invalid('name') ? 'name' : invalid('whatsapp') ? 'whatsapp' : null;
    if (details) return changeStep(1, details);
    if (stage === 1) return changeStep(2);
    setShowPayment(true);
    const payment = invalidPackage ? 'package' : invalidPrice ? 'price' : invalidPaid ? 'paid' : invalid('startsOn') ? 'startsOn' : null;
    if (payment) return changeStep(2, payment);
    if (stage === 2) return changeStep(3);
    if (parsed.success) onSave(input);
    else changeStep(3);
  }
  const money = (amount: number) => Number.isFinite(amount) ? t('money', { amount: formatNumber(amount, locale) }) : '—';
  const linkClass = buttonClass({ variant: 'secondary', block: false });
  function pick(next?: InvitePackage) {
    const value = defaultInvitePlan(next, plan.startsOn);
    setDiscount('0'); setPlan(value); setPrice(String(value.price)); setPaid(String(value.paid));
  }
  const create = <><KoInvite aria-hidden className="size-5" />{t(busy ? 'creating' : 'create')}</>;
  return <form ref={form} noValidate className="space-y-card-gap pb-28 min-[760px]:pb-0" onSubmit={event => { event.preventDefault(); progress(window.matchMedia('(min-width: 760px)').matches ? 3 : step); }}>
    <header className="flex flex-wrap items-center justify-between gap-card-gap">
      <div className="flex w-full items-start gap-stack min-[760px]:w-auto">
        <Link href="/captain/players" aria-label={p('back')} className={linkClass}><KoPlayers aria-hidden className="size-5" /></Link>
        <div><Link href="/captain/players" className="inline-flex min-h-12 items-center text-xs text-muted">{p('players')}</Link>
          <h1 className="font-display text-2xl font-semibold">{t('title')}</h1><p className="mt-inline text-xs leading-6 text-muted">{p('subtitle')}</p></div>
      </div>
      <div className="hidden items-center gap-inline min-[760px]:flex"><Link href="/captain/players" className={linkClass}>{p('cancel')}</Link>
        <Button type="submit" disabled={busy} aria-busy={busy} className="min-h-12">{create}</Button></div>
    </header>
    <div className="grid items-start gap-card-gap min-[760px]:grid-cols-[minmax(0,1fr)_300px]">
      <fieldset disabled={busy} className="min-w-0 space-y-card-gap">
        <section className={`glass space-y-card-gap rounded-[24px] p-card min-[760px]:block min-[760px]:p-card ${step > 2 ? 'hidden' : ''}`}>
          <div className="flex items-center gap-stack"><span className="glass-strong flex size-8 items-center justify-center rounded-full text-sm">{formatNumber(1, locale)}</span><h2 id={`${prefix}-step-1`} tabIndex={-1} className="flex-1 font-semibold">{p('details')}</h2>
            {step > 1 && <Button variant="secondary" className="min-h-12 min-[760px]:hidden" onClick={() => changeStep(1)}>{p('edit')}</Button>}</div>
          <div className={step > 1 ? 'hidden min-[760px]:grid min-[760px]:grid-cols-2 min-[760px]:gap-card-gap' : 'grid gap-card-gap min-[760px]:grid-cols-2'}>
            <TextField id={`${prefix}-name`} error={showDetails && invalid('name') ? p('invalidName') : undefined} label={t('name')} required maxLength={60} autoComplete="name" value={name} onChange={event => setName(event.target.value)} />
            <div><TextField id={`${prefix}-whatsapp`} label={t('whatsapp')} inputMode="tel" dir="ltr" autoComplete="tel" value={whatsapp}
              onChange={event => setWhatsapp(event.target.value)} error={normalizeWhatsapp(whatsapp) === undefined ? t('invalidWhatsapp') : undefined} /><p className="mt-inline text-xs leading-6 text-muted">{p('phoneHint')}</p></div>
          </div>
          {step > 1 && <p className="text-xs text-muted min-[760px]:hidden">{name}</p>}
        </section>
        <section className={`glass space-y-card-gap rounded-[24px] p-card min-[760px]:block min-[760px]:p-card ${step < 2 ? 'hidden' : ''}`}>
          <div className="flex items-center gap-stack"><span className="glass-strong flex size-8 items-center justify-center rounded-full text-sm">{formatNumber(2, locale)}</span><div className="flex-1"><h2 id={`${prefix}-step-2`} tabIndex={-1} className="font-semibold"><span className="hidden min-[760px]:inline">{p('payment')}</span><span className="min-[760px]:hidden">{p(step > 2 ? 'detailsAndPayment' : 'payment')}</span></h2><p className="mt-inline text-xs text-muted">{p('paymentHint')}</p></div>
            {step > 2 && <Button variant="secondary" className="min-h-12 min-[760px]:hidden" onClick={() => changeStep(2)}>{p('edit')}</Button>}</div>
          <div className={step > 2 ? 'hidden space-y-card-gap min-[760px]:block' : 'space-y-card-gap'}>
            <div id={`${prefix}-package`} tabIndex={-1} aria-describedby={showPayment && invalidPackage ? `${prefix}-package-error` : undefined}>
              <PackagePicker packages={packages} plan={plan} onPick={pick} onChange={patch => setPlan(current => ({ ...current, ...patch }))} />
              {showPayment && invalidPackage &&
                <p id={`${prefix}-package-error`} role="alert" className="text-sm text-danger">{p('invalidPackage')}</p>}
            </div>
            <div className="grid gap-card-gap min-[760px]:grid-cols-3">
              {pkg ? <TextField id={`${prefix}-price`} error={showPayment && invalidPrice ? p('invalidDiscount') : undefined} label={p('discount')} type="number" min={0} max={pkg.price_egp} step={1} disabled={plan.freeTrial} value={plan.freeTrial ? '0' : discount}
                onChange={event => { const value = inviteDigits(event.target.value); setDiscount(value); const next = String(pkg.price_egp - Number(value)); setPrice(next); if (paid === price || Number(paid) > Number(next)) setPaid(next); }} /> :
                <TextField id={`${prefix}-price`} error={showPayment && invalidPrice ? p('invalidPrice') : undefined} label={t('price')} type="number" inputMode="numeric" min={0} max={100000} step={1} required value={plan.freeTrial ? '0' : price} disabled={plan.freeTrial}
                  onChange={event => { const value = inviteDigits(event.target.value); setPrice(value); if (paid === price) setPaid(value); }} />}
              <TextField id={`${prefix}-paid`} error={showPayment && invalidPaid ? p('invalidPaid') : undefined} label={t('paid')} type="number" inputMode="numeric" min={0} max={input.price} step={1} required value={plan.freeTrial ? '0' : paid} disabled={plan.freeTrial} onChange={event => setPaid(inviteDigits(event.target.value))} />
              <TextField id={`${prefix}-startsOn`} error={showPayment && invalid('startsOn') ? p('invalidStart') : undefined} label={t('start')} type="date" required value={plan.startsOn} min={shiftInviteDate(today, -30)} max={shiftInviteDate(today, 60)} onChange={event => setPlan(current => ({ ...current, startsOn: event.target.value }))} />
            </div>
            {amounts.discount > 0 && <p className="text-sm text-muted">{t('discount', { amount: formatNumber(amounts.discount, locale) })}</p>}
            <Chip pressed={plan.freeTrial} onClick={() => setPlan(current => ({ ...current, freeTrial: !current.freeTrial }))}>{t('trial')}</Chip>
          </div>
          {step > 2 && <p className="text-xs text-muted min-[760px]:hidden">{name} · {pkg?.name ?? t('custom')} · {money(amounts.paid)}</p>}
        </section>
        <section className={`glass space-y-card-gap rounded-[24px] p-card min-[760px]:block min-[760px]:p-card ${step < 3 ? 'hidden' : ''}`}>
          <div className="flex items-center gap-stack"><span className="glass-strong flex size-8 items-center justify-center rounded-full text-sm">{formatNumber(3, locale)}</span><div className="flex-1"><h2 id={`${prefix}-step-3`} tabIndex={-1} aria-describedby={showPayment && invalid('formIds') ? `${prefix}-forms-error` : undefined} className="font-semibold">{p('before')}</h2><p className="mt-inline text-xs text-muted">{p('beforeHint')}</p></div><span className="glass rounded-full px-stack py-inline text-xs text-muted">{p('optional')}</span></div>
          <InviteAssessments forms={forms} {...selection} onChange={setSelection} />
          {showPayment && invalid('formIds') && <p id={`${prefix}-forms-error`} role="alert" className="text-sm text-danger">{p('formLimit')}</p>}
        </section>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </fieldset>
      <InviteSummary input={input} pkg={pkg} />
    </div>
    <footer data-action-bar="invite" className="glass-strong fixed inset-x-0 bottom-[var(--page-bottom-clearance)] z-30 flex items-center gap-card-gap border-t border-line px-page-x pb-[max(0.75rem,var(--safe-bottom))] pt-stack min-[760px]:hidden">
      <div className="shrink-0 text-xs text-muted">{p('owed')}<b className="mt-inline block text-lg text-ink">{money(amounts.remaining)}</b></div>
      {step < 3 ? <Button variant="secondary" className="min-h-12 flex-1" disabled={busy} onClick={() => progress(step)}>{p('next')}</Button> :
        <Button type="submit" className="min-h-12 flex-1" disabled={busy} aria-busy={busy}>{create}</Button>}
    </footer>
  </form>;
}
