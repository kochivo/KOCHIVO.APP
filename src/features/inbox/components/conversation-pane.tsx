'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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

export function ConversationPane({ player, captainId, at, onBack, onGuard, onUpdate }: {
  player: RosterPlayer; captainId: string; at: string; onBack: () => void;
  onGuard: (guard: () => boolean) => void; onUpdate: (playerId: string, latest: ChatThreadItem | undefined) => void;
}) {
  const t = useT(conversationMessages), locale = useLocale();
  const thread = useChatThread({ playerId: player.playerId, captainId, viewerId: captainId });
  const latest = latestSentMessage(thread.items);
  useEffect(() => { if (thread.status === 'ready' && !thread.readError) onUpdate(player.playerId, latest); }, [latest, thread.status, thread.readError, onUpdate, player.playerId]);
  const days = Math.max(0, Math.ceil((Date.parse(player.accessUntil) - Date.parse(at)) / 86400000));
  return <section className="glass flex min-h-[470px] min-w-0 flex-col gap-2.5 rounded-card border border-line-soft p-[18px]">
    <header className="flex items-center gap-2.5 border-b border-line pb-2.5">
      <button type="button" aria-label={t('back')} onClick={onBack} className="grid min-h-12 min-w-12 place-items-center min-[760px]:hidden"><ArrowRight aria-hidden className="size-4 ltr:rotate-180" /></button>
      <ConversationAvatar name={player.fullName} url={player.avatarUrl} />
      <div className="min-w-0 flex-1"><h2 className="text-[13px] font-semibold">{player.fullName}</h2>
        {Number.isFinite(days) && <p className="text-[11.5px] text-muted">{t('remaining', { n: formatNumber(days, locale) })}</p>}</div>
      <Link href={`/captain/players/${player.playerId}`} className="glass inline-flex min-h-12 items-center rounded-full border border-line px-3.5 text-[11.5px]">{t('profile')}</Link>
    </header>
    {thread.status === 'loading' ? <div className="flex-1"><LoadingState variant="detail" aria-label={t('loading')} /></div> : <>
      {(thread.status === 'error' || thread.readError) && <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => void thread.refresh()} />}
      <ConversationBubbles items={thread.items} onRetry={thread.retry} />
    </>}
    <ConversationCompose onSendText={thread.sendText} onSendVoice={thread.sendVoice} onGuard={onGuard} />
  </section>;
}
