'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { EmptyState, ErrorState, GlassCard, LoadingState } from '@/ui';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { listVoiceNotes, markListened } from '../data/voice-notes';
import type { VoiceNote } from '../types';
import { VoiceNoteList } from './voice-note-list';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { loadCaptainThreadReplies } from '../data/captain-thread-replies';
import { captainThread } from '../player-thread';
import type { CaptainReply } from '../player-thread';
import { messages as threadMessages } from '../thread-messages';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; notes: VoiceNote[]; replies?: CaptainReply[]; repliesFailed?: boolean };

/** The signed-in player's notes from their captain. */
export function PlayerVoiceNotes() {
  const t = useT(messages);
  const threadT = useT(threadMessages);
  const v3 = captainWorkspaceEnabled();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const fetchNotes = useCallback(async () => {
    try {
      const client = await loadSupabaseBrowser();
      const auth = await client.auth.getUser();
      if (auth.error || !auth.data.user) throw new Error('Not signed in');
      const notes = await listVoiceNotes(client, auth.data.user.id);
      const replies = captainWorkspaceEnabled() ? await loadCaptainThreadReplies(client, auth.data.user.id)
        .then(rows => ({ rows, failed: false })).catch(() => ({ rows: [], failed: true })) : undefined;
      setLoad({ status: 'ready', notes, replies: replies?.rows, repliesFailed: replies?.failed });
    } catch (error) {
      console.warn('Loading voice notes failed', error);
      setLoad({ status: 'error' });
    }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void fetchNotes(); });
    return () => { active = false; };
  }, [fetchNotes]);
  const played = (note: VoiceNote) => {
    if (note.listenedAt) return;
    const now = new Date();
    void loadSupabaseBrowser().then((client) => markListened(client, note.id, now));
    setLoad((current) => current.status !== 'ready' ? current : { ...current, status: 'ready',
      notes: current.notes.map((item) => item.id === note.id ? { ...item, listenedAt: now.toISOString() } : item) });
  };
  const thread = load.status === 'ready' && v3 ? captainThread(load.notes, load.replies ?? []) : undefined;
  const Wrapper = v3 ? 'section' : GlassCard;
  return (
    <Wrapper role="region" aria-labelledby="voice-heading" className={v3 ? 'space-y-stack' : 'space-y-card-gap p-card'}>
      <h2 id="voice-heading" className={v3 ? 'sr-only' : 'text-xl font-bold'}>{t('fromCoach')}</h2>
      {load.status === 'ready' && load.repliesFailed && <ErrorState message={threadT('repliesFailed')} retryLabel={t('retry')} onRetry={() => void fetchNotes()} />}
      {load.status === 'loading' ? <LoadingState variant="list" /> : load.status === 'error' ?
        <ErrorState message={t('loadFailed')} retryLabel={t('retry')} onRetry={() => { setLoad({ status: 'loading' }); void fetchNotes(); }} /> :
        (thread ? thread.length === 0 : load.notes.length === 0) ? <EmptyState icon={Mic} title={v3 ? threadT('empty') : t('noNotesTitle')} body={t('noNotesBody')} action={{ label: t('sendCheckin'), href: '/player/progress' }} /> :
          <VoiceNoteList notes={load.notes} onPlay={played} thread={thread} />}
    </Wrapper>
  );
}
