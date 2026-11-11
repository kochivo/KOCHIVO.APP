import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { RequestData } from '../request-types';
import { decodeQuestion } from './validation';

export async function loadRequest(client: SupabaseClient<AppDatabase>, requestId: string): Promise<RequestData> {
  const request = await client.from('form_requests').select('*').eq('id',requestId).single();
  if (request.error) throw request.error;
  const [form,questions,answers] = await Promise.all([
    client.from('forms').select('title').eq('id',request.data.form_id).single(),
    client.from('form_questions').select('*').eq('form_id',request.data.form_id).order('position').limit(100),
    client.from('form_answers').select('id,request_id,question_id,value,photo_paths').eq('request_id',requestId).limit(100),
  ]);
  if (form.error || questions.error || answers.error) throw form.error ?? questions.error ?? answers.error;
  return { request:request.data,title:form.data.title,questions:questions.data.map(decodeQuestion),answers:answers.data };
}
export async function loadPlayerRequests(client: SupabaseClient<AppDatabase>, player: string): Promise<RequestData[]> {
  const result = await client.from('form_requests').select('id').eq('player_id',player)
    .order('sent_at',{ascending:false}).order('id').limit(50);
  if (result.error) throw result.error;
  return Promise.all(result.data.map(r => loadRequest(client,r.id)));
}
