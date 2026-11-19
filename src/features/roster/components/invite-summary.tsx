'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { inviteAmounts, inviteEndDate, isInviteDate } from '../invite-plan';
import type { InvitePackage, PlayerInvite } from '../invite-plan';
import { messages } from '../invites/page-messages';
import { messages as inviteMessages } from '../invites/messages';

export function InviteSummary({ input, pkg }: { input: PlayerInvite; pkg?: InvitePackage }) {
  const t = useT(messages), m = useT(inviteMessages), locale = useLocale();
  const amount = inviteAmounts(input, pkg);
  const money = (value: number) => Number.isFinite(value) ? m('money', { amount: formatNumber(value, locale) }) : '—';
  const date = (value: string) => formatDateAr(value, { day: 'numeric', month: 'long' }, locale);
  const end = isInviteDate(input.startsOn) && Number.isFinite(input.quantity) ? inviteEndDate(input, pkg) : null;
  const initials = input.name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join(' ');
  const rows = [[m('package'), pkg?.name ?? m('custom')], [t('from'), isInviteDate(input.startsOn) ? date(input.startsOn) : '—'],
    [t('to'), end ? date(end) : '—'], [m('paid'), money(amount.paid)]];
  return <aside className="glass-strong sticky top-6 hidden space-y-card-gap rounded-[24px] p-card min-[760px]:block">
    <div className="flex items-center gap-stack"><span className="glass flex size-12 shrink-0 items-center justify-center rounded-[15px] text-lg font-bold">{initials}</span>
      <div><b className="block">{input.name.trim() || t('newPlayer')}</b><small className="text-muted">{t('newPlayer')}</small></div></div>
    <dl>{rows.map(([label,value]) => <div key={label} className="flex justify-between gap-stack border-b border-line py-stack text-sm"><dt className="text-muted">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>
    <div className="flex items-center justify-between"><span className="text-sm text-muted">{t('owed')}</span><b className="text-2xl tabular-nums">{money(amount.remaining)}</b></div>
    <div className="border-t border-line pt-card"><h3 className="mb-stack text-xs text-muted">{t('flow')}</h3><div className="flex flex-wrap items-center gap-inline text-xs">
      <span className="glass rounded-full px-stack py-inline">{t('account')}</span>
      {!!input.formIds?.length && <span className="glass rounded-full px-stack py-inline">{t('fill', { n: formatNumber(input.formIds.length, locale) }, input.formIds.length)}</span>}
      <span className="glass rounded-full px-stack py-inline">{t('program')}</span>
    </div></div>
  </aside>;
}
