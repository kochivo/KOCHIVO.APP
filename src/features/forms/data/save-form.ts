'use server';
import { z } from 'zod';
import { formsAccess } from './access';
import { validateForm } from '../model';
import type { FormDraft } from '../types';
import { scheduleSchema } from './validation';

const draftSchema = z.object({
  id: z.uuid(), captain_id: z.uuid(), title: z.string().trim().min(1).max(300),
  creation_key: z.uuid().optional(),
  kind: z.enum(['checkin','onboarding','progress','injury','update','custom']),
  schedule: scheduleSchema.nullable(), remind_after_hours: z.number().int().min(1).max(32767).nullable(),
  questions: z.array(z.object({ id: z.uuid(), form_id: z.uuid(), position: z.number().int().nonnegative(),
    label_ar: z.string().trim().min(1).max(2000), label_en: z.string().trim().max(2000),
    show_chart: z.boolean().default(true),
    type: z.enum(['number','scale','choice','multi','text','photos','yesno']), required: z.boolean(),
    options: z.array(z.object({ value: z.string(), label_ar: z.string(), label_en: z.string() })).max(100),
    maps_to: z.enum(['weight','targetWeight','height','age','sex','experience','trainingDays','sessionMinutes','injuries','medical','allergies','waist','note']).nullable(),
    alert_on: z.object({ operator: z.enum(['eq','gt','lt']), value: z.union([z.string(),z.number(),z.boolean()]) }).nullable(),
  })).min(1).max(100),
});

export async function saveForm(input: FormDraft): Promise<{ ok: boolean; error?: 'answeredQuestion' }> {
  const { client, captain } = await formsAccess();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const form = parsed.data;
  if (form.captain_id !== captain || validateForm(form).length
    || form.questions.some(q => q.form_id !== form.id)
    || new Set(form.questions.map(q => q.id)).size !== form.questions.length) return { ok: false };
  const { questions, ...row } = form;
  const result = await client.rpc('save_custom_form', { p_form: row, p_questions: questions });
  if (result.error?.code === 'P3260') return { ok: false, error: 'answeredQuestion' };
  if (result.error) return { ok: false };
  return { ok: true };
}
