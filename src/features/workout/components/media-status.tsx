'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { useCallback, useState } from 'react';
import { localDb, mediaPending, useLiveQuery } from '@/core/offline';

const readPending = () => mediaPending(localDb());

export function MediaStatus() {
  const t = useT(messages);
  const locale = useLocale();
  const [error, setError] = useState(false);
  const onError = useCallback(() => setError(true), []);
  const pending = useLiveQuery(readPending, onError);
  return <p role={error ? 'alert' : 'status'} className="text-xs text-muted">
    {error ? t('couldntReadSavedVideos') : pending === undefined ? t('checkingVideos') :
      pending > 0 ? t('pendingVideos', { n: pending, count: formatNumber(pending, locale) }) : t('noVideosWaiting')}
  </p>;
}
