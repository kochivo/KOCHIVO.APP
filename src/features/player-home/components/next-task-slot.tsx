'use client';
import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { useMealLogs, useNutritionSnapshot } from '@/features/nutrition';
import { useT } from '@/core/i18n/client';
import { saturdayWeek } from '@/lib/dates';
import { ErrorState, LoadingState } from '@/ui';
import { useTaskStatus } from '../hooks/use-task-status';
import { playerNextTask } from '../next-task';
import { messages } from '../messages';
import { NextTaskCard } from './next-task-card';

export function NextTaskSlot({ snapshot, sessions, today, playerId, retryKey, onRetry }: {
  snapshot: ProgramSnapshot | null; sessions: WorkoutSessionRow[]; today: string;
  playerId?: string; retryKey: number; onRetry: () => void;
}) {
  const t = useT(messages);
  const status = useTaskStatus(today, playerId, retryKey);
  const nutrition = useNutritionSnapshot();
  const logs = useMealLogs(today, nutrition.onError, nutrition.retryKey);
  if (nutrition.status === 'error') return <ErrorState message={t('taskLoadFailed')}
    retryLabel={t('tryAgain')} onRetry={() => { onRetry(); nutrition.retry(); }} />;
  if (!status || nutrition.status === 'loading' || !logs) return <LoadingState />;
  // Offline at the gym the server read fails; skip the server-only rules so the workout and meal tasks still show.
  const remote = status.status === 'ready' ? status
    : { intakeDone: true, checkInWeeks: [saturdayWeek(today)[0] ?? today], voiceNotes: [] };
  return <NextTaskCard task={playerNextTask({ today, snapshot, sessions, intakeDone: remote.intakeDone,
    meals: nutrition.snapshot?.meals ?? [], mealLogs: logs, checkInWeeks: remote.checkInWeeks, voiceNotes: remote.voiceNotes })} />;
}
