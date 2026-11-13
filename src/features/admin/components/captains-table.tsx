'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Button } from '@/ui/button';
import { Users } from 'lucide-react';
import { EmptyState } from '@/ui/empty-state';
import { captainState, endsLabel, stateLabels, tierLabel, usageLabel } from '../format';
import type { CaptainRow } from '../types';

interface Props {
  rows: CaptainRow[];
  selected: string | null;
  onActivate: (row: CaptainRow) => void;
  onSuspend: (row: CaptainRow) => void;
  onReset?: () => void;
}
export function CaptainsTable({ rows, selected, onActivate, onSuspend, onReset }: Props) {
  const t = useT(messages);
  const locale = useLocale();
  const plan = (row: CaptainRow) => row.tier === 'entry' && row.last_paid_ends_at !== null
    ? t('expiredPlan', { tier: row.last_paid_tier ? tierLabel(row.last_paid_tier) : t('plan'), date: endsLabel(row.last_paid_ends_at, locale) })
    : tierLabel(row.tier);
  const usage = (row: CaptainRow) => <>
    {usageLabel(row.active_players, row.player_limit, locale)}
    {row.over_limit && <span className="ms-2 inline-block rounded-full bg-warn/10 px-2 py-1 text-xs text-warn">{t('overLimit')}</span>}
  </>;
  const controls = (row: CaptainRow) => <div className="flex flex-wrap gap-2">
    <Button variant="secondary" className={selected === row.id ? 'border-lime text-lime' : ''} onClick={() => onActivate(row)}>{t('activate')}</Button>
    <Button variant="secondary" className={row.suspended ? undefined : 'border border-danger/40 text-danger'} onClick={() => onSuspend(row)}>{row.suspended ? t('restore') : t('suspend')}</Button>
  </div>;
  if (!rows.length) return <EmptyState icon={Users} title={t('noCaptains')} body={t('emptyHint')} action={onReset ? { label: t('clearSearch'), onClick: onReset } : { label: t('clearSearch'), href: '/admin' }} />;
  return <>
    <div className="hidden overflow-x-auto rounded-card border border-line lg:block">
      <table className="w-full text-start text-sm">
        <caption className="sr-only">{t('caption')}</caption>
        <thead className="bg-surface text-muted"><tr>
          {[t('captain'), t('plan'), t('players'), t('planEnd'), t('state'), t('actions')].map(title =>
            <th key={title} scope="col" className="p-4 text-start font-medium">{title}</th>)}
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className={selected === row.id ? 'border-t border-line bg-lime-soft' : 'border-t border-line bg-surface/50'}>
          <th scope="row" className="max-w-64 break-words p-4 text-start font-medium">
            {row.full_name}<span dir="ltr" className="mt-1 block break-all text-start text-xs text-muted">{row.email ?? t('noEmail')}</span>
          </th>
          <td className="p-4 font-bold">{plan(row)}</td>
          <td className="whitespace-nowrap p-4 tabular-nums">{usage(row)}</td>
          <td className="p-4">{endsLabel(row.tier_ends_at, locale)}</td>
          <td className="p-4">{t(stateLabels[captainState(row)])}</td>
          <td className="p-4">{controls(row)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <ul className="space-y-3 lg:hidden">{rows.map(row => <li key={row.id} className="glass space-y-4 rounded-card p-4">
      <div><h3 className="font-bold">{row.full_name}</h3>
        <p dir="ltr" className="break-all text-start text-sm text-muted">{row.email ?? t('noEmail')}</p></div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-muted">{t('plan')}</dt><dd>{plan(row)}</dd></div>
        <div><dt className="text-muted">{t('players')}</dt><dd>{usage(row)}</dd></div>
        <div><dt className="text-muted">{t('planEnd')}</dt><dd>{endsLabel(row.tier_ends_at, locale)}</dd></div>
        <div><dt className="text-muted">{t('state')}</dt><dd>{t(stateLabels[captainState(row)])}</dd></div>
      </dl>
      {controls(row)}
    </li>)}</ul>
  </>;
}
