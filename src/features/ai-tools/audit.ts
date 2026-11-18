import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { AiTool, ToolContext, ToolStatus } from './types';

type AuditDatabase = {
  public: Omit<AppDatabase['public'], 'Functions'> & {
    Functions: AppDatabase['public']['Functions'] & {
      ai_audit_write: {
        Args: {
          p_client: string;
          p_tool: string;
          p_kind: AiTool<unknown, unknown>['kind'];
          p_status: ToolStatus;
          p_duration_ms: number;
          p_correlation: string;
        };
        Returns: undefined;
      };
    };
  };
};

export async function audit(ctx: ToolContext, tool: string, kind: AiTool<unknown, unknown>['kind'], status: ToolStatus, duration: number) {
  try {
    // The generated schema predates 0154. The same caller client sends the new RPC.
    const db = ctx.actor.db as unknown as SupabaseClient<AuditDatabase>;
    const { error } = await db.rpc('ai_audit_write', {
      p_client: ctx.client, p_tool: tool, p_kind: kind, p_status: status,
      p_duration_ms: Math.min(600_000, Math.max(0, Math.round(duration))),
      p_correlation: ctx.correlationId,
    });
    if (error) throw error;
  } catch {
    console.warn('AI tool audit write failed');
  }
}
