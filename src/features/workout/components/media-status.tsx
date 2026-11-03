'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { useCallback, useEffect, useState } from 'react';
import { localDb, mediaPending, startSync, supabaseTransport, useLiveQuery } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

const readPending = () => mediaPending(localDb());

export function MediaStatus() {
  const t = useT(messages);
  const locale = useLocale();
  const [error, setError] = useState(false);
  const onError = useCallback(() => setError(true), []);
  const pending = useLiveQuery(readPending, onError);
  useEffect(() => {
    let stopped = false;
    let stop: (() => void) | undefined;
    void loadSupabaseBrowser().then(client => {
      if (!stopped) stop = startSync(localDb(), supabaseTransport(client));
    }).catch(() => { console.error('Background sync could not start'); });
    return () => { stopped = true; stop?.(); };
  }, []);

  return <p role={error ? 'alert' : 'status'} className="text-xs text-muted">
    {error ? t('couldntReadSavedVideos') : pending === undefined ? t('checkingVideos') :
      pending > 0 ? t('pendingVideos', { n: pending, count: formatNumber(pending, locale) }) : t('noVideosWaiting')}
  </p>;
}
