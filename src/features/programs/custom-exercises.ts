import { z } from 'zod';
import type { LibraryExercise } from './types';

export const bodyParts = ['chest', 'back', 'upper legs', 'lower legs', 'shoulders', 'upper arms',
  'lower arms', 'waist', 'cardio', 'neck'] as const;
export const bodyPartLabels = { chest: 'chest', back: 'back', 'upper legs': 'thighs', 'lower legs': 'calves',
  shoulders: 'shoulders', 'upper arms': 'upperArms', 'lower arms': 'forearms', waist: 'abs', cardio: 'cardio', neck: 'neck' } as const;
export const customExerciseSchema = z.object({
  name: z.string().trim().min(1).max(60),
  bodyPart: z.enum(bodyParts),
  target: z.string().trim().max(40).optional().default(''),
  videoUrl: z.union([z.literal(''), z.url().max(500).refine(value => value.startsWith('https://'))])
    .optional().default(''),
});
export type CustomExerciseInput = z.input<typeof customExerciseSchema>;
export function optimisticExercise(id: string, input: z.output<typeof customExerciseSchema>): LibraryExercise {
  return { id, name_ar: input.name, name_en: input.name, body_part: input.bodyPart,
    target: input.target || null, video_url: input.videoUrl || null, media_path: null, equipment: null, is_own: true };
}
export function prependExercise(rows: LibraryExercise[], row: LibraryExercise): LibraryExercise[] {
  return [row, ...rows.filter(existing => existing.id !== row.id)];
}
