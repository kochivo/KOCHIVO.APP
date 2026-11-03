'use client';

import { useCallback, useEffect, useState } from 'react';
import { localDb, mediaPending, startSync, supabaseTransport, useLiveQuery } from '@/core/offline';
import { supabaseBrowser } from '@/core/supabase/browser';

const readPending = () => mediaPending(localDb());

export function MediaStatus() {
  const [error, setError] = useState(false);
  const onError = useCallback(() => setError(true), []);
  const pending = useLiveQuery(readPending, onError);
  useEffect(() => {
    try { return startSync(localDb(), supabaseTransport(supabaseBrowser())); }
    catch { console.error('Background sync could not start'); }
  }, []);

  return <p role={error ? 'alert' : 'status'} className="text-xs text-muted">
    {error ? 'مش قادرين نقرأ الفيديوهات المحفوظة' : pending === undefined ? 'بنراجع الفيديوهات…' :
      pending > 0 ? `فيديو مستني يتبعت · ${pending}` : 'مفيش فيديوهات مستنية'}
  </p>;
}
