import { z } from 'zod';
import { answerSources } from './answer-sources';

export const koReplySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.enum(['updated', 'read']), sets: z.number(), reps: z.number() }),
  z.object({ kind: z.literal('clarify'), question: z.string() }),
  z.object({ kind: z.literal('unsupported') }),
]);
export type KoReply = z.infer<typeof koReplySchema>;

const actionSchema = z.object({ id: z.string(), title: z.string(), detail: z.string(), token: z.string() });
export type AccountAction = z.infer<typeof actionSchema>;
const upgradeSchema = z.object({ tier: z.enum(['entry', 'champion', 'legend', 'empire']), credits: z.number().int().positive() });
export type KoUpgrade = z.infer<typeof upgradeSchema>;
export type KoCredits = { used: number; cap: number; month: string };

export const accountReplySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('message'), text: z.string(), optionsToken: z.string().optional(),
    actions: z.array(actionSchema).max(3).optional(), quick: z.array(z.string()).max(3).optional(),
    upgrade: upgradeSchema.optional(), sources: z.array(z.enum(answerSources)).max(4).optional(),
    memory: z.object({ id: z.uuid(), text: z.string().refine(text => [...text].length <= 200) }).optional(),
    feedbackIntent: z.string().optional(),
  }),
  z.object({ kind: z.literal('confirm'), text: z.string(), token: z.string() }),
]);
export type AccountReply = z.infer<typeof accountReplySchema>;
