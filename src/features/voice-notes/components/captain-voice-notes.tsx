'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { EmptyState, ErrorState, GlassCard, LoadingState } from '@/ui';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { listVoiceNotes } from '../data/voice-notes';
import type { VoiceNote } from '../types';
import { VoiceNoteList } from './voice-note-list';
import { VoiceRecorder } from './voice-recorder';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; notes: VoiceNote[] };

/** Recorder plus every note this captain sent the player. */
export function CaptainVoiceNotes({ playerId }: { playerId: string }) {
  const t = useT(messages);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const fetchNotes = useCallback(async () => {
    try { setLoad({ status: 'ready', notes: await listVoiceNotes(await loadSupabaseBrowser(), playerId) }); } catch (error) {
      console.warn('Loading voice notes failed', error);
      setLoad({ status: 'error' });
    }
  }, [playerId]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void fetchNotes(); });
    return () => { active = false; };
  }, [fetchNotes]);
  const sent = (note: VoiceNote) => setLoad((current) => ({ status: 'ready', notes: [note, ...(current.status === 'ready' ? current.notes : [])] }));
  return (
    <GlassCard role="region" aria-labelledby="captain-voice-heading" className="space-y-4 p-5">
      <h2 id="captain-voice-heading" className="text-lg font-bold">{t('voiceNotes')}</h2>
      <div id={`voice-recorder-${playerId}`} tabIndex={-1}><VoiceRecorder playerId={playerId} onSent={sent} /></div>
      {load.status === 'loading' ? <LoadingState variant="list" /> : load.status === 'error' ?
        <ErrorState message={t('loadFailed')} retryLabel={t('retry')} onRetry={() => { setLoad({ status: 'loading' }); void fetchNotes(); }} /> :
        load.notes.length > 0 ? <VoiceNoteList notes={load.notes} /> :
          <EmptyState icon={Mic} title={t('noNotesTitle')} body={t('captainEmptyBody')} action={{ label: t('record'), href: `#voice-recorder-${playerId}` }} />}
    </GlassCard>
  );
}
