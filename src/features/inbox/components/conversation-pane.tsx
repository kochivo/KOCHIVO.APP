'use client';
import { secondaryButtonClass } from '@/ui/secondary-button-class';
import Link from 'next/link';
import { ArrowRight, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { useChatThread } from '@/features/chat';
import type { ChatThreadItem } from '@/features/chat';
import type { RosterPlayer } from '@/features/roster';
import { formatNumber } from '@/lib/format';
import { LoadingState } from '@/ui/loading-state';
import { ErrorState } from '@/ui/error-state';
import { conversationMessages } from '../conversation-messages';
import { latestSentMessage } from '../conversation-preview';
import { ConversationAvatar } from './conversation-avatar';
import { ConversationBubbles } from './conversation-bubbles';
import { ConversationCompose } from './conversation-compose';
import { buttonClass } from '@/ui/button';

export function ConversationPane({ player, captainId, at, onBack, onGuard, onUpdate }: {
  player: RosterPlayer; captainId: string; at: string; onBack: () => void;
  onGuard: (guard: () => boolean) => void; onUpdate: (playerId: string, latest: ChatThreadItem | undefined) => void;
}) {
  const t = useT(conversationMessages), locale = useLocale();
  const thread = useChatThread({ playerId: player.playerId, captainId, viewerId: captainId });
  const latest = latestSentMessage(thread.items);
  useEffect(() => { if (thread.status === 'ready' && !thread.readError) onUpdate(player.playerId, latest); }, [latest, thread.status, thread.readError, onUpdate, player.playerId]);
  const days = Math.max(0, Math.ceil((Date.parse(player.accessUntil) - Date.parse(at)) / 86400000));
  return <section className="glass flex h-[calc(100dvh-10rem)] min-h-[470px] min-w-0 flex-col overflow-hidden rounded-card max-md:h-[calc(100dvh-12rem)] max-md:min-h-0 max-md:border-0 max-md:bg-none max-md:shadow-none md:h-[calc(100dvh-8rem)]">
    <header className="flex items-center gap-stack border-b border-line-soft px-card py-stack max-md:border-0 max-md:p-0">
      <button type="button" aria-label={t('back')} onClick={onBack} className={`${secondaryButtonClass} grid min-h-12 min-w-12 place-items-center md:hidden`}><ArrowRight aria-hidden className="size-4 ltr:rotate-180" /></button>
      <ConversationAvatar name={player.fullName} url={player.avatarUrl} phone />
      <div className="min-w-0 flex-1"><h2 className="text-row font-semibold max-md:text-md">{player.fullName}</h2>
        {Number.isFinite(days) && <p className="text-micro text-muted">{t(days === 0 ? 'remainingToday' : 'remaining', { n: formatNumber(days, locale) }, days)}</p>}</div>
      <Link href={`/captain/players/${player.playerId}`} aria-label={t('profile')} className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-card text-micro max-md:min-w-12 max-md:px-0" })}>
        <span className="max-md:hidden">{t('profile')}</span><UserRound aria-hidden className="size-5 md:hidden" />
      </Link>
    </header>
    {thread.status === 'loading' ? <div className="flex-1"><LoadingState variant="detail" aria-label={t('loading')} /></div> : <>
      {(thread.status === 'error' || thread.readError) && <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => void thread.refresh()} />}
      <ConversationBubbles items={thread.items} onRetry={thread.retry} />
    </>}
    <ConversationCompose onSendText={thread.sendText} onSendVoice={thread.sendVoice} onGuard={onGuard} />
  </section>;
}
