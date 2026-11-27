import 'server-only';

import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import { workbookSourceSchema } from '../source-schema';

export type SourceKind = 'nutrition' | 'training';

export async function findPlanSource(id: string, kind: SourceKind) {
  if (!z.uuid().safeParse(id).success) return null;
  const client = await supabaseServer();
  const result = await client.rpc('captain_plan_source_id', { p_plan: id, p_kind: kind });
  return result.error ? null : result.data;
}

export async function loadPlanSource(id: string) {
  if (!z.uuid().safeParse(id).success) return { status: 'missing' as const };
  const client = await supabaseServer();
  const result = await client.from('imported_plan_sources').select('source,program_id,nutrition_plan_id').eq('id', id).maybeSingle();
  if (result.error) return { status: 'error' as const };
  if (!result.data) return { status: 'missing' as const };
  const parsed = workbookSourceSchema.safeParse(result.data.source);
  return parsed.success ? {
    status: 'loaded' as const, source: parsed.data, kind: result.data.program_id ? 'training' as const : 'nutrition' as const,
  } : { status: 'error' as const };
}
