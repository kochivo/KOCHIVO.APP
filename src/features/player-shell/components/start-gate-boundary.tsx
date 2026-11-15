'use client';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useT } from '@/core/i18n/client';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { loadStartGate } from '../data/start-gate';
import { needsStartGate } from '../start-gate';
import { messages } from '../start/messages';
import { StartGateScreen } from './start-gate-screen';

export function StartGateBoundary({ children, captain }: { children?: ReactNode; captain: string }) {
  const t = useT(messages);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadStartGate>>>();
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    let revision = 0;
    const refresh = () => {
      const request = ++revision;
      loadStartGate().then(result => { if (live && request === revision) { setData(result); setFailed(false); } })
        .catch(() => { if (live && request === revision) setFailed(true); });
    };
    const visible = () => { if (!document.hidden) refresh(); };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => { live = false; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); };
  }, [attempt]);
  if (failed) return <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => { setFailed(false); setAttempt(value => value + 1); }} />;
  if (!data) return <LoadingState variant="cards" />;
  return needsStartGate(data.rows) ? <StartGateScreen data={data} captain={captain} /> : children;
}
