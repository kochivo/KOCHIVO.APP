import 'server-only';
import { audit } from './audit';
import { registry } from './registry';
import { failure, ToolError } from './tool-error';
import type { AiTool, ToolContext, ToolResult } from './types';

const timeout = Symbol('tool timeout');
const cancelled = Symbol('tool cancelled');

// External assistants (Claude, ChatGPT) often call several tools for one answer,
// e.g. one detail lookup per athlete, so they get a larger share of the window.
const mcpLimit = 30;
const koLimit = 12;

async function rateAllowed(ctx: ToolContext) {
  try {
    const limit = ctx.client === 'ko' ? koLimit : mcpLimit;
    const { data, error } = await ctx.actor.db.rpc('ko_rate_take', { p_limit: limit, p_window_seconds: 60 });
    return !error && data === true;
  } catch {
    return false;
  }
}

async function execute<I, O>(tool: AiTool<I, O>, ctx: ToolContext, args: unknown): Promise<ToolResult> {
  if (!tool.roles.includes(ctx.actor.role)) return failure('forbidden');

  const input = tool.input.safeParse(args);
  if (!input.success) {
    return failure('invalid_input', input.error.issues.map(issue => issue.path.map(String).join('.') || '$').join(', '));
  }
  if (!await rateAllowed(ctx)) return failure('rate_limited');

  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, ctx.signal]);
  if (signal.aborted) return failure('unavailable');

  let abort: (() => void) | undefined;
  const stop = new Promise<never>((_, reject) => {
    abort = () => reject(controller.signal.aborted ? timeout : cancelled);
    signal.addEventListener('abort', abort, { once: true });
  });
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const raw = await Promise.race([stop, tool.run({ ...ctx, signal }, input.data)]);
    const output = tool.output.safeParse(raw);
    if (output.success) return { ok: true, data: output.data };

    console.error('AI tool output validation failed', tool.name);
    return failure('unavailable');
  } finally {
    clearTimeout(timer);
    if (abort) signal.removeEventListener('abort', abort);
  }
}

export async function runTool(ctx: ToolContext, name: string, rawArgs: unknown): Promise<ToolResult> {
  const start = performance.now();
  const tool = registry.get(name);
  let result: ToolResult;
  try {
    result = tool ? await tool.execute(ctx, rawArgs, execute) : failure('not_found');
  } catch (error) {
    result = failure(error === timeout ? 'timeout' : error instanceof ToolError ? error.code : 'unavailable');
  }
  // Unknown names are untrusted and can contain caller-supplied text.
  await audit(ctx, tool?.name ?? 'unknown_tool', tool?.kind ?? 'read', result.ok ? 'ok' : result.error.code, performance.now() - start);
  return result;
}
