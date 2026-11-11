import { z } from 'zod';
import { koPreviewAllowed } from '@/features/ko-core';
import type { KoRole } from '@/features/ko-core';

export type DemoPlan = { sets: number; reps: number };
export type KoToolCall = { name: string; args: unknown };
import type { KoReply } from '@/features/ko-core';
export type { KoReply } from '@/features/ko-core';

export function createDemoPlan(): DemoPlan {
  return { sets: 4, reps: 10 };
}

export function isKoDemoOrigin(mode: string | undefined, host: string | null, origin: string | null) {
  if (!host || !origin) return false;
  try {
    const url = new URL(origin);
    return url.origin === origin && url.host === host &&
      (url.protocol === 'http:' || url.protocol === 'https:') && koPreviewAllowed(mode, url.hostname);
  } catch {
    return false;
  }
}

const edit = z.strictObject({ sets: z.number().int().min(1).max(12).optional(), reps: z.number().int().min(1).max(50).optional() })
  .refine(value => value.sets !== undefined || value.reps !== undefined);
const clarify = z.strictObject({ question: z.string().trim().min(1).max(240) });

export function executeDemoTool(plan: DemoPlan, role: KoRole, call: KoToolCall): KoReply {
  if (call.name === 'read_bench' && z.strictObject({}).safeParse(call.args).success) {
    return { kind: 'read', ...plan };
  }
  if (call.name === 'clarify') {
    const result = clarify.safeParse(call.args);
    if (result.success) return { kind: 'clarify', question: result.data.question };
  }
  if (call.name === 'update_bench' && role === 'captain') {
    const result = edit.safeParse(call.args);
    if (result.success) {
      plan.sets = result.data.sets ?? plan.sets;
      plan.reps = result.data.reps ?? plan.reps;
      return { kind: 'updated', ...plan };
    }
  }
  return { kind: 'unsupported' };
}
