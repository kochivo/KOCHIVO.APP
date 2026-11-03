'use client';
import type { ReactNode } from 'react';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { use, useRef, useState, useTransition } from 'react';
import { applyOptimistic } from '@/lib/optimistic';
import { archivePlayer } from '../data/archive-player';
import { useRouter } from 'next/navigation';
import { Plus, UserPlus, Users } from 'lucide-react';
import { Button, Chip, EmptyState, ErrorState, LoadingState, TextField } from '@/ui';
import { playerStatus } from '../status';
import type { RosterResult } from '../types';
import { RosterRow } from './roster-row';
import { InviteSheet } from './invite-sheet';
import { useDemoExpiry } from '@/features/demo';

export function RosterScreen({ data, today, plan }: { data: Promise<[RosterResult, string]>; today: string; plan?: ReactNode }) {
  const t = useT(messages);
  const locale = useLocale();
  const demo = useDemoExpiry();
  const [result, captainFirstName] = use(data);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [archived, setArchived] = useState<Record<string, boolean>>({});
  const [archiveErrors, setArchiveErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());
  const players = (result.players ?? []).filter(player => !archived[player.playerId]);
  async function archive(id: string) {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    setArchiveErrors(current => ({ ...current, [id]: '' }));
    let failure = t('couldntArchiveTryAgain');
    try {
      await applyOptimistic(false, {
        apply: () => setArchived(current => ({ ...current, [id]: true })),
        rollback: previous => setArchived(current => ({ ...current, [id]: previous })),
      }, async () => {
        const response = await archivePlayer(id);
        if ('error' in response) { failure = response.error; throw new Error(failure); }
      });
    } catch {
      setArchiveErrors(current => ({ ...current, [id]: failure }));
    } finally { inFlight.current.delete(id); }
  }
  const statuses = players.map((player) => ({ player, status: playerStatus({ ...player, today }) }));
  const visible = statuses.filter(({ player, status }) => (filter === 'all' || status === filter)
    && player.fullName.includes(search.trim()));
  const inviteButton = <Button onClick={() => setInviteOpen(true)} className="min-h-12"><Plus aria-hidden className="size-5" />{demo ? t('invitesAreDisabledInTheDemo') : t('newPlayer')}</Button>;
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-xs text-muted">{t('playerCount', { n: players.length, count: formatNumber(players.length, locale) })}</p><h1 className="text-3xl font-extrabold">{t('players')}</h1></div>
        <div className="flex flex-wrap items-center gap-3">{plan}{(players.length > 0 || result.error) && inviteButton}</div>
      </header>
      {pending ? <LoadingState variant="list" /> : result.error ? <ErrorState message={result.error} retryLabel={t('tryAgain')} onRetry={() => startTransition(() => router.refresh())} /> : players.length === 0 ? (
        <EmptyState icon={UserPlus} title={demo ? t('noDemoDataYet') : t('noPlayersYetSendYourFirstInvite')} body={demo ? t('invitesAreDisabledInTheDemo') : t('startWithAnInviteLink')} steps={demo ? undefined : [t('stepInvite'), t('stepIntake'), t('stepAssign')]} action={{ label: demo ? t('invitesAreDisabledInTheDemo') : t('newPlayer'), onClick: () => setInviteOpen(true) }} />
      ) : <>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div aria-label={t('filterPlayers')} className="flex flex-wrap gap-2">
            {([{ value: 'all', label: t('all') }, { value: 'late', label: t('late') }, { value: 'ending', label: t('endingSoon') }]).map(({ value, label }) => <Chip key={value} pressed={filter === value} onClick={() => setFilter(value)}>{label}</Chip>)}
          </div>
          <div className="w-full sm:max-w-xs"><TextField label={t('searchPlayers')} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('playerName')} /></div>
        </div>
        {visible.length === 0 ? <EmptyState icon={Users} title={search.trim() ? t('noPlayerWithThisName') : t('noPlayersMatchThisFilter')} body={t('tryAnotherNameOrFilter')} action={{ label: t('clearSearchAndFilter'), onClick: () => { setSearch(''); setFilter('all'); } }} /> : (
          <div role="table" aria-label={t('players')} className="space-y-3 lg:glass-strong lg:overflow-hidden lg:rounded-card lg:space-y-0">
            <div role="rowgroup" className="hidden lg:block"><div role="row" className="grid grid-cols-[1.3fr_1fr_1fr_1.2fr_1fr_3rem] gap-4 p-4 text-xs text-muted">
              {[t('player2'), t('status'), t('lastActivity2'), t('program'), t('accessUntil2'), t('archive2')].map((label) => <span role="columnheader" key={label}>{label}</span>)}
            </div></div>
            <div role="rowgroup" className="space-y-3 lg:space-y-0">{visible.map(({ player }) => <RosterRow key={player.playerId} player={player} today={today} error={archiveErrors[player.playerId]} onArchive={() => void archive(player.playerId)} />)}</div>
          </div>
        )}
      </>}
      {inviteOpen && <InviteSheet captainFirstName={captainFirstName} onClose={() => setInviteOpen(false)} />}
    </section>
  );
}
