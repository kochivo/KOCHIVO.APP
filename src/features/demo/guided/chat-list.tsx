import { useT } from '@/core/i18n/client';
/* eslint-disable no-restricted-imports -- Shared, server-safe inbox list for T-288. */
import { ConversationList } from '@/features/inbox/components/conversation-list';
import type { Conversation } from '@/features/inbox/conversation-types';
/* eslint-enable no-restricted-imports */
import { guidedMessages } from './messages';
import type { PaneProps } from './types';
import type { Thread } from './state';

const threads: Thread[] = ['mohamed', 'sara', 'omar'];
export function ChatList({ state, dispatch }: PaneProps) {
  const t = useT(guidedMessages), names = t('names').split('|');
  const rows: Conversation[] = threads.map((id, index) => ({
    player: { playerId: id, fullName: names[index] ?? '', accessUntil: '2026-12-15', startedOn: '2026-10-15',
      lastTrainingDate: '2026-11-15', programTitle: t('programTitle'), openTasks: 0 },
    unread: id === 'mohamed' ? state.unread : 1,
    latest: { id: `preview-${id}`, playerId: id, captainId: 'captain', senderId: id, source: 'chat', kind: 'text',
      mine: state.threads[id].at(-1)?.from === 'captain', status: 'sent', audioPath: null, durationSeconds: null,
      readAt: null, createdAt: '2026-11-15T06:42:00Z',
      body: state.threads[id].at(-1)?.text ?? t(id === 'sara' ? 'saraMessage' : id === 'omar' ? 'omarMessage' : 'initialPlayer') },
  }));
  return <ConversationList rows={rows} selected={state.chat} onSelect={id => {
    const chat = threads.find(thread => thread === id);
    if (chat) dispatch({ type: 'patch', patch: { chat } });
  }} />;
}
