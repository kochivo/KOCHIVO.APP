import { z } from 'zod';
import { checkedRows, roster } from '../data/read';
import { defineTool } from '../define-tool';

export const getDues = defineTool({
  name: 'get_dues',
  description: 'Get outstanding dues per roster athlete and the total in Egyptian pounds.',
  input: z.strictObject({}),
  output: z.object({
    dues: z.array(z.object({ id: z.uuid(), name: z.string(), dueEgp: z.number() })),
    total: z.number(),
  }),
  roles: ['captain'],
  kind: 'read',
  async run(ctx) {
    const [players, result] = await Promise.all([roster(ctx), ctx.actor.db.rpc('captain_dues').abortSignal(ctx.signal)]);
    const names = new Map(players.map(player => [player.player_id, player.full_name]));
    const dues = checkedRows(result).flatMap(row => {
      const name = names.get(row.player_id);
      return name === undefined ? [] : [{ id: row.player_id, name, dueEgp: row.due_egp }];
    });
    return { dues, total: Math.round(dues.reduce((sum, row) => sum + row.dueEgp, 0) * 100) / 100 };
  },
});
