'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { daysBetween, formatTimestampAr, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button, buttonClass, clickableClass } from '@/ui/button';
import { conversationMessages } from '../conversation-messages';
import { conversationPreview, voiceDuration } from '../conversation-preview';
import type { Conversation } from '../conversation-types';
import { filters, filterConversations } from '../phone/filter-conversations';
import type { ConversationFilter } from '../phone/filter-conversations';
import { phoneMessages } from '../phone/messages';
import { ConversationAvatar } from './conversation-avatar';

export function PhoneConversationList({ rows, at, onSelect }: { rows?: Conversation[]; at: string; onSelect: (id: string) => void }) {
  const allFilter = useRef<HTMLButtonElement>(null);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const t = useT(phoneMessages), chat = useT(conversationMessages), locale = useLocale(), timezone = useTimezone();
  const unread = rows?.filter(row => row.unread > 0).length ?? 0;
  const count = formatNumber(unread, locale);
  const today = localDate(new Date(at), timezone);
  const timestamp = (iso: string) => {
    const age = daysBetween(localDate(new Date(iso), timezone), today);
    if (age === 1) return chat('yesterday');
    const options: Intl.DateTimeFormatOptions = age <= 0 ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
      : age < 7 ? { weekday: 'long' } : { day: 'numeric', month: 'short' };
    return formatTimestampAr(iso, options, locale, timezone);
  };
  const visible = filterConversations(rows ?? [], filter);
  return <section className="space-y-card-gap md:hidden">
    <header className="flex min-h-12 items-center gap-stack">
      <Link href="/captain" aria-label={chat('back')} className={buttonClass({ variant: 'secondary', block: false, className: 'grid size-12 shrink-0 place-items-center px-0' })}>
        <ChevronRight aria-hidden className="size-5 ltr:rotate-180" />
      </Link>
      <div><h1 className="text-md font-bold">{chat('title')}</h1>
        {rows && <p className="text-micro text-muted">{t('newCount', { n: unread, count })}</p>}
      </div>
    </header>
    {rows && <>
      <div className="flex flex-wrap gap-inline">
        {filters.map(key => <Button key={key} ref={key === 'all' ? allFilter : undefined} variant="ghost" block={false} aria-pressed={filter === key}
          className="min-h-12 bg-surface px-inline text-xs text-muted aria-pressed:bg-surface-raised aria-pressed:font-bold aria-pressed:text-ink"
          onClick={() => setFilter(key)}>{key === 'unread' ? t(key, { n: count }) : t(key)}</Button>)}
      </div>
      <div className="glass overflow-hidden rounded-card">
        <p role="status" className={visible.length ? 'sr-only' : 'p-card text-center text-xs text-muted'}>
          {visible.length ? null : filter === 'all' ? chat('empty') : t(filter === 'photos' ? 'noPhotos' : 'noMatches')}
        </p>
        {visible.length ? <ul className="divide-y divide-line-soft">{visible.map(({ player, latest, unread }) => <li key={player.playerId}>
          <button type="button" onClick={() => onSelect(player.playerId)}
            className={`${clickableClass} flex min-h-16 w-full items-center gap-card-gap px-card text-start hover:bg-surface-raised`}>
            <ConversationAvatar name={player.fullName} url={player.avatarUrl} phone />
            <span className="min-w-0 flex-1"><b className="block truncate text-sm">{player.fullName}</b>
              <small className="block truncate text-xs text-muted">{latest?.kind === 'voice'
                ? t('voice', { duration: voiceDuration(latest.durationSeconds ?? 0) }) : conversationPreview(latest, chat)}</small></span>
            <span className="flex shrink-0 flex-col items-end gap-inline">
              {latest && Number.isFinite(Date.parse(latest.createdAt)) && <time dateTime={latest.createdAt} className="font-display text-micro text-muted">{timestamp(latest.createdAt)}</time>}
              {unread > 0 && <span role="img" aria-label={chat('unread', { n: formatNumber(unread, locale) }, unread)} className="size-2.5 rounded-full bg-lime" />}
            </span>
          </button>
        </li>)}</ul> : filter !== 'all' && <Button variant="secondary" block={false} className="mx-auto mb-card flex" onClick={() => {
          setFilter('all'); allFilter.current?.focus();
        }}>{t('resetFilters')}</Button>}
      </div>
    </>}
  </section>;
}
