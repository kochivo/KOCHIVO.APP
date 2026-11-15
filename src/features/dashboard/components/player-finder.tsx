'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { EmptyState, GlassCard } from '@/ui';
import { starterText } from '@/lib/starter-text';
import { matchesPlayer } from '../search';

export interface FinderPlayer {
  playerId: string;
  fullName: string;
  programTitle: string | null;
  /** Already localized on the server, e.g. "yesterday". */
  lastSeen: string;
}

export function PlayerFinder({ players, recent }: { players: FinderPlayer[]; recent: FinderPlayer[] }) {
  const t = useT(messages);
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const rows = searching ? players.filter((player) => matchesPlayer(player, query)).slice(0, 6) : recent;
  const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;
  return (
    <GlassCard role="region" aria-labelledby="finder-heading" className="min-w-0 space-y-card-gap p-card">
      <h2 id="finder-heading" className="text-xl font-bold">{t('findPlayer')}</h2>
      <label className="glass-raised flex min-h-12 items-center gap-stack rounded-control px-page-x focus-within:ring-2 focus-within:ring-lime">
        <Search aria-hidden className="size-5 shrink-0 text-muted" />
        <span className="sr-only">{t('findPlayer')}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')}
          className="min-h-12 w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-muted" />
      </label>
      <div>
        <p className="mb-inline text-xs font-bold text-muted">{searching ? t('allPlayers') : t('recent')}</p>
        {rows.length === 0 ? <EmptyState icon={Search} title={t('noMatch')} body={t('searchPlaceholder')} action={searching ? { label: t('clearSearch'), onClick: () => setQuery('') } : { label: t('goToPlayers'), href: '/captain/players' }} /> : <ul className="divide-y divide-line">
          {rows.map((player) => <li key={player.playerId}>
            <Link href={`/captain/players/${player.playerId}`} prefetch={false} className="flex min-h-14 items-center gap-stack py-inline hover:text-lime">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-ink/5 font-display font-extrabold">{player.fullName.trim().charAt(0)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{player.fullName}</span>
                <span className="block truncate text-xs text-muted">{player.programTitle ? starterText(player.programTitle, locale) : t('noProgram')} · {player.lastSeen}</span>
              </span>
              <Chevron aria-hidden className="size-5 shrink-0 text-muted" />
            </Link>
          </li>)}
        </ul>}
      </div>
      <Link href="/captain/players" className="inline-flex min-h-12 w-full items-center justify-center rounded-control text-sm font-bold hover:bg-ink/5">{t('allPlayers')}</Link>
    </GlassCard>
  );
}
