'use client';
import dynamic from 'next/dynamic';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { useTimezone } from '@/core/timezone/client';
import { localDate } from '@/lib/dates';
const CyclePanel = dynamic(() => import('./cycle-panel').then(module => module.CyclePanel), { ssr: false });
export function CycleEntry(props: { playerId?: string; today?: string; settings?: boolean; workout?: boolean }) {
  const { now } = useCalendarClock();
  const timezone = useTimezone();
  const today = props.today ?? (now ? localDate(now, timezone) : '');
  return props.playerId && today ? <CyclePanel {...props} today={today} playerId={props.playerId} /> : null;
}
