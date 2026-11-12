'use client';
import { useCallback, useState } from 'react';
import { useLiveQuery } from '@/core/offline';
import { sessionId } from '../ids';
import { readChoices, saveChoices, type ExerciseChoices } from '../data/exercise-choices';

type LocalChoices = { key: string; id: string; choices: ExerciseChoices };
export function useExerciseChoices(dayId: string, today: string, activeId?: string, onError?: (error: unknown) => void, retryKey = 0) {
  const key = `${dayId}:${activeId ?? today}`;
  const [draft, setDraft] = useState<LocalChoices | null>(null);
  const read = useCallback(async () => {
    if (!dayId || !today) return null;
    const id = activeId ?? await sessionId(dayId, today);
    let choices: ExerciseChoices = {};
    try { choices = readChoices(window.localStorage, id); }
    catch { /* Accessing localStorage itself can throw. */ }
    return { key, id, choices };
  }, [dayId, today, activeId, key]);
  const stored = useLiveQuery(read, onError, retryKey);
  const current = draft?.key === key || (activeId && draft?.id === activeId) ? draft : stored?.key === key ? stored : null;
  return { choices: current?.choices ?? {}, ready: Boolean(current),
    choose: (rowId: string, exerciseId: string) => {
      if (!current) return;
      const choices = { ...current.choices, [rowId]: exerciseId };
      setDraft({ ...current, choices });
      try { saveChoices(window.localStorage, current.id, choices); }
      catch { /* Retain optimistic state when the browser disallows storage. */ }
    } };
}
