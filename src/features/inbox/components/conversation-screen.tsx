'use client';
import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import type { ChatThreadItem } from '@/features/chat';
import { PageBarTitle } from '@/ui/page-bar-title';
import { LoadingState } from '@/ui/loading-state';
import { ErrorState } from '@/ui/error-state';
import { conversationMessages } from '../conversation-messages';
import type { ConversationProps } from '../conversation-types';
import { loadConversationPreviews } from '../data/conversation-previews';
import { ConversationList } from './conversation-list';
import { useConversationDesktop } from '../hooks/use-conversation-desktop';

const Pane = dynamic(() => import('./conversation-pane').then(module => module.ConversationPane), {
  loading: () => <LoadingState variant="detail" />,
});
export function ConversationScreen(props: ConversationProps) {
  const t = useT(conversationMessages), router = useRouter();
  const [selected, setSelected] = useState<string>();
  const [chatOpen, setChatOpen] = useState(false);
  const desktop = useConversationDesktop();
  const [updates, setUpdates] = useState<Record<string, { latest?: ChatThreadItem }>>({});
  const guard = useRef<() => boolean>(() => true);
  const onGuard = useCallback((check: () => boolean) => { guard.current = check; }, []);
  const { players, captainId, at, error } = props;
  const loader = useCallback(() => loadConversationPreviews({ players, captainId, at }), [players, captainId, at]);
  const resource = useResource(error || !captainId ? null : `captain-inbox-conversations:${captainId}:${at}:${players.map(player => player.playerId).join(',')}`, loader, { pollMs: 60000 });
  const rows = resource.data?.map(row => {
    const update = updates[row.player.playerId];
    return update && (update.latest?.createdAt ?? '') >= (row.latest?.createdAt ?? '') ? { ...row, latest: update.latest } : row;
  });
  const currentId = selected ?? rows?.[0]?.player.playerId;
  const current = rows?.find(row => row.player.playerId === currentId)?.player;
  const onUpdate = useCallback((playerId: string, latest: ChatThreadItem | undefined) => {
    setUpdates(previous => previous[playerId]?.latest === latest && playerId in previous ? previous : { ...previous, [playerId]: { latest } });
  }, []);
  const choose = (id: string) => {
    if (id !== currentId && !guard.current()) return;
    setSelected(id); setChatOpen(true);
  };
  return <section>
    <PageBarTitle title={t('title')} />
    {(error || resource.error || !captainId) && <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => error || !captainId ? router.refresh() : void resource.retry()} />}
    {!rows ? !error && !resource.error && captainId && <LoadingState variant="list" aria-label={t('loading')} /> :
      <div className="grid items-start gap-3 min-[760px]:grid-cols-[270px_minmax(0,1fr)]">
        <div className={chatOpen ? 'hidden min-[760px]:block' : ''}><ConversationList rows={rows} selected={currentId} onSelect={choose} /></div>
        <div className={chatOpen ? 'min-w-0' : 'hidden min-w-0 min-[760px]:block'}>
          {current ? (desktop || chatOpen) && <Pane key={current.playerId} player={current} captainId={captainId} at={at} onGuard={onGuard} onUpdate={onUpdate}
            onBack={() => { if (guard.current()) setChatOpen(false); }} />
            : <div className="glass flex min-h-[470px] items-center justify-center rounded-card border border-line-soft p-4 text-[12.5px] text-muted">{t(rows.length ? 'choose' : 'empty')}</div>}
        </div>
      </div>}
  </section>;
}
