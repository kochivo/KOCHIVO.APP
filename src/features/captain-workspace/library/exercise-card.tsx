'use client';

import { useT } from '@/core/i18n/client';
import { exerciseMediaUrl } from '@/core/storage';
import type { LibraryExercise } from '@/features/programs';
import { ExerciseImage } from '@/ui/exercise-image';
import { messages } from './messages';
import { Button } from '@/ui/button';
import { RowChevron } from '@/ui/row-chevron';

export const muscleTabs = ['all', 'legs', 'chest', 'back', 'shoulders', 'arms', 'abs', 'cardio'] as const;
export type MuscleTab = typeof muscleTabs[number];
export const equipmentChips = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'] as const;

// Same labels as trainingMuscles in programs (a test keeps them equal); a fixed table keeps the
// programs barrel and its editor UI out of this client bundle.
const tabBodyParts: Record<Exclude<MuscleTab, 'all'>, string[]> = {
  legs: ['upper legs', 'lower legs', 'legs', 'leg', 'رجل', 'أرجل'],
  chest: ['chest', 'صدر'], back: ['back', 'ضهر', 'ظهر'],
  shoulders: ['shoulders', 'shoulder', 'كتف'],
  arms: ['upper arms', 'lower arms', 'arms', 'ذراع', 'باي', 'تراي'],
  abs: ['waist', 'abs', 'core', 'بطن', 'كور'], cardio: ['cardio'],
};

export function muscleBodyParts(tab: MuscleTab): string[] {
  return tab === 'all' ? [] : [...tabBodyParts[tab]];
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
  return <Button type="button" onClick={() => onSelect(exercise)}
    variant={'secondary'} block={false} className={"flex min-h-12 w-full flex-col gap-inline p-card text-start hover:border-lime focus-visible:outline-2 focus-visible:outline-lime"}>
    {exercise.media_path ? <ExerciseImage src={exerciseMediaUrl(exercise.media_path)} alt="" width={320} height={220} fullWidth className="bg-exercise-media" /> :
      <span className="flex aspect-[16/11] w-full items-center justify-center rounded-control bg-surface-raised p-stack text-sm text-muted">{t('noMedia')}</span>}
    <b className="mt-inline break-words"><bdi>{exerciseTitle(exercise)}</bdi></b>
    <small dir="ltr" className="text-start text-muted">{exercise.name_en}</small>
    <span className="mt-auto flex flex-wrap gap-inline pt-inline text-xs">
      <span className="rounded-full bg-surface-raised px-inline py-inline">{muscle ? t(muscle) : exercise.body_part || t('missing')}</span>
      <span className="rounded-full bg-surface-raised px-inline py-inline">{equipment ? t(equipment) : exercise.equipment || t('missing')}</span>
      {exercise.is_own && <span className="rounded-full bg-lime/10 px-inline py-inline text-lime">{t('own')}</span>}
      <RowChevron className="ms-auto" />
    </span>
  </Button>;
}
