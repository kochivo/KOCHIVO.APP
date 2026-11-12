'use server';
import { z } from 'zod';
import { formsAccess } from './access';
import { assessmentInput } from '../assessment-schema';
import { loadAssessmentWorkspace } from './assessment-workspace';

export async function assessmentWorkspace(player?: string) {
  const { client, captain } = await formsAccess();
  return loadAssessmentWorkspace(client, captain, player ? z.uuid().parse(player) : undefined);
}
export async function saveAssessmentSchedule(input: unknown) {
  const { client, captain } = await formsAccess();
  const row = assessmentInput.parse(input);
  const result = await client.from('assessment_schedules').upsert({ ...row, captain_id: captain }).select('id').single();
  if (result.error) throw result.error;
  return result.data;
}
export async function pauseAssessmentSchedule(id: string, paused: boolean) {
  const { client, captain } = await formsAccess();
  const result = await client.from('assessment_schedules').update({ paused_at: paused ? new Date().toISOString() : null })
    .eq('id', z.uuid().parse(id)).eq('captain_id', captain).select('id').single();
  if (result.error) throw result.error;
}
export async function deleteAssessmentSchedule(id: string) {
  const { client, captain } = await formsAccess();
  const result = await client.from('assessment_schedules').delete().eq('id', z.uuid().parse(id)).eq('captain_id', captain).select('id').single();
  if (result.error) throw result.error;
}
