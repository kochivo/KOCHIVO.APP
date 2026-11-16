'use client';
import { Button } from '@/ui/button';
import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { localDb, useLiveQuery } from '@/core/offline';
import { isRestDay } from '@/features/player-home';
import { messages } from '../v6-messages';
import { useTodayDecision } from '@/features/readiness';
import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { localDate } from '@/lib/dates';

export function shoppingWeekRestDays(snapshot: ProgramSnapshot | null, sessions: WorkoutSessionRow[], today: string): boolean[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return snapshot ? isRestDay(snapshot, sessions, localDate(date, 'UTC')) : false;
  });
}

export function DayType({ today, playerId, onRestChange }: { today: string; playerId?: string; onRestChange?: (rest: boolean | null | undefined) => void }) {
  const t = useT(messages);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const onError = useCallback(() => setFailed(true), []);
  const query = useCallback(async () => {
    const db = localDb();
    const [snapshot, sessions] = await Promise.all([db.program_snapshot.get('active'), db.workout_sessions.where('training_date').equals(today).toArray()]);
    return snapshot && today ? isRestDay(snapshot, sessions, today) : null;
  }, [today]);
  const rest = useLiveQuery(query, onError, revision);
  const decision = useTodayDecision(playerId, today);
  useEffect(() => { onRestChange?.(failed || rest === undefined ? undefined : decision === 'rest' || rest === true ? true : rest); }, [decision, rest, failed, onRestChange]);
  if (failed) return <Button variant="secondary" type="button" onClick={() => { setFailed(false); setRevision(value => value + 1); }} className="min-h-12 text-xs text-muted">{t('dayTypeRetry')}</Button>;
  if (rest === undefined) return <span aria-hidden className="block h-4 w-24 animate-pulse rounded-full bg-line motion-reduce:animate-none" />;
  return rest === null && decision !== 'rest' ? null : <p className="text-xs text-faint">{t(rest || decision === 'rest' ? 'restDay' : 'trainingDay')}</p>;
}
