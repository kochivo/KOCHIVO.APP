'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { exerciseMediaUrl } from '@/core/storage';
import type { LibraryExercise } from '@/features/programs';
import { ExerciseImage } from '@/ui/exercise-image';
import { messages } from './messages';
import { clickableClass } from '@/ui/button';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Play } from 'lucide-react';

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
  const locale = useLocale();
  const enabled = captainWorkspaceEnabled();
  const muscle = muscleTabs.find(tab => tab !== 'all' && muscleBodyParts(tab).includes(exercise.body_part ?? ''));
  const equipment = equipmentChips.find(value => value === exercise.equipment ||
    (value === 'bodyweight' && exercise.equipment === 'body weight') ||
    (value === 'machine' && ['leverage machine', 'smith machine', 'sled machine'].includes(exercise.equipment ?? '')));
  return <button type="button" onClick={() => onSelect(exercise)}
    className={`${clickableClass} glass flex min-h-12 w-full min-w-0 flex-col overflow-hidden rounded-card text-start${enabled ? ' max-md:min-h-16 max-md:flex-row max-md:items-center max-md:gap-stack max-md:px-stack max-md:py-inline max-md:[&>span:first-child]:size-11!' : ''}`}>
    {exercise.media_path ? <ExerciseImage src={exerciseMediaUrl(exercise.media_path)} alt="" width={320} height={220} fullWidth className="rounded-none bg-exercise-media" /> :
      <span className={`flex aspect-[16/11] w-full items-center justify-center bg-surface-raised p-stack text-sm text-muted${enabled ? ' max-md:shrink-0 max-md:rounded-control' : ''}`}>{enabled ? <><Play aria-hidden className="size-4 md:hidden" /><span className="max-md:sr-only">{t('noMedia')}</span></> : t('noMedia')}</span>}
    <span className={`grid w-full gap-inline p-stack${enabled ? ' max-md:min-w-0 max-md:flex-1 max-md:gap-0 max-md:p-0' : ''}`}>
      <b className={`break-words text-md${enabled ? ' max-md:hidden' : ''}`}><bdi>{exerciseTitle(exercise)}</bdi></b>
      {enabled && <b className="break-words text-sm md:hidden"><bdi>{locale === 'en' ? exercise.name_en || exerciseTitle(exercise) : exerciseTitle(exercise)}</bdi></b>}
      <small dir="ltr" className={`break-words text-start text-muted${enabled ? ' max-md:hidden' : ''}`}>{exercise.name_en}</small>
      <span className="flex flex-wrap gap-inline">
        <span className="tone-neutral rounded-md px-inline text-micro font-semibold">{muscle ? t(muscle) : exercise.body_part || t('missing')}</span>
        <span className="tone-neutral rounded-md px-inline text-micro font-semibold">{equipment ? t(equipment) : exercise.equipment || t('missing')}</span>
        {exercise.is_own && <span className="tone-lime rounded-md px-inline text-micro font-semibold">{t('own')}</span>}
      </span>
    </span>
  </button>;
}
