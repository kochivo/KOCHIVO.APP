import type { z } from 'zod';
import type { KoActor } from '@/features/ko-account/server';

export type AiActor = KoActor;

export type ToolContext = {
  actor: AiActor;
  client: 'ko' | `mcp:${string}`;
  correlationId: string;
  now: Date;
  timezone: string;
  signal: AbortSignal;
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
