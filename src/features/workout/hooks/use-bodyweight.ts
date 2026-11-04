'use client';
import { useCallback, useState } from 'react';
import { useLiveQuery } from '@/core/offline';

export function useBodyweight(exerciseId: string) {
  const [draft, setDraft] = useState<{ id: string; value: boolean } | null>(null);
  const read = useCallback(() => {
    try { return { id: exerciseId, value: typeof window !== 'undefined' && window.localStorage.getItem(`bodyweight:${exerciseId}`) === 'true' }; }
    catch { return { id: exerciseId, value: false }; }
  }, [exerciseId]);
  const stored = useLiveQuery(read);
  const value = draft?.id === exerciseId ? draft.value : stored?.id === exerciseId && stored.value;
  return { bodyweight: Boolean(value), setBodyweight: (value: boolean) => {
    setDraft({ id: exerciseId, value });
    try { window.localStorage.setItem(`bodyweight:${exerciseId}`, String(value)); }
    catch { /* The exercise remains usable when browser storage is unavailable. */ }
  } };
}
