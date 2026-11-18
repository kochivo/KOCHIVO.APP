import { z } from 'zod';
import { checked } from '../data/read';
import { defineTool } from '../define-tool';

export const getCoachProfile = defineTool({
  name: 'get_coach_profile',
  description: 'Get your coach profile, timezone, and plan usage.',
  input: z.strictObject({}),
  output: z.object({
    name: z.string(), timezone: z.string(),
    plan: z.object({ tier: z.string(), used: z.number().int(), limit: z.number().int() }),
  }),
  roles: ['captain'],
  kind: 'read',
  async run({ actor: { db, id }, timezone, signal }) {
    // Mirror the billing plan summary with the supplied JWT instead of the cookie session.
    const [profileResult, tierResult, clients] = await Promise.all([
      db.from('profiles').select('full_name,timezone').eq('id', id).abortSignal(signal).single(),
      db.rpc('current_tier', { p_captain: id }).abortSignal(signal),
      db.from('coach_clients').select('player_id', { count: 'exact', head: true })
        .eq('captain_id', id).is('archived_at', null).abortSignal(signal),
    ]);
    const profile = checked(profileResult);
    const tier = checked(tierResult);
    checked(clients);
    if (!profile || !tier) throw new Error('Coach profile unavailable');
    const plan = checked(await db.from('plan_tiers').select('player_limit').eq('tier', tier).abortSignal(signal).single());
    if (!plan) throw new Error('Plan unavailable');
    return { name: profile.full_name, timezone: profile.timezone ?? timezone,
      plan: { tier, used: clients.count ?? 0, limit: plan.player_limit } };
  },
});
