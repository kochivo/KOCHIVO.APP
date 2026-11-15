import type { RosterPlayer } from '@/features/roster';
import { daysBetween, localDate, saturdayWeek } from '@/lib/dates';
import { endingSoon } from '@/lib/ending-soon';
import type { homeMessages } from './messages';

export type HomeFlag = 'low_sleep' | 'high_soreness' | 'weight_flat' | 'weight_jump' | 'no_logs' | 'note_present' | 'assessmentAlert';
export type ReviewRow = { id: string; playerId: string; name: string; kind: 'checkin' | 'form' | 'assessment'; at: string; title: string; flags: HomeFlag[] };
export type AbsentRow = { id: string; playerId: string; name: string; kind: 'absent'; days: number; lastTrainingDate: string | null };
export type NeedRow = ReviewRow | AbsentRow;
type SummaryKey = 'summaryPrefix' | 'summaryJoin' | 'summaryReplies' | 'summaryUnpaid' | 'summaryEnding';
type TranslateSummary = (key: SummaryKey, values?: Record<string, string | number>) => string;
export type HomeMessageKey = keyof typeof homeMessages.ar;

export function greetingPeriod(now: Date, timezone: string): 'morning' | 'evening' {
  const hour = Number(new Intl.DateTimeFormat('en', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' }).format(now));
  return hour < 12 ? 'morning' : 'evening';
}
export function summaryLine(counts: { replies: number; unpaid: number; ending: number }, t: TranslateSummary) {
  const parts = ([['replies', 'summaryReplies'], ['unpaid', 'summaryUnpaid'], ['ending', 'summaryEnding']] as const)
    .flatMap(([key, message]) => counts[key] > 0 ? [t(message, { count: counts[key] })] : []);
  return parts.length ? t('summaryPrefix') + parts.join(t('summaryJoin')) : '';
}
export function endingPlayers(players: RosterPlayer[], now: Date, timezone: string) {
  return players.filter(player => {
    return !player.pending && !player.frozenAt
      && endingSoon(localDate(now, timezone), player.accessUntil);
  }).sort((a, b) => a.accessUntil.localeCompare(b.accessUntil) || a.playerId.localeCompare(b.playerId));
}
export function homeNeeds(reviews: ReviewRow[], players: RosterPlayer[], now: Date, timezone: string, limit = 4): NeedRow[] {
  const absent: AbsentRow[] = players.flatMap(player => {
    const today = localDate(now, player.timezone ?? timezone);
    const days = daysBetween(player.lastTrainingDate ?? player.startedOn, today);
    return !player.pending && !player.frozenAt && player.accessUntil >= today && days >= 3
      && !reviews.some(row => row.playerId === player.playerId) ? [{ id: player.playerId, playerId: player.playerId,
        name: player.fullName, kind: 'absent' as const, days, lastTrainingDate: player.lastTrainingDate }] : [];
  }).sort((a, b) => b.days - a.days || a.playerId.localeCompare(b.playerId));
  if (limit !== 4) return [...reviews, ...absent].slice(0, limit);
  return [...reviews.slice(0, absent.length ? 3 : 4), ...absent.slice(0, Math.max(1, 4 - reviews.length))].slice(0, 4);
}
export function weekComparison(programs: { playerId: string | null; days: string[] }[], sessions: { playerId: string; dayId: string | null; date: string }[], today: string) {
  const week = saturdayWeek(today);
  const start = week[0] ?? today;
  const previous = new Date(`${start}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 7);
  const previousStart = localDate(previous, 'UTC');
  const planned = programs.reduce((sum, program) => sum + program.days.length, 0);
  const adherence = (from: string, until: string) => planned ? Math.round(programs.reduce((sum, program) => sum +
    new Set(sessions.filter(session => session.playerId === program.playerId && session.date >= from && session.date < until
      && session.dayId !== null && program.days.includes(session.dayId)).map(session => session.dayId)).size, 0) / planned * 100) : 0;
  const next = new Date(`${start}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 7);
  return { current: adherence(start, localDate(next, 'UTC')), previous: adherence(previousStart, start) };
}
