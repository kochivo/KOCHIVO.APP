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

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; notes: VoiceNote[] };

/** The signed-in player's notes from their captain. */
export function PlayerVoiceNotes() {
  const t = useT(messages);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const fetchNotes = useCallback(async () => {
    try {
      const client = await loadSupabaseBrowser();
      const auth = await client.auth.getUser();
      if (auth.error || !auth.data.user) throw new Error('Not signed in');
      setLoad({ status: 'ready', notes: await listVoiceNotes(client, auth.data.user.id) });
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
    setLoad((current) => current.status !== 'ready' ? current : { status: 'ready',
      notes: current.notes.map((item) => item.id === note.id ? { ...item, listenedAt: now.toISOString() } : item) });
  };
  return (
    <GlassCard role="region" aria-labelledby="voice-heading" className="space-y-4 p-5">
      <h2 id="voice-heading" className="text-xl font-bold">{t('fromCoach')}</h2>
      {load.status === 'loading' ? <LoadingState variant="list" /> : load.status === 'error' ?
        <ErrorState message={t('loadFailed')} retryLabel={t('retry')} onRetry={() => { setLoad({ status: 'loading' }); void fetchNotes(); }} /> :
        load.notes.length === 0 ? <EmptyState icon={Mic} title={t('noNotesTitle')} body={t('noNotesBody')} action={{ label: t('sendCheckin'), href: '/player/progress' }} /> :
          <VoiceNoteList notes={load.notes} onPlay={played} />}
    </GlassCard>
  );
}
