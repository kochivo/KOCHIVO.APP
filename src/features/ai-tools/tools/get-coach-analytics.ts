import { z } from 'zod';
import { localDate } from '@/lib/dates';
import { checked, checkedRows } from '../data/read';
import { defineTool } from '../define-tool';

export const getCoachAnalytics = defineTool({
  name: 'get_coach_analytics',
  description: 'Get the active athlete count, average adherence for two months, and current crown leader.',
  input: z.strictObject({}),
  output: z.object({
    active: z.number().int(), adherenceThisMonth: z.number().nullable(),
    adherenceLastMonth: z.number().nullable(), leader: z.string().nullable(),
  }),
  roles: ['captain'],
  kind: 'read',
  async run({ actor: { db, id }, now, timezone, signal }) {
    const today = localDate(now, timezone);
    const month = `${today.slice(0, 7)}-01`;
    const previous = new Date(`${month}T12:00:00Z`);
    previous.setUTCMonth(previous.getUTCMonth() - 1);
    const [current, last, active] = await Promise.all([
      db.rpc('team_leaderboard', { p_month: month }).abortSignal(signal),
      db.rpc('team_leaderboard', { p_month: localDate(previous, 'UTC') }).abortSignal(signal),
      db.from('coach_clients').select('player_id', { count: 'exact', head: true }).eq('captain_id', id)
        .is('archived_at', null).eq('pending', false).is('frozen_at', null).gte('access_until', today).abortSignal(signal),
    ]);
    const board = checkedRows(current);
    checked(active);
    return {
      active: active.count ?? 0, adherenceThisMonth: averageAdherence(board),
      adherenceLastMonth: averageAdherence(checkedRows(last)),
      leader: board.find(row => row.is_crown)?.display_name ?? null,
    };
  },
});

function averageAdherence(rows: { adherence: number | null }[]) {
  const rates = rows.flatMap(row => row.adherence === null ? [] : [row.adherence]);
  return rates.length ? Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length) : null;
}
