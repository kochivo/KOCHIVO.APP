'use client';
import { useTimezone } from '@/core/timezone/client';

import { useCallback, useEffect } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { useTodayDecision } from '@/core/offline/use-today-decision';
import { localDate } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { isRestDay } from '../rest-day';
import { refreshSnapshot } from '../data/refresh-snapshot';

const readSnapshot = () => localDb().program_snapshot.get('active');
const readSessions = () => localDb().workout_sessions.toArray();

export function useRestMood(enabled = true) {
  const timezone = useTimezone();
  const { now } = useCalendarClock();
  const snapshot = useLiveQuery(readSnapshot);
  const sessions = useLiveQuery(readSessions);
  const today = now ? localDate(now, timezone) : '';
  const decision = useTodayDecision(enabled ? snapshot?.player_id : undefined, today);
  const rest = enabled && (decision === 'rest' || Boolean(snapshot && sessions && today && isRestDay(snapshot, sessions, today)));
  useEffect(() => {
    if (!enabled) return;
    // A direct visit to nutrition or progress also needs a program before home has cached it.
    const refresh = () => { void refreshSnapshot(); };
    refresh();
    window.addEventListener('online', refresh);
    return () => window.removeEventListener('online', refresh);
  }, [enabled]);
  const setTheme = useCallback(() => {
    if (!rest) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.content;
    // The lazy sync reports to its parent first; wait for the shell's mood attribute.
    const frame = requestAnimationFrame(() => {
      const root = document.querySelector<HTMLElement>('[data-mood="rest"]');
      if (meta && root) meta.content = getComputedStyle(root).getPropertyValue('--color-bg').trim();
    });
    return () => {
      cancelAnimationFrame(frame);
      if (meta && previous !== undefined) meta.content = previous;
    };
  }, [rest]);
  useEffect(setTheme, [setTheme]);
  return rest;
}
