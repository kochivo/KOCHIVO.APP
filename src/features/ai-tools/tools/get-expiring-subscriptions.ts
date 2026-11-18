import { z } from 'zod';
import { daysBetween, localDate } from '@/lib/dates';
import { roster } from '../data/read';
import { defineTool } from '../define-tool';

export const getExpiringSubscriptions = defineTool({
  name: 'get_expiring_subscriptions',
  description: 'List roster subscriptions expiring today or within the given number of days.',
  input: z.strictObject({ days: z.number().int().min(1).max(30) }),
  output: z.array(z.object({ id: z.uuid(), name: z.string(), accessUntil: z.iso.date(), daysLeft: z.number().int() })),
  roles: ['captain'],
  kind: 'read',
  async run(ctx, { days }) {
    const today = localDate(ctx.now, ctx.timezone);
    return (await roster(ctx)).flatMap(row => {
      if (!row.access_until) return [];
      const daysLeft = daysBetween(today, row.access_until);
      return daysLeft >= 0 && daysLeft <= days
        ? [{ id: row.player_id, name: row.full_name, accessUntil: row.access_until, daysLeft }]
        : [];
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  },
});
