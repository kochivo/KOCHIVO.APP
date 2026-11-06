import { z } from 'zod';
import type { LibraryExercise } from './types';

export const bodyParts = ['chest', 'back', 'upper legs', 'lower legs', 'shoulders', 'upper arms',
  'lower arms', 'waist', 'core', 'glutes', 'cardio', 'neck'] as const;
export const bodyPartLabels = { chest: 'chest', back: 'back', 'upper legs': 'thighs', 'lower legs': 'calves',
  shoulders: 'shoulders', 'upper arms': 'upperArms', 'lower arms': 'forearms', waist: 'abs', core: 'core', glutes: 'glutes', cardio: 'cardio', neck: 'neck' } as const;
export function bodyPartFilter(part: string): { column: 'body_part' | 'target'; value: string }[] {
  if (!part) return [];
  if (part === 'glutes') return [{ column: 'body_part', value: part }, { column: 'target', value: part }];
  if (part === 'core') return [{ column: 'body_part', value: part }, { column: 'body_part', value: 'waist' }];
  return [{ column: 'body_part', value: part }];
}
export const customExerciseSchema = z.object({
  name: z.string().trim().min(1).max(60),
  bodyPart: z.enum(bodyParts),
  equipment: z.enum(['treadmill', 'stairmaster']).nullable().optional(),
  target: z.string().trim().max(40).optional().default(''),
  videoUrl: z.union([z.literal(''), z.url().max(500).refine(value => value.startsWith('https://'))])
    .optional().default(''),
}).transform(value => ({ ...value, equipment: value.bodyPart === 'cardio' ? value.equipment ?? null : null }));
export type CustomExerciseInput = z.input<typeof customExerciseSchema>;
export function optimisticExercise(id: string, input: z.output<typeof customExerciseSchema>): LibraryExercise {
  return { id, name_ar: input.name, name_en: input.name, body_part: input.bodyPart,
    target: input.target || null, video_url: input.videoUrl || null, media_path: null, equipment: input.equipment, is_own: true };
}
export function prependExercise(rows: LibraryExercise[], row: LibraryExercise): LibraryExercise[] {
  return [row, ...rows.filter(existing => existing.id !== row.id)];
}
