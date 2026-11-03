'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { localDb, pendingCount, useLiveQuery, type SetLogRow } from '@/core/offline';
import { useProgramSnapshot } from '@/features/player-home';
import { finishSession, logSet, startSession } from '../data/log-set';
import { lastPerformance } from '../data/last-performance';
import { buildQueue } from '../queue';
import { useRestTimer } from './use-rest-timer';

const readCached = () => localDb().program_snapshot.get('active');
const readPending = () => pendingCount(localDb());
const matches = (row: SetLogRow, exerciseId: string, index: number) =>
  row.program_exercise_id === exerciseId && row.set_index === index;

export function useFocusSession(dayId: string, today: string, playerId?: string) {
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ key: string; weight: number; reps: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const cooldown = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onError = useCallback(() => setError('مش قادرين نقرأ التمرين من الموبايل. جرّب تاني.'), []);
  const cached = useLiveQuery(readCached, onError, retryKey);
  const { snapshot, status, retry: refresh } = useProgramSnapshot(playerId ?? cached?.player_id, retryKey);
  const day = snapshot?.days.find((item) => item.id === dayId);
  const queue = useMemo(() => day ? buildQueue(day) : [], [day]);
  const rest = useRestTimer();
  const pending = useLiveQuery(readPending, onError, retryKey);
  const readSession = useCallback(async () => {
    if (!day || !today) return null;
    return await localDb().workout_sessions.where('training_date').equals(today)
      .filter((row) => row.program_day_id === day.id).first() ?? null;
  }, [day, today]);
  const session = useLiveQuery(readSession, onError, retryKey);
  // The session is created with the first logged set, so merely opening the workout never
  // counts as training for the captain's roster or locks today's day rotation.
  const readSets = useCallback(async () => session ?
    localDb().set_logs.where('session_id').equals(session.id).filter((row) => row.deleted_at === null).toArray() : [], [session]);
  const sets = useLiveQuery(readSets, onError, retryKey);
  const doneSets = sets?.filter((row) => row.session_id === session?.id) ?? [];
  const currentIndex = queue.findIndex((step) => !doneSets.some((row) => matches(row, step.exercise.id, step.setIndex)));
  const edited = doneSets.find((row) => row.id === editing);
  const current = edited ? queue.find((step) => matches(edited, step.exercise.id, step.setIndex)) : queue[currentIndex];
  const key = `${session?.id}:${current?.exercise.id}:${current?.setIndex}`;
  const exerciseId = String(current?.exercise.exercise_id ?? '');
  const historySessionId = session?.id ?? '';
  const readHistory = useCallback(async () => exerciseId ?
    { exerciseId, sessionId: historySessionId, value: await lastPerformance(localDb(), exerciseId, historySessionId) } : null,
  [exerciseId, historySessionId]);
  const history = useLiveQuery(readHistory, onError, retryKey);
  const performance = history?.exerciseId === exerciseId && history?.sessionId === historySessionId ? history?.value : null;
  const previous = doneSets.filter((row) => row.program_exercise_id === current?.exercise.id &&
    row.set_index < (current?.setIndex ?? 0)).sort((a, b) => b.set_index - a.set_index)[0];
  const prefill = edited ?? previous ?? performance;
  const weight = Math.min(500, Math.max(0, draft?.key === key ? draft.weight : prefill?.weight_kg ?? 0));
  const reps = Math.min(100, Math.max(0, draft?.key === key ? draft.reps : prefill?.reps ?? current?.exercise.reps_min ?? 0));
  const ready = Boolean(day && session !== undefined && sets && today && (!exerciseId ||
    (history?.exerciseId === exerciseId && history.sessionId === historySessionId)));
  useEffect(() => () => { clearTimeout(cooldown.current); }, []);
  // Recover a final set saved just before the tab closed, before completion was recorded.
  useEffect(() => {
    if (session && sets && queue.length > 0 && currentIndex === -1 && !session.completed_at) {
      void finishSession(localDb(), session.id, Date.now()).catch(() => setError('السِت محفوظ، بس إنهاء التمرين محتاج محاولة تانية.'));
    }
  }, [session, sets, queue.length, currentIndex, retryKey]);
  const complete = useCallback(async () => {
    if (!day || !current || !ready || saving.current || rest.remaining > 0) return;
    saving.current = true;
    setBusy(true);
    const tappedAt = Date.now();
    try {
      const active = session ?? await startSession(localDb(), day, today, tappedAt);
      await logSet(localDb(), { session_id: active.id, program_exercise_id: current.exercise.id,
        exercise_id: current.exercise.exercise_id, set_index: current.setIndex, weight_kg: weight, reps }, tappedAt);
      if (!edited) rest.start(current.restAfter);
      setEditing(null);
      setDraft(null);
    } catch { setError('مش قادرين نحفظ السِت على الموبايل. جرّب تاني.'); }
    finally {
      cooldown.current = setTimeout(() => { saving.current = false; setBusy(false); }, Math.max(0, 600 - (Date.now() - tappedAt)));
    }
  }, [day, today, session, current, ready, rest, edited, weight, reps]);
  return { day, queue, current, doneSets, performance, weight, reps, rest, pending,
    progress: edited ? queue.findIndex((step) => matches(edited, step.exercise.id, step.setIndex)) + 1 :
      currentIndex < 0 ? queue.length : currentIndex + 1,
    next: queue[(edited ? queue.findIndex((step) => matches(edited, step.exercise.id, step.setIndex)) : currentIndex) + 1],
    finished: Boolean(session?.completed_at) && currentIndex === -1,
    loading: !today || status === 'loading' || Boolean(day && (!session || !sets)),
    error: error ?? (status === 'error' && !snapshot ? 'مش قادرين نحمّل برنامجك دلوقتي' : null),
    disabled: busy || !ready,
    setWeight: (value: number) => setDraft({ key, weight: Math.min(500, Math.max(0, value)), reps }),
    setReps: (value: number) => setDraft({ key, weight, reps: Math.min(100, Math.max(0, value)) }),
    edit: (row: SetLogRow) => { if (!saving.current) { rest.skip(); setDraft(null); setEditing(row.id); } },
    complete,
    retry: () => { setError(null); setRetryKey((value) => value + 1); void refresh(); } };
}
