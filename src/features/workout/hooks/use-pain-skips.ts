'use client';
import { useCallback, useRef, useState } from 'react';
import { useLiveQuery } from '@/core/offline';
import { sessionId } from '../ids';
import { readChoices } from '../data/exercise-choices';
import { savePainSkips } from '../pain-stop';

export function usePainSkips(dayId: string, today: string, activeId?: string) {
  const key = `${dayId}:${activeId ?? today}`;
  const [draft, setDraft] = useState<{ key: string; ids: string[] } | null>(null);
  const latest = useRef(draft);
  const read = useCallback(async () => {
    if (!dayId || !today) return { key, ids: [] };
    const id = activeId ?? await sessionId(dayId, today);
    try { return { key, ids: Object.keys(readChoices(window.localStorage, `pain-skips:${id}`)) }; }
    catch { return { key, ids: [] }; }
  }, [dayId, today, activeId, key]);
  const stored = useLiveQuery(read);
  const ids = draft?.key === key ? draft.ids : stored?.key === key ? stored.ids : [];
  const skipMany = async (rowIds: readonly string[]) => {
    const previous = latest.current?.key === key ? latest.current.ids : ids;
    const next = [...new Set([...previous, ...rowIds])];
    latest.current = { key, ids: next }; setDraft(latest.current);
    const id = activeId ?? await sessionId(dayId, today);
    try { savePainSkips(window.localStorage, id, [], latest.current?.key === key ? latest.current.ids : next); }
    catch { /* Keep the in-memory skip when storage is unavailable. */ }
  };
  return { ids, skipMany, skip: (rowId: string) => skipMany([rowId]) };
}
