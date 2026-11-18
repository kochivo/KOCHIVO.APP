import { z } from 'zod';
import { checkedRows, rosterAthlete } from '../data/read';
import { defineTool } from '../define-tool';

export const listWorkoutPrograms = defineTool({
  name: 'list_workout_programs',
  description: 'List your workout programs with athlete IDs and day counts.',
  input: z.strictObject({ athleteId: z.uuid().toLowerCase().optional() }),
  output: z.array(z.object({
    id: z.uuid(), title: z.string(), athlete: z.uuid().nullable(),
    status: z.enum(['draft', 'active', 'archived']), days: z.number().int(),
  })),
  roles: ['captain'],
  kind: 'read',
  async run(ctx, { athleteId }) {
    if (athleteId) await rosterAthlete(ctx, athleteId);
    const { actor: { db, id }, signal } = ctx;
    const query = db.from('programs').select('id,title,player_id,status,program_days(count)')
      .eq('captain_id', id).order('created_at', { ascending: false }).order('id');
    if (athleteId) query.eq('player_id', athleteId);
    return checkedRows(await query.abortSignal(signal)).map(row => ({
      id: row.id, title: row.title, athlete: row.player_id, status: row.status,
      days: row.program_days[0]?.count ?? 0,
    }));
  },
});
