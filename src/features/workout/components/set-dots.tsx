'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { Check, Dumbbell } from 'lucide-react';
import { EmptyState } from '@/ui/empty-state';
import type { SetLogRow, SnapshotExercise } from '@/core/offline';
import { cn } from '@/lib/cn';

export function SetDots({ exercise, currentIndex, doneSets, onEdit, disabled = false, compact = false }: {
  exercise: SnapshotExercise; currentIndex: number; doneSets: SetLogRow[];
  onEdit: (row: SetLogRow) => void; disabled?: boolean; compact?: boolean;
}) {
  const t = useT(messages);
  const locale = useLocale();
  if (exercise.sets === 0) return <EmptyState icon={Dumbbell} title={t('noSetsForThisExercise')} body={t('yourCoachIsPreparingYourWorkout')} action={{ label: t('messageCoach'), href: '/player/captain' }} />;
  return <div className="flex flex-wrap gap-inline" role="group" aria-label={t('exerciseSets')}>
    {Array.from({ length: exercise.sets }, (_, index) => {
      const setIndex = index + 1;
      const done = doneSets.find((row) => row.program_exercise_id === exercise.id && row.set_index === setIndex && (row.drop_index ?? 0) === 0);
      const number = formatNumber(setIndex, locale);
      return <button key={setIndex} type="button" disabled={!done || disabled}
        aria-current={setIndex === currentIndex ? 'step' : undefined}
        aria-label={done ? t('editSet', { value0: number }) : t('setNumber', { value0: number })}
        onClick={() => { if (done) onEdit(done); }}
        className={cn('flex flex-1 flex-col items-center justify-center rounded-control border border-line-soft px-inline py-inline',
          compact ? 'min-h-12 min-w-12' : 'min-h-16 min-w-16', setIndex === currentIndex && 'ring-1 ring-ink/60 ring-inset',
          done ? 'bg-lime-soft text-lime' : `glass ${setIndex === currentIndex ? 'text-ink' : 'text-muted'}`)}>
        <span className="flex items-center gap-inline text-sm tabular-nums">{compact ? <bdi>{number}</bdi> : t('setNumber', { value0: number })}{done && <Check className="size-4 shrink-0" aria-hidden />}</span>
        {done && <bdi dir="ltr" className={cn('tabular-nums', compact ? 'text-xs' : 'text-sm font-bold')}>{formatNumber(done.weight_kg ?? 0, locale)} × {formatNumber(done.reps ?? 0, locale)}</bdi>}
      </button>;
    })}
  </div>;
}
