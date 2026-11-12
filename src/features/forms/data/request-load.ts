import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { RequestData } from '../request-types';
import type { Question } from '../types';
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
  const result = await client.from('form_requests').select('id,form_id,player_id,captain_id,sent_at,due_at,reminded_at,answered_at,reviewed_at,captain_reply,status').eq('player_id',player)
    .order('sent_at',{ascending:false}).order('id').limit(50);
  if (result.error) throw result.error;
  if (!result.data.length) return [];
  const ids = [...new Set(result.data.map(r => r.form_id))];
  const forms = await client.from('forms').select('id,title').in('id',ids);
  if (forms.error) throw forms.error;
  const questions: Question[] = [], answers: RequestData['answers'] = [];
  for (let offset = 0; ; offset += 500) {
    const [q,a] = await Promise.all([
      client.from('form_questions').select('id,form_id,position,label_ar,label_en,type,required,options,maps_to,alert_on')
        .in('form_id',ids).order('position').order('id').range(offset,offset+499),
      client.from('form_answers').select('id,request_id,question_id,value,photo_paths').in('request_id',result.data.map(r => r.id))
        .order('id').range(offset,offset+499),
    ]);
    if (q.error || a.error) throw q.error ?? a.error;
    questions.push(...q.data.map(decodeQuestion)); answers.push(...a.data);
    if (q.data.length<500 && a.data.length<500) break;
  }
  return result.data.map(request => {
    const form = forms.data.find(f => f.id===request.form_id);
    if (!form) throw new Error('Assessment unavailable');
    return {request,title:form.title,questions:questions.filter(q => q.form_id===request.form_id),answers:answers.filter(a => a.request_id===request.id)};
  });
}
