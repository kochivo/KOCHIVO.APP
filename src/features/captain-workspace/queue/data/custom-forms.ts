import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { matchesAlert } from '@/features/forms';
import { formSnapshot } from '@/features/player-file';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import type { CustomFormItem } from '../model';
import type { Cursor } from './page';
const alert = z.object({operator:z.enum(['eq','gt','lt']),value:z.union([z.string(),z.number(),z.boolean()])}).nullable();
export async function customFormRows(client:SupabaseClient<AppDatabase>,captain:string,cursor?:Cursor,reviewed=false) {
  if (!captainWorkspaceEnabled()) return {items:[] as CustomFormItem[],cursor:null};
  const query = client.from('form_requests').select(`id,player_id,answered_at,reviewed_at,captain_reply,
    profiles!form_requests_player_id_fkey(full_name),forms!form_requests_form_id_fkey(title),
    form_answers(question_id,value,form_questions(id,maps_to,alert_on))`)
    .eq('captain_id',captain).not('answered_at','is',null).order('answered_at',{ascending:false}).order('id').limit(50);
  if (reviewed) query.not('reviewed_at','is',null); else query.is('reviewed_at',null);
  if (cursor) query.or(`answered_at.lt.${cursor.created_at},and(answered_at.eq.${cursor.created_at},id.gt.${cursor.id})`);
  const result = await query;
  if (result.error) throw result.error;
  const items:CustomFormItem[] = result.data.flatMap(r => {
    if (!r.answered_at) return [];
    const questions = r.form_answers.flatMap(a => a.form_questions ? [a.form_questions] : []);
    return [{kind:'request' as const,id:r.id,player_id:r.player_id,player_name:r.profiles?.full_name ?? '',
      title:r.forms?.title ?? '',created_at:r.answered_at,reviewed_at:r.reviewed_at,reply:r.captain_reply,
      alert:r.form_answers.some(a => matchesAlert(alert.parse(a.form_questions?.alert_on ?? null),a.value)),
      snapshot:formSnapshot({id:r.id,answered_at:r.answered_at,title:r.forms?.title},r.form_answers,questions)}];
  });
  const last = items.at(-1);
  return {items,cursor:items.length === 50 && last ? {id:last.id,created_at:last.created_at} : null};
}
