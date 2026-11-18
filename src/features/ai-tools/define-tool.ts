import type { AiTool, ToolContext, ToolResult } from './types';

export function defineTool<I, O>(tool: AiTool<I, O>) {
  const { name, description, input, roles, kind } = tool;
  return {
    name, description, input, roles, kind,
    execute(ctx: ToolContext, args: unknown, run: <Input, Output>(
      definition: AiTool<Input, Output>, ctx: ToolContext, args: unknown,
    ) => Promise<ToolResult>) {
      return run(tool, ctx, args);
    },
  };
}
