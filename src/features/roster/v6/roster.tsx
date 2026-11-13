'use client';
import { KoInvite } from '@/ui/icons/ko-invite';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { use, useRef, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Search, UserPlus } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useDemoExpiry } from '@/features/demo';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { formatNumber } from '@/lib/format';
import { applyOptimistic } from '@/lib/optimistic';
import { archivePlayer } from '../data/archive-player';
import type { WorkspaceRosterProps } from './types';
import { filterRoster, rosterCounts } from '../v6-model';
import type { RosterFilter } from '../v6-model';
import { messages as legacyMessages } from '../messages';
import { messages } from './messages';
import { PlayerRow } from './player-row';

const InviteSheet = dynamic(() => import('../components/invite-sheet').then(module => module.InviteSheet));

export function WorkspaceRoster({ data, today, extras, RequestList }: WorkspaceRosterProps) {
  const UserPlusIcon = captainWorkspaceEnabled() ? KoInvite : UserPlus;
  const [result, captainFirstName] = use(data);
  const t = useT(messages), old = useT(legacyMessages), locale = useLocale();
  const router = useRouter(), demo = useDemoExpiry();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<RosterFilter | 'requests'>('active');
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [archived, setArchived] = useState<string[]>([]);
  const [resolved, setResolved] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());
  const players = (result.players ?? []).filter(player => !archived.includes(player.playerId));
  const counts = rosterCounts(players, today);
  const removed = archived.filter(id => result.players?.some(player => player.playerId === id)).length;
  const requests = (extras.requests ?? []).filter(row => !resolved.includes(row.id));
  const currentFilter = filter;
  const visible = filterRoster(players, currentFilter === 'requests' ? 'active' : currentFilter, search, today);
  const n = (value: number) => formatNumber(value, locale);
  async function archive(id: string) {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id); setErrors(current => ({ ...current, [id]: '' }));
    let failure = old('couldntArchiveTryAgain');
    try {
      await applyOptimistic(false, { apply: () => setArchived(current => [...current, id]),
        rollback: () => setArchived(current => current.filter(value => value !== id)) }, async () => {
        const response = await archivePlayer(id);
        if ('error' in response) { failure = response.error; throw new Error(failure); }
      });
    } catch { setErrors(current => ({ ...current, [id]: failure })); }
    finally { inFlight.current.delete(id); }
  }
  const retry = () => startTransition(() => router.refresh());
  const failed = Boolean(result.error || extras.error);
  return <section className="space-y-[18px]">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="font-display text-[30px] font-semibold leading-tight">{t('players')}</h1>
        <p className="mt-1 text-sm text-muted">{extras.free !== undefined ? t('capacity', { active: n(players.length), free: n(extras.free + removed) }) : t('unknown')}</p></div>
      <Button className="min-h-12 rounded-full" onClick={() => setInviteOpen(true)}><UserPlusIcon aria-hidden className="size-5" />{t('add')}</Button>
    </header>
    <div className="flex flex-wrap items-center gap-2">
      {(['active', 'needsProgram', 'late', 'ending'] as const).map(key => <Chip key={key} pressed={currentFilter === key}
        className={currentFilter === key ? 'border-ink! bg-ink! text-bg-deep!' : 'text-muted'} onClick={() => setFilter(key)}>
        {t(key)}<b className="ms-2 font-display font-extrabold tabular-nums opacity-60">{n(counts[key])}</b>
      </Chip>)}
      {requests.length > 0 && <Chip pressed={currentFilter === 'requests'} className="border-lime text-lime" onClick={() => setFilter('requests')}>
        {t('requests')}<b className="ms-2 font-display font-extrabold tabular-nums">{n(requests.length)}</b>
      </Chip>}
      <label className="glass flex min-h-12 w-full items-center gap-2 rounded-full px-4 xl:ms-auto xl:w-56">
        <Search aria-hidden className="size-4 shrink-0 text-faint" /><span className="sr-only">{t('search')}</span>
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('search')}
          className="min-w-0 flex-1 bg-transparent text-start text-xs outline-none placeholder:text-faint" />
      </label>
    </div>
    {failed ? <div role="alert" className="glass rounded-card border border-line-soft p-5">
      <p className="text-danger">{result.error || t('error')}</p><Button variant="ghost" className="rounded-full" onClick={retry}>{t('retry')}</Button>
    </div> : pending ? <div role="status" aria-label={t('loading')} className="glass rounded-card border border-line-soft">
      {[0, 1, 2].map(key => <div key={key} className="h-[72px] animate-pulse border-t border-line-soft bg-ink/5 first:border-0" />)}
    </div> : currentFilter === 'requests' ? <div className="glass rounded-card border border-line-soft p-5">
      <RequestList rows={requests.filter(row => row.full_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))}
        onResolved={id => setResolved(current => [...current, id])} />
    </div> : !visible.length ? <div className="glass space-y-3 rounded-card border border-line-soft p-5">
      <p className="text-faint">{players.length ? t('empty') : demo ? old('noDemoDataYet') : old('noPlayersYetSendYourFirstInvite')}</p>
      {players.length > 0 && <Button variant="secondary" className="min-h-12 rounded-full" onClick={() => { setSearch(''); setFilter('active'); }}>{old('clearSearchAndFilter')}</Button>}
      {!players.length && !demo && <ol className="space-y-1 text-xs text-muted">{(['stepInvite', 'stepIntake', 'stepAssign'] as const).map(key => <li key={key}>{old(key)}</li>)}</ol>}
    </div> : <div role="table" aria-label={t('players')} className="glass rounded-card border border-line-soft">
      <div role="rowgroup" className="hidden lg:block"><div role="row" className="grid min-h-12 grid-cols-[1.4fr_1fr_1fr_1fr_3rem] items-center gap-4 px-5 text-xs text-faint">
        {(['player', 'lastWorkout', 'plan', 'subscription'] as const).map(key => <span role="columnheader" key={key}>{t(key)}</span>)}
        <span role="columnheader" className="sr-only">{old('archive2')}</span>
      </div></div>
      <div role="rowgroup">{visible.map(player => <PlayerRow key={player.playerId} player={player} today={today}
        meta={extras.meta?.[player.playerId]} hasFood={extras.food?.includes(player.playerId) ?? false}
        error={errors[player.playerId]} onArchive={() => void archive(player.playerId)} />)}</div>
    </div>}
    {inviteOpen && <InviteSheet captainFirstName={captainFirstName} onClose={() => setInviteOpen(false)} />}
  </section>;
}
