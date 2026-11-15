'use client';
import { useCallback, useState } from 'react';
import { useLiveQuery } from '@/core/offline';
import { sessionId } from '../ids';
import { readChoices, saveChoices } from '../data/exercise-choices';

export function usePainSkips(dayId: string, today: string, activeId?: string) {
  const key = `${dayId}:${activeId ?? today}`;
  const [draft, setDraft] = useState<{ key: string; ids: string[] } | null>(null);
  const read = useCallback(async () => {
    if (!dayId || !today) return { key, ids: [] };
    const id = activeId ?? await sessionId(dayId, today);
    try { return { key, ids: Object.keys(readChoices(window.localStorage, `pain-skips:${id}`)) }; }
    catch { return { key, ids: [] }; }
  }, [dayId, today, activeId, key]);
  const stored = useLiveQuery(read);
  const ids = draft?.key === key ? draft.ids : stored?.key === key ? stored.ids : [];
  return { ids, skip: async (rowId: string) => {
    const next = [...new Set([...ids, rowId])]; setDraft({ key, ids: next });
    const id = activeId ?? await sessionId(dayId, today);
    try { saveChoices(window.localStorage, `pain-skips:${id}`, Object.fromEntries(next.map(row => [row, 'skip']))); }
    catch { /* Keep the in-memory skip when storage is unavailable. */ }
  } };
}
