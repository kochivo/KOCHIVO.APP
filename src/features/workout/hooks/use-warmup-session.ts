'use client';
import { useCallback, useState } from 'react';
import { useLiveQuery } from '@/core/offline';
import type { DayWarmup } from '@/features/programs';
import { sessionId } from '../ids';
import { readWarmupProgress, saveWarmupProgress, warmupPending, type WarmupProgress } from '../data/warmup-progress';

type LocalProgress = { key: string; id: string; progress: WarmupProgress; failed?: boolean };

export function useWarmupSession(dayId: string, today: string, activeId: string | undefined, warmup: DayWarmup) {
  const key = `${dayId}:${activeId ?? today}`;
  const [draft, setDraft] = useState<LocalProgress | null>(null);
  const read = useCallback(async () => {
    if (!dayId || !today) return null;
    let id: string;
    try { id = activeId ?? await sessionId(dayId, today); }
    catch { return { key, id: '', progress: { checked: [], skipped: false }, failed: true }; }
    let progress: WarmupProgress = { checked: [], skipped: false };
    try { progress = readWarmupProgress(window.localStorage, id); }
    catch { /* Accessing localStorage itself can throw in private or restricted browsers. */ }
    return { key, id, progress };
  }, [dayId, today, activeId, key]);
  const stored = useLiveQuery(read);
  // The first set creates the same stable session; retain optimistic progress even if storage is blocked.
  const current = draft?.key === key || (activeId && draft?.id === activeId) ? draft : stored?.key === key ? stored : null;
  const progress = current?.progress ?? { checked: [], skipped: false };
  const update = (next: WarmupProgress) => {
    if (!current || current.failed) return;
    setDraft({ ...current, progress: next });
    try { saveWarmupProgress(window.localStorage, current.id, next); }
    catch { /* The in-memory state still lets the player continue without browser storage. */ }
  };
  return { ...progress, loading: !current, error: Boolean(current?.failed), pending: warmupPending(warmup, progress),
    toggle: (id: string) => update({ ...progress, checked: progress.checked.includes(id)
      ? progress.checked.filter(item => item !== id) : [...progress.checked, id] }),
    skip: () => update({ ...progress, skipped: true }) };
}
