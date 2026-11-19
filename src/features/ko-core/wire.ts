import { z } from 'zod';

export const koReplySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.enum(['updated', 'read']), sets: z.number(), reps: z.number() }),
  z.object({ kind: z.literal('clarify'), question: z.string() }),
  z.object({ kind: z.literal('unsupported') }),
]);
export type KoReply = z.infer<typeof koReplySchema>;

const actionSchema = z.object({ id: z.string(), title: z.string(), detail: z.string(), token: z.string() });
export type AccountAction = z.infer<typeof actionSchema>;

export const accountReplySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('message'), text: z.string(), optionsToken: z.string().optional(), actions: z.array(actionSchema).max(3).optional() }),
  z.object({ kind: z.literal('confirm'), text: z.string(), token: z.string() }),
]);
export type AccountReply = z.infer<typeof accountReplySchema>;
