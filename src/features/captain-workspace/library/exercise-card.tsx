'use client';

import { useT } from '@/core/i18n/client';
import { exerciseMediaUrl } from '@/core/storage';
import { trainingMuscles } from '@/features/programs';
import type { LibraryExercise } from '@/features/programs';
import { ExerciseImage } from '@/ui/exercise-image';
import { messages } from './messages';

export const muscleTabs = ['all', 'legs', 'chest', 'back', 'shoulders', 'arms', 'abs', 'cardio'] as const;
export type MuscleTab = typeof muscleTabs[number];
export const equipmentChips = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'] as const;

export function muscleBodyParts(tab: MuscleTab): string[] {
  return tab === 'all' ? [] : trainingMuscles(tab, [tab]);
}

export function exerciseTitle(exercise: LibraryExercise): string {
  return exercise.name_ar?.trim() || exercise.name_en;
}

export function ExerciseCard({ exercise, onSelect }: {
  exercise: LibraryExercise; onSelect: (exercise: LibraryExercise) => void;
}) {
  const t = useT(messages);
  const muscle = muscleTabs.find(tab => tab !== 'all' && muscleBodyParts(tab).includes(exercise.body_part ?? ''));
  const equipment = equipmentChips.find(value => value === exercise.equipment ||
    (value === 'bodyweight' && exercise.equipment === 'body weight') ||
    (value === 'machine' && ['leverage machine', 'smith machine', 'sled machine'].includes(exercise.equipment ?? '')));
  return <button type="button" onClick={() => onSelect(exercise)}
    className="glass flex min-h-12 w-full flex-col gap-2 rounded-card border border-line-soft p-4 text-start hover:border-lime focus-visible:outline-2 focus-visible:outline-lime">
    {exercise.media_path ? <ExerciseImage src={exerciseMediaUrl(exercise.media_path)} alt="" width={320} height={220} fullWidth className="bg-exercise-media" /> :
      <span className="flex aspect-[16/11] w-full items-center justify-center rounded-control bg-surface-raised p-3 text-sm text-muted">{t('noMedia')}</span>}
    <b className="mt-1 break-words"><bdi>{exerciseTitle(exercise)}</bdi></b>
    <small dir="ltr" className="text-start text-muted">{exercise.name_en}</small>
    <span className="mt-auto flex flex-wrap gap-2 pt-2 text-xs">
      <span className="rounded-full bg-surface-raised px-2 py-1">{muscle ? t(muscle) : exercise.body_part || t('missing')}</span>
      <span className="rounded-full bg-surface-raised px-2 py-1">{equipment ? t(equipment) : exercise.equipment || t('missing')}</span>
      {exercise.is_own && <span className="rounded-full bg-lime/10 px-2 py-1 text-lime">{t('own')}</span>}
    </span>
  </button>;
}
