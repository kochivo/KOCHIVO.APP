'use client';

import type { ComponentProps } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { useTimezone } from '@/core/timezone/client';
import { localDate } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { workoutTarget } from '../workout-target';
import { PlayerTabsView } from './player-tabs-view';

const readSnapshot = () => localDb().program_snapshot.get('active');
const readSessions = () => localDb().workout_sessions.toArray();

export function PlayerTabs({ rest, ...props }: Omit<ComponentProps<typeof PlayerTabsView>, 'workout'> & { rest: boolean }) {
  const timezone = useTimezone();
  const { now } = useCalendarClock();
  const snapshot = useLiveQuery(readSnapshot);
  const sessions = useLiveQuery(readSessions);
  return <PlayerTabsView {...props} workout={workoutTarget(snapshot, sessions, now ? localDate(now, timezone) : '', rest)} />;
}
