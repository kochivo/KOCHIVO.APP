import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { localDate, saturdayWeek } from '@/lib/dates';
import { timezoneMidnight } from '@/lib/timezone';

type AuditRow = { user_id: string; created_at: string; client: string };
type AuditDatabase = {
  public: Omit<AppDatabase['public'], 'Tables'> & {
    Tables: AppDatabase['public']['Tables'] & {
      ai_audit_log: { Row: AuditRow; Insert: Partial<AuditRow>; Update: Partial<AuditRow>; Relationships: [] };
    };
  };
};

export function countWeeklyMcpCalls(db: SupabaseClient<AppDatabase>, id: string, now: Date, timezone: string) {
  const today = localDate(now, timezone);
  const start = new Date(timezoneMidnight(saturdayWeek(today)[0] ?? today, timezone)).toISOString();
  // The generated types predate migration 0154. The signed-in client's audit policy still applies.
  const auditDb = db as unknown as SupabaseClient<AuditDatabase>;
  return auditDb.from('ai_audit_log').select('client', { head: true, count: 'exact' })
    .eq('user_id', id).like('client', 'mcp:%').gte('created_at', start);
}
