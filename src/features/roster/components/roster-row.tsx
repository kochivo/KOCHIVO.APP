'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Archive } from 'lucide-react';
import { Button, GlassCard } from '@/ui';
import { lastSeenLabel, playerStatus } from '../status';
import { archivePlayer } from '../data/archive-player';
import type { RosterPlayer } from '../types';

const tags = {
  active: { label: 'نشط', color: 'bg-lime-soft text-lime' },
  late: { label: 'متأخر', color: 'bg-warn-soft text-warn' },
  ending: { label: 'هيخلص قريب', color: 'bg-danger-soft text-danger' },
  grace: { label: 'فترة سماح', color: 'bg-warn-soft text-warn' },
  expired: { label: 'خلص اشتراكه', color: 'bg-danger-soft text-danger' },
};

export function RosterRow({ player, today }: { player: RosterPlayer; today: string }) {
  const tag = tags[playerStatus({ ...player, today })];
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function archive() {
    if (!window.confirm(`تأكّد أرشفة ${player.fullName}؟ هيتشال من قائمة اللاعبين`)) return;
    setError('');
    startTransition(async () => {
      try {
        const result = await archivePlayer(player.playerId);
        if ('error' in result) setError(result.error);
        else router.refresh();
      } catch { setError('الأرشفة متعملتش. جرّب تاني'); }
    });
  }
  return (
    <GlassCard role="row" className="grid gap-4 p-4 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr_1fr_3rem] lg:items-center lg:rounded-none lg:border-0 lg:border-t lg:border-line lg:bg-transparent lg:shadow-none lg:backdrop-blur-none">
      <div role="cell" className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="glass flex size-10 shrink-0 items-center justify-center rounded-control font-bold">{player.fullName.slice(0, 1)}</span>
        <span className="break-words font-bold">{player.fullName}</span>
        {player.openTasks > 0 && <span aria-label={`${player.openTasks} مهام مستنياك`} className="rounded-full bg-lime px-2 py-1 text-xs font-bold text-on-lime">{player.openTasks}</span>}
      </div>
      <div role="cell"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tag.color}`}>{tag.label}</span></div>
      <div role="cell" className="text-sm text-muted"><span className="lg:hidden">آخر تسجيل: </span>{lastSeenLabel(player.lastTrainingDate, today)}</div>
      <div role="cell" className="break-words text-sm">{player.programTitle ?? 'من غير برنامج'}
        <span className="flex gap-4">
          <Link href={`/captain/players/${player.playerId}/programs`} className="flex min-h-12 items-center text-lime">البرامج</Link>
          <Link href={`/captain/players/${player.playerId}/nutrition`} className="flex min-h-12 items-center text-lime">الأكل</Link>
        </span>
      </div>
      <div role="cell" className="text-sm text-muted"><span className="lg:hidden">الاشتراك لحد: </span><time dateTime={player.accessUntil}>{new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${player.accessUntil}T00:00:00Z`))}</time></div>
      <div role="cell">
        <Button variant="ghost" disabled={pending} onClick={archive} aria-label={`أرشفة ${player.fullName}`} className="min-h-12 min-w-12 px-0"><Archive aria-hidden className="size-5" /></Button>
      </div>
      {pending && <p role="status" className="text-sm text-muted lg:col-span-6">جاري الأرشفة</p>}
      {error && <p role="alert" className="text-sm text-danger lg:col-span-6">{error}</p>}
    </GlassCard>
  );
}
