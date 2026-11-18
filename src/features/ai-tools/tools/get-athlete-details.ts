import { z } from 'zod';
import { checked, rosterAthlete } from '../data/read';
import { defineTool } from '../define-tool';
import { ToolError } from '../tool-error';

export const getAthleteDetails = defineTool({
  name: 'get_athlete_details',
  description: 'Get one roster athlete’s subscription, current plans, and last training date.',
  input: z.strictObject({ athleteId: z.uuid().toLowerCase() }),
  output: z.object({
    name: z.string(), access_until: z.iso.date().nullable(), sessions_left: z.number().int().nullable(),
    frozen: z.boolean(), program: z.string().nullable(), nutritionPlan: z.string().nullable(),
    lastTraining: z.iso.date().nullable(),
  }),
  roles: ['captain'],
  kind: 'read',
  async run(ctx, { athleteId }) {
    const player = await rosterAthlete(ctx, athleteId);
    const { actor: { db, id }, signal } = ctx;
    const [linkResult, nutritionResult] = await Promise.all([
      db.from('coach_clients').select('access_until,sessions_left,frozen_at')
        .eq('captain_id', id).eq('player_id', athleteId).is('archived_at', null).abortSignal(signal).maybeSingle(),
      db.from('nutrition_plans').select('title').eq('captain_id', id).eq('player_id', athleteId)
        .eq('is_template', false).eq('status', 'active').order('created_at', { ascending: false })
        .order('id').limit(1).abortSignal(signal).maybeSingle(),
    ]);
    const link = checked(linkResult);
    if (!link) throw new ToolError('not_found');
    return {
      name: player.full_name, access_until: link.access_until, sessions_left: link.sessions_left,
      frozen: Boolean(link.frozen_at), program: player.program_title ?? null,
      nutritionPlan: checked(nutritionResult)?.title ?? null, lastTraining: player.last_training_date ?? null,
    };
  },
});
