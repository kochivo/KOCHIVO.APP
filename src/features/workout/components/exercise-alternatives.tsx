'use client';
import { Button } from '@/ui/button';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { ExerciseImage } from '@/ui/exercise-image';
import { exerciseMediaUrl } from '@/core/storage';
import { Dumbbell, ChevronDown } from 'lucide-react';
import type { SnapshotExercise } from '@/core/offline';
import { messages } from '../alternatives/messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function ExerciseAlternatives({ exercise, disabled, onChoose }: {
  exercise: SnapshotExercise; disabled: boolean; onChoose: (id: string) => void;
}) {
  const t = useT(messages), locale = useLocale();
  const v6 = captainWorkspaceEnabled();
  if (!exercise.alternatives?.length) return null;
  const rows = exercise.alternative_exercises?.filter(row => exercise.alternatives?.includes(row.id)) ?? [];
  return <details className={v6 ? 'group border-b border-line-soft pb-2' : 'border-b border-line-soft pb-2'}>
    <summary className="flex min-h-12 cursor-pointer items-center text-xs text-muted">{t('switch')}{v6 && <ChevronDown aria-hidden className="ms-auto size-4 shrink-0 transition-transform group-open:rotate-180" />}</summary>
    <div className="space-y-2">{rows.length ? rows.map(row => <button key={row.id} type="button" disabled={disabled}
      aria-pressed={exercise.exercise_id === row.id} onClick={() => onChoose(row.id)}
      className="flex min-h-14 w-full items-center gap-3 rounded-control border border-line-soft px-3 py-2 text-start text-sm disabled:opacity-40">
      {row.media_path ? <ExerciseImage src={exerciseMediaUrl(row.media_path)} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl object-cover" /> :
        <span className="glass-strong grid size-11 shrink-0 place-items-center rounded-xl"><Dumbbell aria-hidden className="size-4 text-faint" /></span>}
      <bdi>{exerciseName(row, locale)}</bdi>
    </button>) : <p className="text-xs text-faint">{t('empty')}</p>}
      {v6 ? <Button variant="secondary" type="button" disabled={disabled} className="min-h-12 px-3 text-xs text-muted" onClick={() => onChoose('')}>{t('original')}</Button> :
        <button type="button" disabled={disabled} className="min-h-12 px-3 text-xs text-muted" onClick={() => onChoose('')}>{t('original')}</button>}
    </div>
  </details>;
}
