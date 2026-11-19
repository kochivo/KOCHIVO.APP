'use client';
import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { filterMeals, useMealLogs, useNutritionSnapshot } from '@/features/nutrition';
import { useT } from '@/core/i18n/client';
import { saturdayWeek } from '@/lib/dates';
import { ErrorState, LoadingState } from '@/ui';
import { useTaskStatus } from '../hooks/use-task-status';
import { playerNextTask } from '../next-task';
import { messages } from '../messages';
import { NextTaskCard } from './next-task-card';
import { pickTodayDay } from '../next-day';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import Link from 'next/link';
import { buttonClass } from '@/ui/button';

export function NextTaskSlot({ snapshot, sessions, today, playerId, retryKey, onRetry, rest, nutritionRest = rest, workoutInHero }: {
  snapshot: ProgramSnapshot | null; sessions: WorkoutSessionRow[]; today: string;
  playerId?: string; retryKey: number; onRetry: () => void; rest?: boolean; nutritionRest?: boolean; workoutInHero?: boolean;
}) {
  const t = useT(messages);
  const status = useTaskStatus(today, playerId, retryKey);
  const nutrition = useNutritionSnapshot();
  const logs = useMealLogs(today, nutrition.onError, nutrition.retryKey);
  if (nutrition.status === 'error') return <ErrorState message={t('taskLoadFailed')}
    retryLabel={t('tryAgain')} onRetry={() => { onRetry(); nutrition.retry(); }} />;
  if (!status || nutrition.status === 'loading' || !logs) return <LoadingState variant="detail" />;
  // Offline at the gym the server read fails; skip the server-only rules so the workout and meal tasks still show.
  const remote = status.status === 'ready' ? status
    : { intakeDone: true, checkInWeeks: [saturdayWeek(today)[0] ?? today], voiceNotes: [] };
  const task = playerNextTask({ today, snapshot, sessions, rest, intakeDone: remote.intakeDone,
    meals: filterMeals(nutrition.snapshot?.meals ?? [], nutritionRest ?? false), mealLogs: logs,
    checkInWeeks: remote.checkInWeeks, voiceNotes: remote.voiceNotes });
  return <>{!(workoutInHero && (task.kind === 'start' || task.kind === 'continue')) &&
    <NextTaskCard task={task} day={snapshot ? pickTodayDay(snapshot, sessions, today) : undefined} />}
    {captainWorkspaceEnabled() && task.kind !== 'voice' && remote.voiceNotes.some(note => !note.listenedAt) &&
      <Link href="/player/captain" className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center px-page-x py-stack text-sm" })}>{t('task.voice')}</Link>}
  </>;
}
