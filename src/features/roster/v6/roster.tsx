'use client';
import { use, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KoInvite } from '@/ui/icons/ko-invite';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { formatNumber } from '@/lib/format';
import type { WorkspaceRosterProps } from './types';
import { matchesTab, tabCounts, tabs, withOpenTasks } from './model';
import type { Tab } from './model';
import { messages } from './messages';
import { PlayerRow } from './player-row';
import { buttonClass } from '@/ui/button';

const emptyKeys = { all: 'emptyAll', needsYou: 'emptyNeedsYou', good: 'emptyGood', newPlayers: 'emptyNewPlayers',
  ending: 'emptyEnding', stopped: 'emptyStopped' } as const;

export function WorkspaceRoster({ data, today, extras, details }: WorkspaceRosterProps) {
  const [result] = use(data);
  const t = useT(messages), locale = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<Tab>('all');
  const [pending, startTransition] = useTransition();
  const activity = details && 'activity' in details ? details.activity : {};
  const players = withOpenTasks(result.players ?? [], activity);
  const counts = tabCounts(players, today);
  const visible = players.filter(player => matchesTab(player, filter, today));
  const failed = Boolean(result.error || extras.error || (details && 'error' in details));
  return <section className="space-y-card-gap">
    <PageBarTitle title={failed ? t('players') : t('playersCount', { count: formatNumber(players.length, locale) })} />
    <PageBarActions>
      <Link href="/captain/players/new" className={buttonClass({ variant: 'primary', block: false, className: "press inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-inline px-page-x text-xs font-semibold focus-visible:ring-2 focus-visible:ring-lime" })}><KoInvite aria-hidden className="size-4" />{t('add')}</Link>
    </PageBarActions>
    <div className="flex w-max max-w-full gap-inline overflow-x-auto rounded-full border border-line bg-bg-deep/25 p-inline" aria-label={t('players')}>
      {tabs.map(tab => <button key={tab} type="button" aria-pressed={filter === tab} onClick={() => setFilter(tab)}
        className={`min-h-12 shrink-0 whitespace-nowrap rounded-full px-stack text-micro ${filter === tab ? 'glass-strong text-ink' : 'text-muted hover:text-ink'}`}>
        {t(tab)}{!failed && <span className="ms-inline tabular-nums">{formatNumber(counts[tab], locale)}</span>}
      </button>)}
    </div>
    {failed ? <div role="alert" className="glass rounded-card p-card"><p className="text-danger">{t('error')}</p>
      <Button variant="secondary" className="min-h-12" onClick={() => startTransition(() => router.refresh())}>{t('retry')}</Button></div> :
      pending ? <div role="status" className="glass rounded-card p-card">{t('loading')}</div> :
      !visible.length ? <div className="glass rounded-card p-card text-sm text-muted">{t(emptyKeys[filter])}</div> : <>
        <div className="deferred-rows flex flex-col gap-inline min-[760px]:hidden">{visible.map(player => <PlayerRow key={player.playerId} mobile player={player}
          today={today} meta={extras.meta?.[player.playerId]} activity={activity[player.playerId]} />)}</div>
        <div className="glass hidden rounded-[20px] px-inline py-inline min-[760px]:block"><table className="w-full border-collapse text-start" aria-label={t('players')}>
          <thead><tr>{(['player', 'week', 'weight', 'rpe', 'subscription', 'status'] as const).map(key =>
            <th key={key} scope="col" className="border-b border-line-soft px-stack py-inline text-start text-xs font-medium text-faint">{t(key)}</th>)}</tr></thead>
          <tbody className="deferred-rows">{visible.map(player => <PlayerRow key={player.playerId} player={player} today={today}
            meta={extras.meta?.[player.playerId]} activity={activity[player.playerId]} />)}</tbody>
        </table></div>
      </>}
  </section>;
}
