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
    // Reviewed requests only allow confirmation; unreviewed retries repair partial submissions.
    if (data.request.reviewed_at)
      return {ok:rows.every(row => data.answers.some(a => same(a,row)))};
    const inserted = await client.rpc('submit_custom_form_answers',{p_request:requestId,p_answers:rows});
    if (inserted.error) throw inserted.error;
    const confirmed = await loadRequest(client,requestId);
    return {ok:confirmed.request.answered_at !== null && rows.every(row => confirmed.answers.some(a => same(a,row)))};
  } catch (error) { unstable_rethrow(error); return {ok:false}; }
}
