'use client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { inviteUrl } from '../invite';
import { inviteAmounts, inviteEndDate, normalizeWhatsapp } from '../invite-plan';
import type { InvitePackage, PlayerInvite } from '../invite-plan';
import { messages } from '../invites/messages';

export function InviteResult({ input, pkg, code, captainFirstName }: {
  input: PlayerInvite; pkg?: InvitePackage; code: string; captainFirstName: string;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [status, setStatus] = useState('');
  const url = inviteUrl(code);
  const amounts = inviteAmounts(input, pkg);
  const date = (value: string) => formatDateAr(value, { day: 'numeric', month: 'long', year: 'numeric' }, locale);
  const phone = normalizeWhatsapp(input.whatsapp) ?? '';
  const share = `https://wa.me/${phone}?text=${encodeURIComponent(t('share', { captain: captainFirstName, link: url }))}`;
  const money = (amount: number) => t('money', { amount: formatNumber(amount, locale) });
  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus(t('copied')); }
    catch { setStatus(t('copyFailed')); }
  }
  return <div className="space-y-4">
    <Check aria-hidden className="size-10 text-lime" />
    <h3 className="text-xl font-bold">{t('ready', { name: input.name })}</h3>
    <p className="text-muted">{t('readyHint')}</p>
    <dl className="glass-strong space-y-3 rounded-card p-4">
      <div><dt className="text-sm text-muted">{t('package')}</dt><dd>{pkg?.name ?? t('custom')}</dd></div>
      <div><dt className="text-sm text-muted">{t('start')}</dt><dd>{t('period', { from: date(input.startsOn), to: date(inviteEndDate(input, pkg)) })}</dd></div>
      <div><dt className="text-sm text-muted">{t('price')}</dt><dd>{money(amounts.price)}</dd></div>
      <div><dt className="text-sm text-muted">{t('paid')}</dt><dd>{money(amounts.paid)}</dd></div>
      <div className={amounts.remaining ? 'text-warn' : 'text-muted'}><dt>{t('remaining', { amount: formatNumber(amounts.remaining, locale) })}</dt><dd className="sr-only">{money(amounts.remaining)}</dd></div>
    </dl>
    <label className="block space-y-2"><span>{t('link')}</span><input readOnly dir="ltr" value={url} onFocus={event => event.currentTarget.select()}
      className="min-h-12 w-full rounded-control border border-line bg-bg px-3 text-ink" /></label>
    <a href={share} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-control bg-lime px-4 font-bold text-on-lime">{t('send')}</a>
    <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} className="min-h-12 w-full" onClick={copy}>{t('copy')}</Button>
    <p role="status" className="text-sm text-muted">{status}</p>
  </div>;
}
