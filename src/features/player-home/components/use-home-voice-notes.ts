'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { VoiceNote } from '@/features/voice-notes';

type Load = { playerId?: string; status: 'loading' | 'error' | 'ready'; notes: VoiceNote[] };

export function useHomeVoiceNotes(playerId?: string) {
  const [revision, setRevision] = useState(0);
  const [load, setLoad] = useState<Load>({ status: 'loading', notes: [] });
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    let generation = 0;
    const refresh = async () => {
      const request = ++generation;
      try {
        // Loaded on demand so the voice-notes barrel stays out of the home first load.
        const notes = playerId ? await (await import('@/features/voice-notes')).listVoiceNotes(await loadSupabaseBrowser(), playerId) : [];
        if (active && request === generation) setLoad({ playerId, status: 'ready', notes });
      } catch {
        if (active && request === generation) setLoad({ playerId, status: 'error', notes: [] });
      }
    };
    void refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [playerId, revision]);
  return { ...(load.playerId === playerId ? load : { status: 'loading' as const, notes: [] }), retry };
}
