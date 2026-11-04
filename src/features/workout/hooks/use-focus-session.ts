'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { localDb, pendingCount, useLiveQuery, weeklyFinished, type SetLogRow } from '@/core/offline';
import { useProgramSnapshot } from '@/features/player-home';
import { finishSession, logSet, startSession } from '../data/log-set';
import { performanceFor } from '../data/last-performance';
import { prHistory } from '../data/pr-history';
import { detectPr, type Pr } from '../pr';
import { setId } from '../ids';
import { buildQueue } from '../queue';
import { trainingDate } from '../training-date';
import { useLastSession } from './use-last-session';
import { useRestTimer } from './use-rest-timer';
import { useBodyweight } from './use-bodyweight';
import { validateSet } from '../set-validation';
import { reducedSets, useTodayDecision } from '@/features/readiness';

const readCached = () => localDb().program_snapshot.get('active');
const readPending = () => pendingCount(localDb());
const matches = (row: SetLogRow, exerciseId: string, index: number) =>
  row.program_exercise_id === exerciseId && row.set_index === index;

export function useFocusSession(dayId: string, today: string, playerId?: string) {
  const t = useT(messages);
  const [pr, setPr] = useState<(Pr & { id: string; current: { weight_kg: number; reps: number } }) | null>(null);
  const dismissPr = useCallback(() => setPr(null), []);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ key: string; weight: number; reps: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState<{ key: string; result: ReturnType<typeof validateSet>; attempt: number } | null>(null);
  const saving = useRef(false);
  const cooldown = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onError = useCallback(() => setError(t('couldntReadTheWorkoutOnYourPhone')), [t]);
  const cached = useLiveQuery(readCached, onError, retryKey);
  const { snapshot, status, retry: refresh } = useProgramSnapshot(playerId ?? cached?.player_id, retryKey);
  const programFinished = Boolean(snapshot && today && weeklyFinished(snapshot, today));
  const decision = useTodayDecision(playerId ?? cached?.player_id, today);
  const originalDay = programFinished ? undefined : snapshot?.days.find((item) => item.id === dayId && !item.is_rest_day);
  const day = useMemo(() => decision === 'reduce' && originalDay ? { ...originalDay,
    exercises: originalDay.exercises.map(exercise => ({ ...exercise, sets: reducedSets(exercise.sets) })) } : originalDay, [decision, originalDay]);
  const queue = useMemo(() => day ? buildQueue(day) : [], [day]);
  const rest = useRestTimer();
  const pending = useLiveQuery(readPending, onError, retryKey);
  const readSession = useCallback(async () => {
    if (!day || !today) return null;
    const sessions = await localDb().workout_sessions.where('training_date').belowOrEqual(today).reverse()
      .filter((row) => row.program_day_id === day.id).limit(2).toArray();
    // A logged, unfinished workout survives midnight (including a reload), unless today's already started.
    const candidate = sessions.find((row) => row.training_date !== today);
    if (candidate && !sessions.some((row) => row.training_date === today)) {
      const logged = await localDb().set_logs.where('session_id').equals(candidate.id)
        .filter((row) => row.deleted_at === null).first();
      if (trainingDate(today, candidate, Boolean(logged)) === candidate.training_date) return candidate;
    }
    return sessions.find((row) => row.training_date === today) ?? null;
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
  const { bodyweight, setBodyweight } = useBodyweight(exerciseId);
  const historySessionId = session?.id ?? '';
  const memory = useLastSession(playerId ?? cached?.player_id, exerciseId, historySessionId, onError, retryKey);
  const performance = performanceFor(memory.last, current?.setIndex ?? 0);
  const previous = doneSets.filter((row) => row.program_exercise_id === current?.exercise.id &&
    row.set_index < (current?.setIndex ?? 0)).sort((a, b) => b.set_index - a.set_index)[0];
  // Last time's same set beats today's previous set: that is the number to match or beat.
  const prefill = edited ?? performance ?? previous ?? memory.last?.sets.at(-1);
  const weight = bodyweight ? 0 : Math.min(500, Math.max(0, draft?.key === key ? draft.weight : prefill?.weight_kg ?? 0));
  const reps = Math.min(100, Math.max(0, draft?.key === key ? draft.reps : prefill?.reps ?? current?.exercise.reps_min ?? 0));
  const ready = Boolean(day && session !== undefined && sets && today && memory.ready);
  useEffect(() => () => { clearTimeout(cooldown.current); }, []);
  // Recover a final set saved just before the tab closed, before completion was recorded.
  useEffect(() => {
    if (session && sets && queue.length > 0 && currentIndex === -1 && !session.completed_at) {
      void finishSession(localDb(), session.id, Date.now()).catch(() => setError(t('setSavedTryAgainToFinishThe')));
    }
  }, [session, sets, queue.length, currentIndex, retryKey, t]);
  const complete = useCallback(async () => {
    if (!day || !current || !ready || saving.current || rest.remaining > 0) return;
    const result = validateSet({ weight, reps, bodyweight });
    if (result !== 'ok') {
      setInvalid(previous => ({ key, result, attempt: (previous?.attempt ?? 0) + 1 }));
      return;
    }
    setInvalid(null);
    saving.current = true;
    setBusy(true);
    const tappedAt = Date.now();
    try {
      const active = session ?? await startSession(localDb(), day, today, tappedAt);
      await logSet(localDb(), { session_id: active.id, program_exercise_id: current.exercise.id,
        exercise_id: current.exercise.exercise_id, set_index: current.setIndex, weight_kg: weight, reps }, tappedAt);
      if (!edited) {
        // Celebration is best-effort and never holds the next set behind a history read.
        void (async () => {
          const id = await setId(active.id, current.exercise.id, current.setIndex);
          const history = await prHistory(localDb(), current.exercise.exercise_id, id);
          const result = detectPr(history, { weight_kg: weight, reps });
          if (result) setPr({ ...result, id, current: { weight_kg: weight, reps } });
        })().catch(() => undefined);
      }
      if (!edited) rest.start(current.restAfter);
      setEditing(null);
      setDraft(null);
    } catch { setError(t('couldntSaveTheSetOnYourPhone')); }
    finally {
      cooldown.current = setTimeout(() => { saving.current = false; setBusy(false); }, Math.max(0, 600 - (Date.now() - tappedAt)));
    }
  }, [day, today, session, current, ready, rest, edited, weight, reps, bodyweight, key, t]);
  return { day, session, decision, programFinished, queue, current, doneSets, performance, lastSession: memory.last, weight, reps, rest, pending, pr, dismissPr,
    bodyweight, setBodyweight, invalid: invalid?.key === key ? invalid : null,
    progress: edited ? queue.findIndex((step) => matches(edited, step.exercise.id, step.setIndex)) + 1 :
      currentIndex < 0 ? queue.length : currentIndex + 1,
    next: queue[(edited ? queue.findIndex((step) => matches(edited, step.exercise.id, step.setIndex)) : currentIndex) + 1],
    finished: Boolean(session?.completed_at) && currentIndex === -1,
    loading: !today || status === 'loading' || Boolean(day && (session === undefined || sets === undefined)),
    error: error ?? (status === 'error' && !snapshot ? t('couldntLoadYourProgram') : null),
    disabled: busy || !ready,
    setWeight: (value: number) => setDraft({ key, weight: Math.min(500, Math.max(0, value)), reps }),
    setReps: (value: number) => setDraft({ key, weight, reps: Math.min(100, Math.max(0, value)) }),
    edit: (row: SetLogRow) => { if (!saving.current) { rest.skip(); setDraft(null); setEditing(row.id); } },
    complete,
    retry: () => { setError(null); setRetryKey((value) => value + 1); void refresh(); } };
}
