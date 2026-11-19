import type { z } from 'zod';
import type { KoActor } from '@/features/ko-account/server';
import type { Macros } from '@/lib/macros';

export type AiActor = KoActor;

export type MealWriteArgs = { p_meal_id: string; p_log_date: string; p_swaps: Record<string, string>;
  p_eaten: boolean; p_eaten_macros: Macros | null };

export type ToolContext = {
  actor: AiActor;
  client: 'ko' | `mcp:${string}`;
  correlationId: string;
  now: Date;
  timezone: string;
  signal: AbortSignal;
  confirmMeal?: (args: MealWriteArgs, signal: AbortSignal) =>
    PromiseLike<{ data: boolean | null; error: { code: string } | null }>;
};

export type AiTool<I, O> = {
  name: string;
  description: string;
  input: z.ZodType<I>;
  output: z.ZodType<O>;
  roles: readonly AiActor['role'][];
  kind: 'read' | 'write';
  run(ctx: ToolContext, input: I): Promise<O>;
};

export type ToolStatus =
  | 'ok' | 'unauthorized' | 'forbidden' | 'invalid_input' | 'not_found'
  | 'rate_limited' | 'timeout' | 'unavailable';

export type ToolResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: Exclude<ToolStatus, 'ok'>; message: string } };
