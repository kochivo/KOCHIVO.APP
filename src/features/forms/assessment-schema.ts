import { z } from 'zod';

export const assessmentInput = z.object({
  id: z.uuid(), form_id: z.uuid(), player_id: z.uuid().nullable(),
  kind: z.enum(['once', 'week', 'month', 'days', 'on_join']),
  every_days: z.number().int().min(2).max(60).nullable(), weekday: z.number().int().min(0).max(6).nullable(),
  day: z.number().int().min(1).max(31).nullable(), hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59), starts_on: z.iso.date(), ends_on: z.iso.date().nullable(),
  max_times: z.number().int().min(1).max(10000).nullable(), remind_after_hours: z.union([z.literal(12), z.literal(24)]).nullable(),
  paused_at: z.iso.datetime({ offset: true }).nullable(),
}).refine(s => (!s.ends_on || s.ends_on >= s.starts_on)
  && (s.kind === 'days' ? s.every_days !== null : s.every_days === null)
  && (s.kind === 'week' ? s.weekday !== null : s.weekday === null)
  && (s.kind === 'month' ? s.day !== null : s.day === null));
export type AssessmentInput = z.infer<typeof assessmentInput>;
