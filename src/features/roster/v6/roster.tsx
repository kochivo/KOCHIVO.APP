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
import { Search } from 'lucide-react';
import { saturdayWeek } from '@/lib/dates';
import { phoneMessages } from './phone/messages';

const emptyKeys = { all: 'emptyAll', needsYou: 'emptyNeedsYou', good: 'emptyGood', newPlayers: 'emptyNewPlayers',
  ending: 'emptyEnding', stopped: 'emptyStopped' } as const;

export function WorkspaceRoster({ data, today, extras, details }: WorkspaceRosterProps) {
  const [result] = use(data);
  const t = useT(messages), locale = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const phone = useT(phoneMessages);
  const [pending, startTransition] = useTransition();
  const activity = details && 'activity' in details ? details.activity : {};
  const players = withOpenTasks(result.players ?? [], activity);
  const counts = tabCounts(players, today);
  const visible = players.filter(player => matchesTab(player, filter, today));
  const query = search.trim().toLocaleLowerCase();
  const rows = visible.filter(player => player.fullName.toLocaleLowerCase().includes(query));
  const trained = players.filter(player => {
    const playerToday = player.playerToday ?? today;
    const week = saturdayWeek(playerToday);
    return activity[player.playerId]?.dates.some(date => date <= playerToday && week.includes(date));
  }).length;
  const failed = Boolean(result.error || extras.error || (details && 'error' in details));
  return <section className="space-y-card-gap">
    <PageBarTitle title={failed ? t('players') : t('playersCount', { count: formatNumber(players.length, locale) })}
      phoneTitle={t('players')} phoneSubtitle={!failed && details ? phone('summary', { n: players.length, total: formatNumber(players.length, locale), trained: formatNumber(trained, locale) }) : undefined} />
    <PageBarActions>
      <Link href="/captain/players/new" aria-label={t('add')} className={buttonClass({ variant: 'primary', block: false, className: "press inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-inline px-page-x text-xs font-semibold focus-visible:ring-2 focus-visible:ring-lime max-md:min-w-12 max-md:px-inline!" })}><KoInvite aria-hidden className="size-4" /><span className="max-md:sr-only">{t('add')}</span></Link>
    </PageBarActions>
    {!failed && <div className="space-y-stack">
      <label className="recessed flex min-h-12 items-center gap-inline rounded-control border border-line px-card">
        <Search aria-hidden className="size-4 shrink-0 text-muted" />
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label={phone('search')}
          placeholder={phone('search')} className="min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-lime" />
      </label>
    </div>}
    {([false, true] as const).map(mobile => <div key={String(mobile)} className={`${mobile ? 'flex md:hidden' : 'hidden md:flex'} w-max max-w-full gap-inline overflow-x-auto max-md:rounded-control md:rounded-full md:border md:border-line md:bg-bg-deep/25 md:p-inline`} aria-label={t('players')}>
      {(mobile ? ['all', 'needsYou', 'good', 'ending', 'newPlayers', 'stopped'] as const : tabs).map(tab => <button key={tab} type="button" aria-pressed={filter === tab} onClick={() => setFilter(tab)}
        className={`min-h-12 shrink-0 whitespace-nowrap rounded-control px-stack text-micro md:rounded-full ${filter === tab ? 'glass-strong text-ink' : 'text-muted hover:text-ink max-md:bg-ink/5'}`}>
        {tab === 'ending' ? <><span className="md:hidden">{phone('ending')}</span><span className="hidden md:inline">{t(tab)}</span></> : t(tab)}
        {!failed && <span className="ms-inline tabular-nums">{formatNumber(counts[tab], locale)}</span>}
      </button>)}
    </div>)}
    {failed ? <div role="alert" className="glass rounded-card p-card"><p className="text-danger">{t('error')}</p>
      <Button variant="secondary" className="min-h-12" onClick={() => startTransition(() => router.refresh())}>{t('retry')}</Button></div> :
      pending ? <div role="status" className="glass rounded-card p-card">{t('loading')}</div> :
      !visible.length ? <div className="glass rounded-card p-card text-sm text-muted">{t(emptyKeys[filter])}</div> :
      !rows.length ? <p role="status" className="glass rounded-card p-card text-sm text-muted">{phone('noResults')}</p> : <>
        <div className="glass deferred-rows overflow-hidden rounded-card md:hidden">{rows.map(player => <PlayerRow key={player.playerId} mobile player={player}
          today={today} meta={extras.meta?.[player.playerId]} activity={activity[player.playerId]} />)}</div>
        <div className="glass hidden rounded-[20px] px-inline py-inline md:block"><table className="w-full border-collapse text-start" aria-label={t('players')}>
          <thead><tr>{(['player', 'week', 'weight', 'rpe', 'subscription', 'status'] as const).map(key =>
            <th key={key} scope="col" className="border-b border-line-soft px-stack py-inline text-start text-xs font-medium text-faint">{t(key)}</th>)}</tr></thead>
          <tbody className="deferred-rows">{rows.map(player => <PlayerRow key={player.playerId} player={player} today={today}
            meta={extras.meta?.[player.playerId]} activity={activity[player.playerId]} />)}</tbody>
        </table></div>
      </>}
  </section>;
}
