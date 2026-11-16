'use server';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { playerFormsAccess } from './player-access';
import { loadRequest } from './request-load';
import { answerRows, validAnswer } from '../answers';

const schema = z.object({ requestId:z.uuid(), draft:z.record(z.uuid(),z.object({
  value:z.union([z.string().max(10000),z.number().finite(),z.boolean(),z.array(z.string()).max(100),z.null()]),
  photo_paths:z.array(z.string().max(1000)).max(10),
})) });
export async function submitAnswers(input: unknown): Promise<{ok:boolean}> {
  const {client,player} = await playerFormsAccess();
  try {
    const {requestId,draft} = schema.parse(input);
    const data = await loadRequest(client,requestId);
    if (data.request.player_id !== player || !data.questions.length) return {ok:false};
    if (data.questions.some(q => !validAnswer(q,draft[q.id]?.value ?? null,draft[q.id]?.photo_paths))) return {ok:false};
    if (Object.values(draft).some(a => a.photo_paths.some(path => !path.startsWith(`forms/${player}/${requestId}/`)))) return {ok:false};
    const rows = await answerRows(requestId,data.questions,draft);
    const same = (a:typeof data.answers[number],row:typeof rows[number]) => a.id === row.id
      && JSON.stringify(a.value) === JSON.stringify(row.value) && JSON.stringify(a.photo_paths) === JSON.stringify(row.photo_paths);
    // A submitted form is immutable in this flow. One bulk insert commits all answers
    // together; a retry confirms the saved payload even if the captain already reviewed it.
    if (data.request.answered_at || data.request.reviewed_at)
      return {ok:rows.every(row => data.answers.some(a => same(a,row)))};
    if (data.answers.some(a => !rows.some(row => same(a,row)))) return {ok:false};
    // PostgREST turns a JS null into SQL NULL, which the not-null jsonb column rejects.
    // Skipped optional answers omit the key so the column default stores JSON null.
    const payload = rows.map(({value,...row}) => value === null ? row : {...row,value});
    const inserted = await client.from('form_answers').upsert(payload,{onConflict:'id',ignoreDuplicates:true,defaultToNull:false});
    if (inserted.error) throw inserted.error;
    const confirmed = await loadRequest(client,requestId);
    return {ok:confirmed.request.answered_at !== null && rows.every(row => confirmed.answers.some(a => same(a,row)))};
  } catch (error) { unstable_rethrow(error); return {ok:false}; }
}
