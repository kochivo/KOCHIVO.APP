'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { messages as dashboardMessages } from '../dashboard/messages';
import { formatNumber } from '@/lib/format';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { Button } from '@/ui/button';
import { ChevronRight, Users } from 'lucide-react';
import { EmptyState } from '@/ui/empty-state';
import { captainState, endsLabel, stateLabels, tierLabel } from '../format';
import { contextAction, relativeActivity } from '../dashboard-ui';
import type { CaptainRow } from '../types';
import type { AdminCaptainActivity } from '../dashboard-types';

interface Props {
  rows: CaptainRow[]; selected: string | null;
  onActivate: (row: CaptainRow) => void; onSuspend: (row: CaptainRow) => void;
  onReset?: () => void; activity?: AdminCaptainActivity[]; now?: number;
  disabled?: boolean;
}
export function CaptainsTable({ rows, selected, onActivate, onReset, activity = [], now, disabled }: Props) {
  const t = useT(messages); const d = useT(dashboardMessages); const locale = useLocale();
  const clock = useCalendarClock();
  const currentTime = now ?? clock.now?.getTime();
  const plan = (row: CaptainRow) => <div className="space-y-inline"><span className="rounded-full border border-line bg-surface px-inline py-inline text-micro font-bold">{tierLabel(row.tier)}</span>
    {row.tier === 'entry' && row.last_paid_ends_at && <p className="text-xs text-muted">{t('expiredPlan', {
      tier: row.last_paid_tier ? tierLabel(row.last_paid_tier) : t('plan'), date: endsLabel(row.last_paid_ends_at, locale),
    })}</p>}</div>;
  const usage = (row: CaptainRow) => {
    const ratio = row.player_limit > 0 ? row.active_players / row.player_limit : row.active_players > 0 ? 1 : 0;
    return <div><span dir="ltr" className="num inline-block text-row">{d('usage', { active: formatNumber(row.active_players, locale), limit: formatNumber(row.player_limit, locale) })}</span>
      <div aria-hidden className="mt-inline h-1.5 w-24 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${ratio >= .9 ? 'bg-warn' : 'bg-lime'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>{row.over_limit && <span className="text-micro text-warn">{t('overLimit')}</span>}</div>;
  };
  const lastActive = (row: CaptainRow) => {
    const relative = relativeActivity(currentTime === undefined ? null : activity.find(item => item.id === row.id)?.lastActiveAt, currentTime ?? 0);
    return d(relative.key, { n: formatNumber(relative.days ?? 0, locale) }, relative.days);
  };
  const state = (row: CaptainRow) => <span className={`rounded-full border border-line px-inline py-inline text-micro ${row.suspended ? 'bg-danger-soft text-danger' : row.tier === 'entry' ? 'bg-surface text-muted' : 'bg-calm-soft text-calm'}`}>{t(stateLabels[captainState(row)])}</span>;
  const controls = (row: CaptainRow) => {
    const action = contextAction(row, activity.find(item => item.id === row.id));
    return <Button variant="secondary" disabled={disabled} className={selected === row.id ? 'border-lime text-lime' : ''} onClick={() => onActivate(row)}>
      {action === 'activate' || action === 'restore' ? t(action) : d(action)}<ChevronRight aria-hidden className="dir-icon size-4" />
    </Button>;
  };
  const who = (row: CaptainRow) => <div className="flex items-center gap-inline">
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-control bg-calm-soft text-calm">{Array.from(row.full_name)[0]}</span>
    <div className="min-w-0"><span className="block break-words font-semibold">{row.full_name}</span>
      <span dir="ltr" className="block break-all text-start text-xs text-muted">{row.email ?? t('noEmail')}</span></div>
  </div>;
  if (!rows.length) return <EmptyState icon={Users} title={t('noCaptains')} body={t('emptyHint')} secondary={onReset ? { label: t('clearSearch'), onClick: onReset } : { label: t('clearSearch'), href: '/admin' }} />;
  return <>
    <div className="hidden overflow-x-auto min-[720px]:block">
      <table className="w-full text-start text-row">
        <caption className="sr-only">{t('caption')}</caption>
        <thead className="text-muted"><tr>
          {[t('captain'), t('plan'), t('players'), d('lastActive'), t('planEnd'), t('state'), t('actions')].map(title =>
            <th key={title} scope="col" className="p-stack text-start text-xs font-medium">{title}</th>)}
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className={`border-t border-line ${selected === row.id ? 'bg-lime-soft' : ''}`}>
          <th scope="row" className="max-w-64 p-stack text-start font-medium">{who(row)}</th>
          <td className="p-stack">{plan(row)}</td><td className="p-stack">{usage(row)}</td>
          <td className="p-stack text-xs text-muted">{lastActive(row)}</td>
          <td className="p-stack text-xs">{endsLabel(row.tier_ends_at, locale)}</td><td className="p-stack">{state(row)}</td>
          <td className="p-stack">{controls(row)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <ul className="space-y-stack min-[720px]:hidden">{rows.map(row => <li key={row.id} className="grid gap-stack rounded-card border border-line p-card">
      {who(row)}<div className="flex flex-wrap items-center justify-between gap-stack">{plan(row)}{state(row)}</div>
      <dl className="grid grid-cols-2 gap-stack text-xs">
        <div><dt className="text-muted">{t('players')}</dt><dd>{usage(row)}</dd></div>
        <div><dt className="text-muted">{t('planEnd')}</dt><dd>{endsLabel(row.tier_ends_at, locale)}</dd></div>
      </dl>
      <div className="flex items-center justify-between gap-inline"><span className="text-xs text-muted">{lastActive(row)}</span>{controls(row)}</div>
    </li>)}</ul>
  </>;
}
