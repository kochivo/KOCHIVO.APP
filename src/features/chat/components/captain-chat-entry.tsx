'use client';
import { useT } from '@/core/i18n/client';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { useChatThread } from '../hooks/use-chat-thread';
import { messages } from '../messages';
import { ChatThread } from './chat-thread';
import { ChatComposer } from './chat-composer';

export function CaptainChat({ playerId, captainId, playerName }: { playerId: string; captainId: string; playerName: string }) {
  const t = useT(messages);
  const thread = useChatThread({ playerId, captainId, viewerId: captainId });
  return <section className="min-w-0">
    {thread.status === 'loading' ? <LoadingState variant="detail" /> : <>
      {(thread.status === 'error' || thread.readError) && <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => void thread.refresh()} />}
      {(thread.status !== 'error' || thread.items.length > 0) && <ChatThread items={thread.items} viewer="captain" onRetry={thread.retry}
        hasOlder={thread.hasOlder} olderStatus={thread.olderStatus} onLoadOlder={thread.loadOlder} />}
    </>}
    <ChatComposer viewer="captain" playerName={playerName} onSendText={thread.sendText} onSendVoice={thread.sendVoice} />
  </section>;
}
