'use client';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Ellipsis, Eye, Archive, Salad } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { DEFAULT_TIMEZONE, daysBetween, formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import type { RosterPlayer } from '../types';
import type { RosterMeta } from '../data/v6-roster';
import { lastSeenLabel } from '../status';
import { messages as legacyMessages } from '../messages';
import { messages } from './messages';
import { TierBadge } from '@/ui/tier-badge';

export function PlayerRow({ player, today, meta, hasFood, error, onArchive }: {
  player: RosterPlayer; today: string; meta?: RosterMeta; hasFood: boolean; error?: string; onArchive: () => void;
}) {
  const t = useT(messages), old = useT(legacyMessages), locale = useLocale();
  const [open, setOpen] = useState(false);
  const href = `/captain/players/${player.playerId}`;
  const goal = meta && meta.target !== null ? t(meta.target < meta.weight ? 'lose' : meta.target > meta.weight ? 'gain' : 'maintain') : t('unknown');
  const level = meta ? t(meta.experience === 'new' ? 'new' : meta.experience === 'under_1y' ? 'under_1y' : 'experienced') : t('unknown');
  const chat = player.chat;
  const chatTime = chat?.createdAt ? new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone: player.timezone ?? DEFAULT_TIMEZONE }).format(new Date(chat.createdAt)).replace(/^0/, '') : '';
  return <div role="row" className="relative isolate grid min-h-[72px] cursor-pointer grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-4 gap-y-3 border-t border-line-soft px-5 py-3 hover:bg-ink/5 lg:grid-cols-[1.4fr_1fr_1fr_1fr_3rem]">
    <div role="cell" className="flex min-w-0 items-center gap-2.5">
      {player.avatarUrl ? <Image src={player.avatarUrl} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-full object-cover" /> :
        <span aria-hidden className="glass-strong grid size-10 shrink-0 place-items-center rounded-full">{player.fullName.charAt(0)}</span>}
      <div className="min-w-0"><Link href={href} prefetch={false} className="block min-w-0 truncate font-medium after:absolute after:inset-0 after:min-h-12 hover:text-lime">{player.fullName}</Link>
        <p className="text-xs text-faint">{goal} · {level}</p>
        {chat?.createdAt && <Link href={`${href}/chat`} prefetch={false} className="relative z-10 flex min-h-12 items-center text-xs text-muted">
          <span className="truncate">{chat.voice ? old('chatVoice', { time: chatTime }) : chat.body?.split(/\r?\n/)[0]}</span>
        </Link>}
      </div><TierBadge tier={player.tier} />
      {(chat?.unread ?? 0) > 0 && <Link href={`${href}/chat`} prefetch={false}
        aria-label={old('chatUnread', { count: formatNumber(chat?.unread ?? 0, locale) })}
        className="relative z-10 inline-flex min-h-12 min-w-12 items-center justify-center rounded-full bg-lime px-2 font-display text-xs font-extrabold text-on-lime">{formatNumber(chat?.unread ?? 0, locale)}</Link>}
      {player.openTasks > 0 && <span className="text-xs text-lime" aria-label={old('taskCount', { n: player.openTasks, count: formatNumber(player.openTasks, locale) })}>{formatNumber(player.openTasks, locale)}</span>}
    </div>
    <div role="cell" className="col-start-1 text-sm text-muted lg:col-auto"><span className="me-2 text-xs text-faint lg:hidden">{t('lastWorkout')}</span>{lastSeenLabel(player.lastTrainingDate, player.playerToday ?? today, locale)}</div>
    <div role="cell" className="col-start-1 min-w-0 break-words lg:col-auto"><span className="text-[13px]">{player.programTitle ? starterText(player.programTitle, locale) : t('noProgram')}</span>
      {!hasFood && <p className="mt-1 flex items-center gap-1 text-xs text-faint"><Salad aria-hidden className="size-3" />{t('noFood')}</p>}
    </div>
    <div role="cell" className="col-start-1 text-sm text-muted lg:col-auto">
      <time dateTime={player.accessUntil} title={formatDateAr(player.accessUntil, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}>
        {t('days', { count: formatNumber(daysBetween(today, player.accessUntil), locale) })}
      </time>
    </div>
    <div role="cell" className="relative z-10 col-start-2 row-start-1 lg:col-auto lg:row-auto">
      <div className="relative" onClick={event => event.stopPropagation()}>
        <IconButton aria-label={t('menu', { name: player.fullName })} aria-expanded={open} onClick={() => setOpen(!open)}><Ellipsis aria-hidden className="size-5" /></IconButton>
        <div hidden={!open} className="glass-strong absolute end-0 z-20 w-48 rounded-card border border-line-soft p-2 shadow-xl">
          <Link href={`${href}/preview`} prefetch={false} className="glass flex min-h-12 items-center gap-2 rounded-full border border-line px-3 text-sm hover:bg-ink/5"><Eye aria-hidden className="size-4" />{t('preview')}</Link>
          <Button variant="secondary" type="button" onClick={() => { if (window.confirm(old('archiveTheyllBeRemovedFromThePlayer', { v0: player.fullName }))) onArchive(); }}
            className="flex min-h-12 w-full items-center gap-2 rounded-full border border-danger/40 px-3 text-sm text-danger! hover:bg-ink/5"><Archive aria-hidden className="size-4" />{t('archive')}</Button>
        </div>
      </div>
    </div>
    {error && <p role="alert" className="col-span-full text-sm text-danger">{error}</p>}
  </div>;
}
