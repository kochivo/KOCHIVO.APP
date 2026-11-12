'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { ExerciseImage } from '@/ui/exercise-image';
import { exerciseMediaUrl } from '@/core/storage';
import { Dumbbell } from 'lucide-react';
import type { SnapshotExercise } from '@/core/offline';
import { messages } from '../alternatives/messages';

export function ExerciseAlternatives({ exercise, disabled, onChoose }: {
  exercise: SnapshotExercise; disabled: boolean; onChoose: (id: string) => void;
}) {
  const t = useT(messages), locale = useLocale();
  if (!exercise.alternatives?.length) return null;
  const rows = exercise.alternative_exercises?.filter(row => exercise.alternatives?.includes(row.id)) ?? [];
  return <details className="border-b border-line-soft pb-2">
    <summary className="flex min-h-12 cursor-pointer items-center text-xs text-muted">{t('switch')}</summary>
    <div className="space-y-2">{rows.length ? rows.map(row => <button key={row.id} type="button" disabled={disabled}
      aria-pressed={exercise.exercise_id === row.id} onClick={() => onChoose(row.id)}
      className="flex min-h-14 w-full items-center gap-3 rounded-control border border-line-soft px-3 py-2 text-start text-sm disabled:opacity-40">
      {row.media_path ? <ExerciseImage src={exerciseMediaUrl(row.media_path)} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl object-cover" /> :
        <span className="glass-strong grid size-11 shrink-0 place-items-center rounded-xl"><Dumbbell aria-hidden className="size-4 text-faint" /></span>}
      <bdi>{exerciseName(row, locale)}</bdi>
    </button>) : <p className="text-xs text-faint">{t('empty')}</p>}
      <button type="button" disabled={disabled} className="min-h-12 px-3 text-xs text-muted" onClick={() => onChoose('')}>{t('original')}</button>
    </div>
  </details>;
}
