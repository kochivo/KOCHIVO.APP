'use client';
import { useEffect, useState } from 'react';
import { fetchTaskStatus } from '../data/task-status';

export function useTaskStatus(today: string, playerId: string | undefined, retryKey: number) {
  const [result, setResult] = useState<{ today: string; value: Awaited<ReturnType<typeof fetchTaskStatus>> }>();
  useEffect(() => {
    if (!today) return;
    let active = true;
    const load = () => {
      void fetchTaskStatus(today).then(value => { if (active) setResult({ today, value }); })
        .catch(() => { if (active) setResult({ today, value: { status: 'error' } }); });
    };
    load();
    window.addEventListener('online', load);
    window.addEventListener('focus', load);
    return () => { active = false; window.removeEventListener('online', load); window.removeEventListener('focus', load); };
  }, [today, playerId, retryKey]);
  const value = result?.today === today ? result.value : undefined;
  return value?.status === 'ready' && value.playerId !== playerId ? undefined : value;
}
