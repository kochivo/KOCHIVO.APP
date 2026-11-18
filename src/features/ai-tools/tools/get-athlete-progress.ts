import { z } from 'zod';
import { progressMonth } from '@/features/ko-account/server';
import { localDate } from '@/lib/dates';
import { checked, checkedRows, rosterAthlete } from '../data/read';
import { defineTool } from '../define-tool';
import { ToolError } from '../tool-error';

export const getAthleteProgress = defineTool({
  name: 'get_athlete_progress',
  description: 'Get monthly workout adherence, rank, lifetime points, and last body scan date. Captains supply a roster athlete ID. Players can omit the ID.',
  input: z.strictObject({ athleteId: z.uuid().toLowerCase().optional() }),
  output: z.object({
    month: z.object({ done: z.number(), planned: z.number(), adherence: z.number() }).nullable(),
    rank: z.string().nullable(), points: z.number().nullable(), lastBodyScan: z.iso.date().nullable(),
  }),
  roles: ['captain', 'player'],
  kind: 'read',
  async run(ctx, { athleteId }) {
    const { actor, signal } = ctx;
    const self = actor.id.toLowerCase();
    const target = athleteId ?? self;
    if (actor.role === 'player' && target !== self) throw new ToolError('forbidden');
    if (actor.role === 'captain') await rosterAthlete(ctx, target);

    const today = localDate(ctx.now, ctx.timezone);
    const [score, scans] = await Promise.all([
      progressScore(ctx, target, today),
      actor.db.from('body_scans').select('scan_date').eq('player_id', target)
        .lte('scan_date', today).order('scan_date', { ascending: false }).limit(1).abortSignal(signal),
    ]);
    return {
      month: score ? progressMonth(score) : null,
      rank: score?.tier ?? null, points: score?.lifetime ?? null,
      lastBodyScan: checkedRows(scans)[0]?.scan_date ?? null,
    };
  },
});

async function progressScore({ actor, signal }: Parameters<typeof rosterAthlete>[0], target: string, today: string) {
  if (actor.role === 'player') return checked(await actor.db.rpc('my_points').abortSignal(signal));
  const board = checkedRows(await actor.db.rpc('team_leaderboard', { p_month: `${today.slice(0, 7)}-01` }).abortSignal(signal));
  return board.find(row => row.player_id === target);
}
