'use client';
import { useT } from '@/core/i18n/client';
import { useChatThread } from '../hooks/use-chat-thread';
import { messages } from '../messages';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { markListened } from '@/features/voice-notes';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { ChatThread } from './chat-thread';
import { ChatComposer } from './chat-composer';

export function PlayerChat({ playerId, captainId }: { playerId: string; captainId: string }) {
  const t = useT(messages);
  const thread = useChatThread({ playerId, captainId, viewerId: playerId });
  return <>
    {thread.status === 'loading' ? <LoadingState variant="detail" /> : <>
      {(thread.status === 'error' || thread.readError) && <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => void thread.refresh()} />}
      {(thread.status !== 'error' || thread.items.length > 0) && <ChatThread items={thread.items} viewer="player" onRetry={thread.retry} onVoicePlay={item => {
        if (item.source === 'voice_note' && !item.readAt) void loadSupabaseBrowser().then(client => markListened(client, item.id.slice(6), new Date())).then(() => thread.refresh()).catch(() => thread.refresh());
      }} />}
    </>}
    <ChatComposer viewer="player" onSendText={thread.sendText} onSendVoice={thread.sendVoice} />
  </>;
}
