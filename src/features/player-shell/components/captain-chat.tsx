'use client';

import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { chatMessages, useChatThread } from '@/features/chat';
import { markListened } from '@/features/voice-notes';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { messages } from '../captain-messages';
import { CaptainQuickReplies } from './captain-quick-replies';
import css from './captain-chat.module.css';

const Thread = dynamic(() => import('@/features/chat').then(module => module.ChatThread));
const Composer = dynamic(() => import('@/features/chat').then(module => module.ChatComposer));

export function CaptainChat({ playerId, captainId }: { playerId: string; captainId: string }) {
  const t = useT(messages), chatT = useT(chatMessages);
  const thread = useChatThread({ playerId, captainId, viewerId: playerId });
  return <>
    <div className={`${css.thread} flex min-h-0 flex-1 flex-col overflow-y-auto`}>
      {thread.status === 'loading' ? <LoadingState variant="detail" /> : <>
        {(thread.status === 'error' || thread.readError) && <ErrorState message={chatT('error')}
          retryLabel={chatT('retry')} onRetry={() => void thread.refresh()} />}
        {(thread.status !== 'error' || thread.items.length > 0) && <div className="mt-auto">
          <Thread items={thread.items} viewer="player" onRetry={thread.retry}
            hasOlder={thread.hasOlder} olderStatus={thread.olderStatus} onLoadOlder={thread.loadOlder} onVoicePlay={item => {
              if (item.source === 'voice_note' && !item.readAt) void loadSupabaseBrowser()
                .then(client => markListened(client, item.id.slice(6), new Date()))
                .then(() => thread.refresh(), () => thread.refresh());
            }} />
        </div>}
      </>}
    </div>
    <div className={`${css.composer} shrink-0 space-y-stack`}>
      <CaptainQuickReplies replies={[t('okay'), t('alternative'), t('video')]} sendText={thread.sendText} />
      <Composer viewer="player" onSendText={thread.sendText} onSendVoice={thread.sendVoice} />
    </div>
  </>;
}
