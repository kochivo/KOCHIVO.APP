'use client';

import { useEffect } from 'react';
import { localDb, startSync, supabaseTransport } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

// Mounted once by the shell so meals, supplements and daily checks sync on every player page, not only in a workout.
export function SyncRunner() {
  useEffect(() => {
    let stopped = false;
    let stop: (() => void) | undefined;
    void loadSupabaseBrowser().then(client => {
      const db = localDb();
      if (!stopped && db.userId) stop = startSync(db, supabaseTransport(client, db.userId));
    }).catch(() => { console.error('Background sync could not start'); });
    return () => { stopped = true; stop?.(); };
  }, []);
  return null;
}
