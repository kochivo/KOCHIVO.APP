'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Archive } from 'lucide-react';
import { Button, GlassCard } from '@/ui';
import { formatDateAr } from '@/lib/dates';
import { lastSeenLabel, playerStatus } from '../status';
import { archivePlayer } from '../data/archive-player';
import type { RosterPlayer } from '../types';
import { starterText } from '@/lib/starter-text';



export function RosterRow({ player, today }: { player: RosterPlayer; today: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const tags = {
  active: { label: t('active'), color: 'bg-lime-soft text-lime' },
  late: { label: t('late'), color: 'bg-warn-soft text-warn' },
  ending: { label: t('endingSoon'), color: 'bg-danger-soft text-danger' },
  grace: { label: t('gracePeriod'), color: 'bg-warn-soft text-warn' },
  expired: { label: t('expired'), color: 'bg-danger-soft text-danger' },
};
  const tag = tags[playerStatus({ ...player, today })];
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function archive() {
    if (!window.confirm(t('archiveTheyllBeRemovedFromThePlayer', { v0: player.fullName }))) return;
    setError('');
    startTransition(async () => {
      try {
        const result = await archivePlayer(player.playerId);
        if ('error' in result) setError(result.error);
        else router.refresh();
      } catch { setError(t('couldntArchiveTryAgain')); }
    });
  }
  return (
    <GlassCard role="row" className="grid gap-4 p-4 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr_1fr_3rem] lg:items-center lg:rounded-none lg:border-0 lg:border-t lg:border-line lg:bg-transparent lg:shadow-none lg:backdrop-blur-none">
      <div role="cell" className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="glass flex size-10 shrink-0 items-center justify-center rounded-control font-bold">{player.fullName.slice(0, 1)}</span>
        <Link href={`/captain/players/${player.playerId}`} className="flex min-h-12 min-w-0 items-center truncate font-bold hover:text-lime">{player.fullName}</Link>
        {player.openTasks > 0 && <span aria-label={t('taskCount', { n: player.openTasks, count: formatNumber(player.openTasks, locale) })} className="rounded-full bg-lime px-2 py-1 text-xs font-bold text-on-lime">{formatNumber(player.openTasks, locale)}</span>}
      </div>
      <div role="cell"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tag.color}`}>{tag.label}</span></div>
      <div role="cell" className="text-sm text-muted"><span className="lg:hidden">{t('lastActivity')} </span>{lastSeenLabel(player.lastTrainingDate, today, locale)}</div>
      <div role="cell" className="min-w-0 break-words text-sm">{player.programTitle ? starterText(player.programTitle, locale) : t('noProgram')}
        <span className="flex flex-wrap gap-4">
          <Link href={`/captain/players/${player.playerId}/programs`} className="flex min-h-12 items-center text-lime">{t('programs')}</Link>
          <Link href={`/captain/players/${player.playerId}/nutrition`} className="flex min-h-12 items-center text-lime">{t('nutrition')}</Link>
          <Link href={`/captain/players/${player.playerId}/preview`} className="flex min-h-12 items-center text-lime">{t('viewAsPlayer')}</Link>
        </span>
      </div>
      <div role="cell" className="text-sm text-muted"><span className="lg:hidden">{t('accessUntil')} </span><time dateTime={player.accessUntil}>{formatDateAr(player.accessUntil, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}</time></div>
      <div role="cell">
        <Button variant="ghost" disabled={pending} onClick={archive} aria-label={t('archive', { v0: player.fullName })} className="min-h-12 min-w-12 px-0"><Archive aria-hidden className="size-5" /></Button>
      </div>
      {pending && <p role="status" className="text-sm text-muted lg:col-span-6">{t('archiving')}</p>}
      {error && <p role="alert" className="text-sm text-danger lg:col-span-6">{error}</p>}
    </GlassCard>
  );
}
