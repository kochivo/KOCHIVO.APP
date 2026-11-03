import { z } from 'zod';

export const injuryOptions = [
  { key: 'none', label: 'مفيش' },
  { key: 'knee', label: 'الركبة' },
  { key: 'lower_back', label: 'أسفل الضهر' },
  { key: 'shoulder', label: 'الكتف' },
  { key: 'neck', label: 'الرقبة' },
  { key: 'wrist', label: 'الرسغ' },
  { key: 'ankle', label: 'الكاحل' },
  { key: 'hip', label: 'الحوض' },
  { key: 'other', label: 'حاجة تانية' },
] as const;

export const allergyOptions = [
  { key: 'none', label: 'مفيش' },
  { key: 'lactose', label: 'اللبن' },
  { key: 'gluten', label: 'الجلوتين' },
  { key: 'nuts', label: 'المكسرات' },
  { key: 'eggs', label: 'البيض' },
  { key: 'seafood', label: 'السمك والجمبري' },
  { key: 'other', label: 'حاجة تانية' },
] as const;

export const medicalOptions = [
  { key: 'none', label: 'مفيش' },
  { key: 'heart', label: 'القلب' },
  { key: 'blood_pressure', label: 'الضغط' },
  { key: 'diabetes', label: 'السكر' },
  { key: 'asthma', label: 'الربو' },
  { key: 'recent_surgery', label: 'عملية قريب' },
  { key: 'pregnancy', label: 'حمل' },
  { key: 'other', label: 'حاجة تانية' },
] as const;

export function toggleChip<Key extends string>(list: readonly Key[], key: Key): Key[] {
  if (list.includes(key)) return list.filter((selected) => selected !== key);
  if (key === 'none') return [key];
  return [...list.filter((selected) => selected !== 'none'), key];
}

function chipSchema<Key extends string>(options: readonly { key: Key }[]) {
  return z.array(z.enum(options.map(({ key }) => key), { error: 'اختار من القائمة' }))
    .refine((keys) => !keys.includes('none' as Key) || keys.length === 1, {
      error: 'مفيش مينفعش معاها اختيار تاني',
    }).default([]);
}

function measurement(min: number, max: number) {
  return z.number({ error: 'اكتب رقم' }).min(min, { error: `أقل قيمة ${min}` })
    .max(max, { error: `أكبر قيمة ${max}` });
}

// The caller supplies the clock once so all steps use the same birth-year ceiling.
export function makeIntakeSchema(now: Date) {
  const stepSchemas = {
    basics: z.object({
      birth_year: measurement(1930, now.getUTCFullYear() - 10).int({ error: 'اكتب سنة كاملة' }),
      sex: z.enum(['male', 'female'], { error: 'اختار راجل أو ست' }),
      height_cm: measurement(100, 250),
      weight_kg: measurement(25, 300),
      target_weight_kg: measurement(25, 300).nullable(),
    }),
    schedule: z.object({
      training_days: z.array(measurement(0, 6).int({ error: 'اختار يوم صحيح' }), { error: 'اختار أيام التمرين' })
        .min(1, { error: 'اختار يوم على الأقل' }).max(7, { error: 'أقصى حاجة 7 أيام' })
        .refine((days) => new Set(days).size === days.length, { error: 'اليوم متكرر' }),
      session_minutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)], { error: 'اختار مدة التمرين' }),
      experience: z.enum(['new', 'under_1y', '1_3y', 'over_3y'], { error: 'اختار خبرتك في التمرين' }),
    }),
    health: z.object({ injuries: chipSchema(injuryOptions), medical: chipSchema(medicalOptions) }),
    food: z.object({
      allergies: chipSchema(allergyOptions),
      notes: z.string({ error: 'اكتب ملاحظاتك' })
        .refine((text) => Array.from(text).length <= 500, { error: 'الملاحظات أقصاها 500 حرف' }).nullable(),
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
