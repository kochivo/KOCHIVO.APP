'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { localDb, parkedCount, retryParked, pendingCount, useLiveQuery, weeklyFinished, type SetLogRow } from '@/core/offline';
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
import { triggerHaptic } from '@/lib/haptics';
import { dropWeights, targetForSet } from '@/lib/set-plan';
import { alternativeStep, loggedStep } from '../data/exercise-choices';
import { useExerciseChoices } from './use-exercise-choices';
import { usePainSkips } from './use-pain-skips';
import { painAffects, painLoad, safePainSwap } from '../pain-safe-swap';
import { useCycle, isLightDay } from '@/features/player-home';

const readCached = () => localDb().program_snapshot.get('active');
const readPending = () => pendingCount(localDb());
const readParked = () => parkedCount(localDb());
const matches = (row: SetLogRow, exerciseId: string, index: number, dropIndex = 0) =>
  row.program_exercise_id === exerciseId && row.set_index === index && (row.drop_index ?? 0) === dropIndex;

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
  const cycle = useCycle(playerId ?? cached?.player_id).data;
  const cycleLight = Boolean(cycle?.female && isLightDay(cycle.settings.enabled, cycle.starts, today, cycle.settings.light_days, cycle.overrides));
  const day = useMemo(() => decision === 'reduce' && originalDay ? { ...originalDay,
    exercises: originalDay.exercises.map(exercise => ({ ...exercise, sets: reducedSets(exercise.sets) })) } : originalDay, [decision, originalDay]);
  const plannedQueue = useMemo(() => day ? buildQueue(day) : [], [day]);
  const rest = useRestTimer();
  const pending = useLiveQuery(readPending, onError, retryKey);
  const retrySync = () => { void retryParked(localDb()).catch(onError); };
  const sessionDayId = day?.id;
  const readSession = useCallback(async () => {
    if (!sessionDayId || !today) return null;
    const sessions = await localDb().workout_sessions.where('training_date').belowOrEqual(today).reverse()
      .filter((row) => row.program_day_id === sessionDayId).limit(2).toArray();
    // A logged, unfinished workout survives midnight (including a reload), unless today's already started.
    const candidate = sessions.find((row) => row.training_date !== today);
    if (candidate && !sessions.some((row) => row.training_date === today)) {
      const logged = await localDb().set_logs.where('session_id').equals(candidate.id)
        .filter((row) => row.deleted_at === null).first();
      if (trainingDate(today, candidate, Boolean(logged)) === candidate.training_date) return candidate;
    }
    return sessions.find((row) => row.training_date === today) ?? null;
  }, [sessionDayId, today]);
  const session = useLiveQuery(readSession, onError, retryKey);
  // The session is created with the first logged set, so merely opening the workout never
  // counts as training for the captain's roster or locks today's day rotation.
  const sessionId = session?.id;
  const readPain = useCallback(async () => sessionId ? localDb().pain_reports.where('session_id').equals(sessionId).toArray() : [], [sessionId]);
  const reports = useLiveQuery(readPain, onError, retryKey);
  const painSkips = usePainSkips(dayId, today, sessionId);
  const queue = useMemo(() => plannedQueue.filter(step => !painSkips.ids.includes(step.exercise.id)), [plannedQueue, painSkips.ids]);
  const readSets = useCallback(async () => sessionId ?
    localDb().set_logs.where('session_id').equals(sessionId).filter((row) => row.deleted_at === null).toArray() : [], [sessionId]);
  const sets = useLiveQuery(readSets, onError, retryKey);
  const doneSets = sets?.filter((row) => row.session_id === session?.id) ?? [];
  const hasAlternatives = Boolean(day?.exercises.some(row => row.alternatives?.length));
  const choices = useExerciseChoices(hasAlternatives ? dayId : '', today, sessionId, onError, retryKey);
  const currentIndex = queue.findIndex((step) => !doneSets.some((row) => matches(row, step.exercise.id, step.setIndex, step.dropIndex)));
  const edited = doneSets.find((row) => row.id === editing);
  const plannedCurrent = edited ? queue.find((step) => matches(edited, step.exercise.id, step.setIndex, step.dropIndex)) : queue[currentIndex];
  const logged = edited ?? (plannedCurrent?.dropIndex ? doneSets.find(row => matches(row, plannedCurrent.exercise.id, plannedCurrent.setIndex)) : undefined);
  const selectedId = choices.choices[plannedCurrent?.exercise.id ?? ''];
  const current = logged ? loggedStep(plannedCurrent, logged.exercise_id, t('unknownExercise')) : alternativeStep(plannedCurrent, selectedId);
  const exercisePain = reports?.filter(row => row.program_exercise_id === current?.exercise.id) ?? [];
  const painMetadata = current?.exercise.alternative_exercises?.find(row => row.id === current.exercise.exercise_id) ?? current?.exercise;
  const painBlocked = exercisePain.some(report => (!selectedId || selectedId === report.exercise_id) &&
    (report.severity === 5 || report.kind === 'sharp' || painAffects(report.area, painMetadata ?? {})));
  const key = `${session?.id ?? today}:${current?.exercise.id}:${current?.setIndex}:${current?.dropIndex ?? 0}:${current?.exercise.exercise_id}`;
  const exerciseId = String(current?.exercise.exercise_id ?? '');
  const { bodyweight, setBodyweight } = useBodyweight(exerciseId);
  const historySessionId = session?.id ?? '';
  const hint = current?.exercise.pain_hint;
  const painSince = hint && hint.until >= today ? hint.since : undefined;
  const memory = useLastSession(playerId ?? cached?.player_id, exerciseId, historySessionId, onError, retryKey, painSince);
  const performance = performanceFor(memory.last, current?.setIndex ?? 0);
  const previous = doneSets.filter((row) => row.program_exercise_id === current?.exercise.id &&
    row.exercise_id === exerciseId && (row.drop_index ?? 0) === 0 &&
    row.set_index < (current?.setIndex ?? 0)).sort((a, b) => b.set_index - a.set_index)[0];
  // Last time's same set beats today's previous set: that is the number to match or beat.
  const prefill = edited ?? performance ?? previous ?? memory.last?.sets.at(-1);
  const dropIndex = current?.dropIndex ?? 0;
  const drop = current && targetForSet(current.exercise, current.setIndex - 1).drop;
  const preceding = current && doneSets.find(row => matches(row, current.exercise.id, current.setIndex, dropIndex - 1));
  const dropWeight = drop && dropIndex > 0 ? dropWeights(preceding?.weight_kg ?? 0, 1, drop.percent)[0] : undefined;
  const adjusted = prefill && (('pain_adjusted' in prefill && prefill.pain_adjusted === true) ||
    ('completed_at' in prefill && typeof prefill.completed_at === 'string' && (!painSince || prefill.completed_at >= painSince)));
  const suggestedWeight = painLoad(prefill?.weight_kg ?? 0, adjusted ? undefined : hint, today);
  const weight = bodyweight ? 0 : Math.min(500, Math.max(0, draft?.key === key ? draft.weight : edited?.weight_kg ?? dropWeight ?? suggestedWeight * (cycleLight && prefill !== previous ? 0.85 : 1)));
  const plannedReps = current?.exercise.set_plan ? targetForSet(current.exercise, current.setIndex - 1).reps_min : undefined;
  const reps = Math.min(100, Math.max(0, draft?.key === key ? draft.reps : edited?.reps ?? (dropIndex > 0 ? drop?.reps ?? 0 : undefined) ?? performance?.reps ?? plannedReps ?? prefill?.reps ??
    (current ? targetForSet(current.exercise, current.setIndex - 1).reps_min : 0)));
  const ready = Boolean(day && session !== undefined && sets && today && memory.ready && (!hasAlternatives || choices.ready));
  useEffect(() => () => { clearTimeout(cooldown.current); }, []);
  // Recover a final set saved just before the tab closed, before completion was recorded.
  useEffect(() => {
    if (session && sets && plannedQueue.length > 0 && currentIndex === -1 && !session.completed_at) {
      void finishSession(localDb(), session.id, Date.now()).then(() => triggerHaptic('success'))
        .catch(() => setError(t('setSavedTryAgainToFinishThe')));
    }
  }, [session, sets, plannedQueue.length, currentIndex, retryKey, t]);
  const complete = useCallback(async () => {
    if (!day || !current || !ready || saving.current || rest.remaining > 0 || painBlocked) return;
    const result = validateSet({ weight, reps, bodyweight });
    if (result !== 'ok') {
      triggerHaptic('heavy');
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
        exercise_id: current.exercise.exercise_id, set_index: current.setIndex, drop_index: dropIndex, weight_kg: weight, reps }, tappedAt);
      triggerHaptic('light');
      if (!edited && dropIndex === 0) {
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
  }, [day, today, session, current, ready, rest, edited, weight, reps, bodyweight, key, t, dropIndex, painBlocked]);
  const parked = useLiveQuery(readParked, onError, retryKey);
  return { day, session, decision, programFinished, queue, current, doneSets, performance, lastSession: memory.last, weight, reps, rest, pending, parked, retrySync, pr, dismissPr,
    bodyweight, setBodyweight, invalid: invalid?.key === key ? invalid : null,
    progress: edited ? queue.findIndex((step) => matches(edited, step.exercise.id, step.setIndex, step.dropIndex)) + 1 :
      currentIndex < 0 ? queue.length : currentIndex + 1,
    next: queue[(edited ? queue.findIndex((step) => matches(edited, step.exercise.id, step.setIndex, step.dropIndex)) : currentIndex) + 1],
    finished: Boolean(session?.completed_at) && currentIndex === -1,
    loading: !today || status === 'loading' || Boolean(day && (session === undefined || sets === undefined || (hasAlternatives && !choices.ready))),
    error: error ?? (status === 'error' && !snapshot ? t('couldntLoadYourProgram') : null),
    disabled: busy || !ready,
    setWeight: (value: number) => setDraft({ key, weight: Math.min(500, Math.max(0, value)), reps }),
    setReps: (value: number) => setDraft({ key, weight, reps: Math.min(100, Math.max(0, value)) }),
    edit: (row: SetLogRow) => { if (!saving.current) { rest.skip(); setDraft(null); setEditing(row.id); } },
    complete, today, captainId: snapshot?.captain_id, skipExercise: painSkips.skip, painBlocked, painReports: exercisePain,
    switchExercise: (id: string) => {
      if (!plannedCurrent || dropIndex > 0 || saving.current || !choices.ready || edited || (id && !plannedCurrent.exercise.alternatives?.includes(id))) return;
      if (exercisePain.some(report => !safePainSwap(report.area, plannedCurrent.exercise.alternative_exercises?.filter(row => row.id === id && row.id !== report.exercise_id) ?? [], plannedCurrent.exercise.pattern))) return;
      choices.choose(plannedCurrent.exercise.id, id); setDraft(null); setInvalid(null);
    },
    retry: () => { setError(null); setRetryKey((value) => value + 1); void refresh(); } };
}
