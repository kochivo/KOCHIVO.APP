'use client';
import { clickableClass } from '@/ui/button';
import { RowChevron } from '@/ui/row-chevron';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { Conversation } from '../conversation-types';
import { conversationMessages } from '../conversation-messages';
import { conversationPreview } from '../conversation-preview';
import { ConversationAvatar } from './conversation-avatar';

export function ConversationList({ rows, selected, onSelect }: {
  rows: Conversation[]; selected?: string; onSelect: (id: string) => void;
}) {
  const t = useT(conversationMessages), locale = useLocale();
  return <section aria-label={t('conversations')} className="glass min-w-0 rounded-card border border-line-soft p-[18px]">
    {!rows.length ? <p className="p-6 text-center text-[12.5px] text-muted">{t('empty')}</p> : <ul>
      {rows.map(({ player, latest, unread }) => <li key={player.playerId} className="border-line-soft [&+li]:border-t">
        <button type="button" aria-pressed={selected === player.playerId} onClick={() => onSelect(player.playerId)}
          className={`${clickableClass} flex min-h-[58px] w-full items-center gap-3 rounded-xl border-line-soft px-2.5 py-2.5 text-start ${selected === player.playerId ? 'bg-surface-raised' : 'hover:bg-surface-raised'}`}>
          <ConversationAvatar name={player.fullName} url={player.avatarUrl} />
          <span className="min-w-0 flex-1"><b className="block text-[13px] font-semibold">{player.fullName}</b>
            <small className="block truncate text-[11.5px] text-muted">{conversationPreview(latest, t)}</small></span>
          {unread > 0 && <span aria-label={t('unread', { n: formatNumber(unread, locale) })}
            className="rounded-full border border-lime/20 bg-lime-soft px-2 py-0.5 font-display text-[11px] text-lime">{formatNumber(unread, locale)}</span>}
          <RowChevron />
        </button>
      </li>)}
    </ul>}
  </section>;
}
