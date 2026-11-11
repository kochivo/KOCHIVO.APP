import 'server-only';
import { z } from 'zod';
import type { Tables } from '@/types/database';
import type { Question } from '../types';

export const scheduleSchema = z.union([
  z.object({ every: z.literal('week'), weekday: z.number().int().min(0).max(6), hour: z.number().int().min(0).max(23) }),
  z.object({ every: z.literal('month'), day: z.number().int().min(1).max(31), hour: z.number().int().min(0).max(23) }),
]);
const optionsSchema = z.array(z.object({ value: z.string(), label_ar: z.string(), label_en: z.string() }));
const alertSchema = z.object({ operator: z.enum(['eq', 'gt', 'lt']), value: z.union([z.string(), z.number(), z.boolean()]) });
export function decodeSchedule(value: unknown) { return value === null ? null : scheduleSchema.parse(value); }
export function decodeQuestion(row: Tables<'form_questions'>): Question {
  return { ...row, type: z.enum(['number','scale','choice','multi','text','photos','yesno']).parse(row.type),
    maps_to: z.enum(['weight','targetWeight','height','age','sex','experience','trainingDays','sessionMinutes','injuries','medical','allergies','waist','note']).nullable().parse(row.maps_to),
    options: optionsSchema.parse(row.options), alert_on: row.alert_on === null ? null : alertSchema.parse(row.alert_on) };
}
