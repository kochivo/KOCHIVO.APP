'use server';
import { z } from 'zod';
import { formsAccess } from './access';
import { validateForm } from '../model';
import type { FormDraft } from '../types';
import { scheduleSchema } from './validation';

const draftSchema = z.object({
  id: z.uuid(), captain_id: z.uuid(), title: z.string().trim().min(1).max(300),
  kind: z.enum(['checkin','onboarding','progress','injury','update','custom']),
  schedule: scheduleSchema.nullable(), remind_after_hours: z.number().int().min(1).max(32767).nullable(),
  questions: z.array(z.object({ id: z.uuid(), form_id: z.uuid(), position: z.number().int().nonnegative(),
    label_ar: z.string().trim().min(1).max(2000), label_en: z.string().trim().min(1).max(2000),
    type: z.enum(['number','scale','choice','multi','text','photos','yesno']), required: z.boolean(),
    options: z.array(z.object({ value: z.string(), label_ar: z.string(), label_en: z.string() })).max(100),
    maps_to: z.enum(['weight','targetWeight','height','age','sex','experience','trainingDays','sessionMinutes','injuries','medical','allergies','waist','note']).nullable(),
    alert_on: z.object({ operator: z.enum(['eq','gt','lt']), value: z.union([z.string(),z.number(),z.boolean()]) }).nullable(),
  })).min(1).max(100),
});

export async function saveForm(input: FormDraft): Promise<{ ok: boolean }> {
  const { client, captain } = await formsAccess();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const form = parsed.data;
  if (form.captain_id !== captain || validateForm(form).length
    || form.questions.some(q => q.form_id !== form.id)
    || new Set(form.questions.map(q => q.id)).size !== form.questions.length) return { ok: false };
  const foreign = await client.from('form_questions').select('id', { head: true, count: 'exact' })
    .in('id', form.questions.map(q => q.id)).neq('form_id', form.id);
  if (foreign.error || foreign.count !== 0) return { ok: false };
  const old = await client.from('form_questions').select('id,position').eq('form_id', form.id).order('position');
  if (old.error) return { ok: false };
  const removed = old.data.filter(q => !form.questions.some(next => next.id === q.id));
  if (removed.length) {
    const used = await client.from('form_answers').select('id', { count: 'exact', head: true }).in('question_id', removed.map(q => q.id));
    if (used.error || used.count !== 0) return { ok: false };
  }
  const { questions, ...row } = form;
  const parent = await client.from('forms').upsert(row).select('id').single();
  if (parent.error) return { ok: false };
  // Preserve question IDs used by answers. Vacate unique positions before applying a reorder.
  const changedPositions = old.data.some(q => questions.findIndex(next => next.id === q.id) !== q.position);
  if (changedPositions) {
    const base = Math.max(questions.length, ...old.data.map(q => q.position)) + 1;
    for (const [index, q] of old.data.entries()) {
      const result = await client.from('form_questions').update({ position: base + index }).eq('id', q.id).eq('form_id', form.id);
      if (result.error) return { ok: false };
    }
  }
  const result = await client.from('form_questions').upsert(questions.map((q, position) => ({ ...q, position })));
  if (result.error) return { ok: false };
  if (removed.length) {
    const result = await client.from('form_questions').delete().eq('form_id', form.id).in('id', removed.map(q => q.id));
    if (result.error) return { ok: false };
  }
  return { ok: true };
}
