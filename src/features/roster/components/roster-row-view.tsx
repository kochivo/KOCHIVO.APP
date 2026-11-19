
import type { Locale } from '@/core/i18n/locale';
import type { Translator } from '@/core/i18n/messages';
import type { ReactNode } from 'react';
import { formatNumber } from '@/lib/format';
import type { messages } from '../messages';

import Link from 'next/link';
import Image from 'next/image';
import { Ellipsis } from 'lucide-react';
import { RowChevron } from '@/ui/row-chevron';
import { DEFAULT_TIMEZONE, formatDateAr } from '@/lib/dates';
import { lastSeenLabel, playerStatus } from '../status';
import type { RosterPlayer } from '../types';
import { starterText } from '@/lib/starter-text';
import { clickableClass } from '@/ui/button';




export function RosterRowView({ player, today, error, t, locale, billing, archiveAction, onSelect }: {
  player: RosterPlayer; today: string; error?: string; t: Translator<typeof messages>; locale: Locale;
  billing?: ReactNode; archiveAction?: ReactNode; onSelect?: (href: string) => void;
}) {
  const tags = {
  active: { label: t('active'), color: 'tone-lime' },
  late: { label: t('late'), color: 'tone-warn' },
  ending: { label: t('endingSoon'), color: 'tone-danger' },
  grace: { label: t('gracePeriod'), color: 'tone-warn' },
  expired: { label: t('expired'), color: 'tone-danger' },
};
  const tag = tags[playerStatus({ ...player, today })];
  const chat = player.chat;
  const chatTime = chat?.createdAt ? new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone: player.timezone ?? DEFAULT_TIMEZONE }).format(new Date(chat.createdAt)).replace(/^0/, '') : '';
  return (
    <div role="row" className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center gap-inline border-t border-line-soft px-card py-inline min-[760px]:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_3rem] min-[760px]:gap-stack">
      <div role="cell" className="flex min-w-0 items-center gap-stack">
        <span aria-hidden className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 ${tag.color} ${tag.color === 'tone-lime' ? 'border-lime' : tag.color === 'tone-warn' ? 'border-warn' : 'border-danger'}`}>
          {player.avatarUrl ? <Image src={player.avatarUrl} alt="" width={40} height={40} unoptimized className="size-full object-cover" /> : player.fullName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}`}` : `/captain/players/${player.playerId}`} className={`${clickableClass} flex min-h-12 min-w-0 items-center gap-inline text-start`}>
            <span className="min-w-0 flex-1"><b className="block truncate text-row">{player.fullName}</b><small className="block truncate text-xs text-muted">{player.programTitle ? starterText(player.programTitle, locale) : t("noProgram")}</small></span><RowChevron />
          </Link>
        </div>
        {(chat?.unread ?? 0) > 0 && <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}/chat`}` : `/captain/players/${player.playerId}/chat`}
          aria-label={t('chatUnread', { n: chat?.unread ?? 0, count: formatNumber(chat?.unread ?? 0, locale) })}
          className="tone-lime inline-flex min-h-12 min-w-12 items-center justify-center rounded-full font-display text-xs font-bold">{formatNumber(chat?.unread ?? 0, locale)}</Link>}
        {player.openTasks > 0 && <span aria-label={t('taskCount', { n: player.openTasks, count: formatNumber(player.openTasks, locale) })} className="tone-lime rounded-full px-inline text-xs font-bold">{formatNumber(player.openTasks, locale)}</span>}
      </div>
      <div role="cell" className="text-xs text-muted"><span className="min-[760px]:hidden">{t("lastActivity")} </span>{lastSeenLabel(player.lastTrainingDate, player.playerToday ?? today, locale)}</div>
      <div role="cell" className="text-xs text-muted"><span className="min-[760px]:hidden">{t("accessUntil")} </span><time dateTime={player.accessUntil}>{formatDateAr(player.accessUntil, { day: "numeric", month: "long", year: "numeric" }, locale)}</time></div>
      <div role="cell" className="min-w-0 space-y-inline">{billing}
        {!player.pending && !player.frozenAt && <span className={`inline-flex rounded-md px-inline text-micro font-semibold ${tag.color}`}>{tag.label}</span>}</div>
      <details role="cell" className="relative">
        <summary aria-label={t("playerActions")} className="glass press grid min-h-12 min-w-12 cursor-pointer list-none place-items-center rounded-control"><Ellipsis aria-hidden className="size-4" /></summary>
        <div className="sheet absolute end-0 z-10 w-max max-w-[75vw] rounded-card border border-line p-stack">
          {chat?.createdAt && <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}/chat`}` : `/captain/players/${player.playerId}/chat`} className="flex min-h-12 items-center text-xs text-muted">
            <span className="truncate">{chat.voice ? t('chatVoice', { time: chatTime }) : chat.body?.split(/\r?\n/)[0]}</span>
          </Link>}

        <span className="flex flex-wrap gap-card-gap">
          <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}/programs`}` : `/captain/players/${player.playerId}/programs`} className="flex min-h-12 items-center text-lime">{t('programs')}</Link>
          <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}/nutrition`}` : `/captain/players/${player.playerId}/nutrition`} className="flex min-h-12 items-center text-lime">{t('nutrition')}</Link>
          <Link prefetch={false} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${`/captain/players/${player.playerId}/preview`}` : `/captain/players/${player.playerId}/preview`} className="flex min-h-12 items-center text-lime">{t('viewAsPlayer')}</Link>
        </span>

          {archiveAction}
        </div>
      </details>
      {error && <p role="alert" className="text-sm text-danger col-span-full">{error}</p>}
    </div>
  );
}
