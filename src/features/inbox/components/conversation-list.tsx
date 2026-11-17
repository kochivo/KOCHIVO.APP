'use client';
import { clickableClass } from '@/ui/button';
import { useTimezone } from '@/core/timezone/client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { Conversation } from '../conversation-types';
import { conversationMessages } from '../conversation-messages';
import { conversationPreview } from '../conversation-preview';
import { ConversationAvatar } from './conversation-avatar';

export function ConversationList({ rows, selected, onSelect }: {
  rows: Conversation[]; selected?: string; onSelect: (id: string) => void;
}) {
  const t = useT(conversationMessages), locale = useLocale(), timezone = useTimezone();
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: timezone });
  return <section aria-label={t('conversations')} className="glass min-w-0 overflow-hidden rounded-card">
    {!rows.length ? <p className="p-section text-center text-xs text-muted">{t('empty')}</p> : <ul>
      {rows.map(({ player, latest, unread }) => <li key={player.playerId} className="border-line-soft [&+li]:border-t">
        <button type="button" aria-pressed={selected === player.playerId} onClick={() => onSelect(player.playerId)}
          className={`${clickableClass} flex min-h-[58px] w-full items-center gap-stack border-s-2 border-transparent px-card py-stack text-start ${selected === player.playerId ? 'bg-surface-raised border-s-lime' : 'hover:bg-surface-raised'}`}>
          <ConversationAvatar name={player.fullName} url={player.avatarUrl} />
          <span className="min-w-0 flex-1"><b className="block text-row font-semibold">{player.fullName}</b>
            <small className="block truncate text-micro text-muted">{conversationPreview(latest, t)}</small></span>
          {unread > 0 && <span aria-label={t('unread', { n: formatNumber(unread, locale) })}
            className="rounded-full border border-lime/20 bg-lime-soft px-inline py-inline font-display text-micro text-lime">{formatNumber(unread, locale)}</span>}
          {latest && Number.isFinite(Date.parse(latest.createdAt)) && <time dateTime={latest.createdAt} className="shrink-0 text-micro text-muted">{time.format(new Date(latest.createdAt))}</time>}
        </button>
      </li>)}
    </ul>}
  </section>;
}
