import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
import type { Translator } from '@/core/i18n/messages';

import { z } from 'zod';

export const injuryOptions = [
  { key: 'none', label: 'none' },
  { key: 'knee', label: 'knee' },
  { key: 'lower_back', label: 'lowerBack' },
  { key: 'shoulder', label: 'shoulder' },
  { key: 'neck', label: 'neck' },
  { key: 'wrist', label: 'wrist' },
  { key: 'ankle', label: 'ankle' },
  { key: 'hip', label: 'hip' },
  { key: 'other', label: 'other' },
] as const;

export const allergyOptions = [
  { key: 'none', label: 'none' },
  { key: 'lactose', label: 'milk' },
  { key: 'gluten', label: 'gluten' },
  { key: 'nuts', label: 'nuts' },
  { key: 'eggs', label: 'eggs' },
  { key: 'seafood', label: 'fishAndShellfish' },
  { key: 'other', label: 'other' },
] as const;

export const medicalOptions = [
  { key: 'none', label: 'none' },
  { key: 'heart', label: 'heartCondition' },
  { key: 'blood_pressure', label: 'bloodPressure' },
  { key: 'diabetes', label: 'diabetes' },
  { key: 'asthma', label: 'asthma' },
  { key: 'recent_surgery', label: 'recentSurgery' },
  { key: 'pregnancy', label: 'pregnancy' },
  { key: 'other', label: 'other' },
] as const;

export function toggleChip<Key extends string>(list: readonly Key[], key: Key): Key[] {
  if (list.includes(key)) return list.filter((selected) => selected !== key);
  if (key === 'none') return [key];
  return [...list.filter((selected) => selected !== 'none'), key];
}

// The caller supplies the clock once so all steps use the same birth-year ceiling.
export function makeIntakeSchema(now: Date, t: Translator<typeof messages> = createT(messages, 'ar')) {
  function chipSchema<Key extends string>(options: readonly { key: Key }[]) {
    return z.array(z.enum(options.map(({ key }) => key), { error: t('chooseFromTheList') }))
      .refine((keys) => !keys.includes('none' as Key) || keys.length === 1, {
        error: t('noneCantBeCombinedWithOtherChoices'),
      }).default([]);
  }

  function measurement(min: number, max: number) {
    return z.number({ error: t('enterANumber') }).min(min, { error: t('minimum', { value0: min }) })
      .max(max, { error: t('maximum', { value0: max }) });
  }

  const stepSchemas = {
    basics: z.object({
      full_name: z.string({ error: t('enterYourName') }).trim().min(2, { error: t('enterYourName') }).max(80, { error: t('maximum', { value0: 80 }) }),
      birth_year: measurement(1930, now.getUTCFullYear() - 10).int({ error: t('enterAWholeYear') }),
      sex: z.enum(['male', 'female'], { error: t('chooseMaleOrFemale') }),
      height_cm: measurement(100, 250),
      weight_kg: measurement(25, 300),
      target_weight_kg: measurement(25, 300).nullable(),
    }),
    schedule: z.object({
      training_days: z.array(measurement(0, 6).int({ error: t('chooseAValidDay') }), { error: t('chooseTrainingDays') })
        .min(1, { error: t('chooseAtLeastOneDay') }).max(7, { error: t('chooseUpTo7Days') })
        .refine((days) => new Set(days).size === days.length, { error: t('daySelectedTwice') }),
      session_minutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)], { error: t('chooseWorkoutLength') }),
      experience: z.enum(['new', 'under_1y', '1_3y', 'over_3y'], { error: t('chooseYourExperience') }),
    }),
    health: z.object({ injuries: chipSchema(injuryOptions), medical: chipSchema(medicalOptions) }),
    food: z.object({
      allergies: chipSchema(allergyOptions),
      notes: z.string({ error: t('enterYourNotes') })
        .refine((text) => Array.from(text).length <= 500, { error: t('notesMustBe500CharactersOrFewer') }).nullable(),
    }),
  };
  const intakeSchema = z.object({
    ...stepSchemas.basics.shape,
    ...stepSchemas.schedule.shape,
    ...stepSchemas.health.shape,
    ...stepSchemas.food.shape,
  });
  return { intakeSchema, stepSchemas };
}

export type Intake = z.infer<ReturnType<typeof makeIntakeSchema>['intakeSchema']>;
