'use client';
import dynamic from 'next/dynamic';
import { Archive } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { messages } from '../messages';
import type { RosterPlayer } from '../types';
import { RosterRowView } from './roster-row-view';

const RosterBilling = dynamic(() => import('@/features/billing').then(module => module.RosterBilling), { ssr: false });

export function RosterRow({ player, today, error, onArchive }: {
  player: RosterPlayer; today: string; error?: string; onArchive: () => void;
}) {
  const t = useT(messages), locale = useLocale();
  function archive() {
    if (!window.confirm(t('archiveTheyllBeRemovedFromThePlayer', { v0: player.fullName }))) return;
    onArchive();
  }
  return <RosterRowView player={player} today={today} error={error} t={t} locale={locale}
    billing={<RosterBilling playerId={player.playerId} name={player.fullName} today={today}
      pending={player.pending} frozenAt={player.frozenAt} sessionsLeft={player.sessionsLeft} />}
    archiveAction={<Button variant="ghost" onClick={archive} aria-label={t('archive', { v0: player.fullName })} className="min-h-12 min-w-12 px-0"><Archive aria-hidden className="size-5" /></Button>} />;
}
