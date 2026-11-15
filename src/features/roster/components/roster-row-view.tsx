
import type { Locale } from '@/core/i18n/locale';
import type { Translator } from '@/core/i18n/messages';
import type { ReactNode } from 'react';
import { formatNumber } from '@/lib/format';
import type { messages } from '../messages';

import Link from 'next/link';
import Image from 'next/image';
import { GlassCard } from '@/ui/glass-card';
import { DEFAULT_TIMEZONE, formatDateAr } from '@/lib/dates';
import { lastSeenLabel, playerStatus } from '../status';
import type { RosterPlayer } from '../types';
import { starterText } from '@/lib/starter-text';
import { buttonClass } from '@/ui/button';




export function RosterRowView({ player, today, error, t, locale, billing, archiveAction, onSelect }: {
  player: RosterPlayer; today: string; error?: string; t: Translator<typeof messages>; locale: Locale;
  billing?: ReactNode; archiveAction?: ReactNode; onSelect?: (href: string) => void;
}) {
  const tags = {
  active: { label: t('active'), color: 'bg-lime-soft text-lime' },
  late: { label: t('late'), color: 'bg-warn-soft text-warn' },
  ending: { label: t('endingSoon'), color: 'bg-danger-soft text-danger' },
  grace: { label: t('gracePeriod'), color: 'bg-warn-soft text-warn' },
  expired: { label: t('expired'), color: 'bg-danger-soft text-danger' },
};
  const tag = tags[playerStatus({ ...player, today })];
  const chat = player.chat;
  const chatTime = chat?.createdAt ? new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone: player.timezone ?? DEFAULT_TIMEZONE }).format(new Date(chat.createdAt)).replace(/^0/, '') : '';
  return (
    <GlassCard role="row" className="grid gap-card-gap p-card lg:grid-cols-[1.3fr_1fr_1fr_1.2fr_1fr_3rem] lg:items-center lg:rounded-none lg:border-0 lg:border-t lg:border-line lg:bg-transparent lg:shadow-none lg:backdrop-blur-none">
      <div role="cell" className="flex min-w-0 items-center gap-stack">
        {player.avatarUrl ? <Image src={player.avatarUrl} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-control object-cover" /> :
          <span aria-hidden className="glass flex size-10 shrink-0 items-center justify-center rounded-control font-bold">{player.fullName.slice(0, 1)}</span>}
        <div className="min-w-0 flex-1">
          <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}`}` : `/captain/players/${player.playerId}`} className="flex min-h-12 min-w-0 items-center truncate font-bold hover:text-lime">{player.fullName}</Link>
          {chat?.createdAt && <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}/chat`}` : `/captain/players/${player.playerId}/chat`} className="flex min-h-12 items-center text-xs text-muted">
            <span className="truncate">{chat.voice ? t('chatVoice', { time: chatTime }) : chat.body?.split(/\r?\n/)[0]}</span>
          </Link>}
        </div>
        {(chat?.unread ?? 0) > 0 && <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}/chat`}` : `/captain/players/${player.playerId}/chat`}
          aria-label={t('chatUnread', { count: formatNumber(chat?.unread ?? 0, locale) })}
          className={buttonClass({ variant: 'primary', block: false, className: "inline-flex min-h-12 min-w-12 items-center justify-center px-inline font-display text-xs font-extrabold" })}>{formatNumber(chat?.unread ?? 0, locale)}</Link>}
        {player.openTasks > 0 && <span aria-label={t('taskCount', { n: player.openTasks, count: formatNumber(player.openTasks, locale) })} className="rounded-full bg-lime px-inline py-inline text-xs font-bold text-on-lime">{formatNumber(player.openTasks, locale)}</span>}
      </div>
      <div role="cell" className="space-y-inline">{billing}
        {!player.pending && !player.frozenAt && <span className={`inline-flex rounded-full px-stack py-inline text-xs font-bold ${tag.color}`}>{tag.label}</span>}</div>
      <div role="cell" className="text-sm text-muted"><span className="lg:hidden">{t('lastActivity')} </span>{lastSeenLabel(player.lastTrainingDate, player.playerToday ?? today, locale)}</div>
      <div role="cell" className="min-w-0 break-words text-sm">{player.programTitle ? starterText(player.programTitle, locale) : t('noProgram')}
        <span className="flex flex-wrap gap-card-gap">
          <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}/programs`}` : `/captain/players/${player.playerId}/programs`} className="flex min-h-12 items-center text-lime">{t('programs')}</Link>
          <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}/nutrition`}` : `/captain/players/${player.playerId}/nutrition`} className="flex min-h-12 items-center text-lime">{t('nutrition')}</Link>
          <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}/preview`}` : `/captain/players/${player.playerId}/preview`} className="flex min-h-12 items-center text-lime">{t('viewAsPlayer')}</Link>
        </span>
      </div>
      <div role="cell" className="text-sm text-muted"><span className="lg:hidden">{t('accessUntil')} </span><time dateTime={player.accessUntil}>{formatDateAr(player.accessUntil, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}</time></div>
      <div role="cell">
        {archiveAction}
      </div>
      {error && <p role="alert" className="text-sm text-danger lg:col-span-6">{error}</p>}
    </GlassCard>
  );
}
