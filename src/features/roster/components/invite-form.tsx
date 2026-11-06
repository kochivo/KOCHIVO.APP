'use client';
import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button, Chip, TextField } from '@/ui';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { defaultInvitePlan, inviteAmounts, inviteEndDate, isInviteDate, normalizeWhatsapp, shiftInviteDate } from '../invite-plan';
import type { InvitePackage, PlayerInvite } from '../invite-plan';
import { playerInviteSchema } from '../invite-schema';
import { messages } from '../invites/messages';
import { PackagePicker } from './package-picker';

export function InviteForm({ packages, today, busy = false, error, onSave }: {
  packages: InvitePackage[]; today: string; busy?: boolean; error?: string; onSave: (input: PlayerInvite) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [plan, setPlan] = useState(() => defaultInvitePlan(packages[0], today));
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [price, setPrice] = useState(String(plan.price));
  const [paid, setPaid] = useState(String(plan.paid));
  const pkg = packages.find(row => row.id === plan.packageId);
  const input = { ...plan, name, whatsapp, price: plan.freeTrial ? 0 : Number(price), paid: plan.freeTrial ? 0 : Number(paid) };
  const valid = (plan.freeTrial || (price.trim() !== '' && paid.trim() !== '')) && playerInviteSchema(today).safeParse(input).success;
  const amounts = inviteAmounts(input, pkg);
  const end = isInviteDate(plan.startsOn, today) ? inviteEndDate(plan, pkg) : null;
  function pick(next?: InvitePackage) {
    const value = defaultInvitePlan(next, plan.startsOn);
    setPlan(value); setPrice(String(value.price)); setPaid(String(value.paid));
  }
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (valid && !busy) onSave(input); }}>
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      <TextField label={t('name')} required maxLength={60} autoComplete="name" value={name} onChange={event => setName(event.target.value)} />
      <TextField label={t('whatsapp')} inputMode="tel" dir="ltr" autoComplete="tel" value={whatsapp}
        onChange={event => setWhatsapp(event.target.value)} error={normalizeWhatsapp(whatsapp) === undefined ? t('invalidWhatsapp') : undefined} />
      <PackagePicker packages={packages} plan={plan} onPick={pick} onChange={patch => setPlan(current => ({ ...current, ...patch }))} />
      <TextField label={t('price')} type="number" min={0} max={100000} step={1} required value={plan.freeTrial ? '0' : price} disabled={plan.freeTrial}
        onChange={event => { setPrice(event.target.value); if (paid === price) setPaid(event.target.value); }} />
      {amounts.discount > 0 && <p className="text-sm text-muted">{t('discount', { amount: formatNumber(amounts.discount, locale) })}</p>}
      <TextField label={t('paid')} type="number" min={0} max={input.price} step={1} required value={plan.freeTrial ? '0' : paid} disabled={plan.freeTrial} onChange={event => setPaid(event.target.value)} />
      {amounts.remaining > 0 && <p className="text-sm text-warn">{t('remaining', { amount: formatNumber(amounts.remaining, locale) })}</p>}
      <Chip pressed={plan.freeTrial} onClick={() => setPlan(current => ({ ...current, freeTrial: !current.freeTrial }))}>{t('trial')}</Chip>
      <TextField label={t('start')} type="date" required value={plan.startsOn} min={shiftInviteDate(today, -30)} max={shiftInviteDate(today, 60)}
        onChange={event => setPlan(current => ({ ...current, startsOn: event.target.value }))} />
      {end && <p className="text-sm text-muted">{t('ends', { date: formatDateAr(end, { day: 'numeric', month: 'long', year: 'numeric' }, locale) })}</p>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Button type="submit" className="min-h-12 w-full" disabled={!valid || busy} aria-busy={busy}>{t(busy ? 'creating' : 'create')}</Button>
  </form>;
}
