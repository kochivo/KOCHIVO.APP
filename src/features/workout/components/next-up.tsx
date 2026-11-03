import type { SnapshotExercise } from '@/core/offline';

export function NextUp({ exercise }: { exercise: SnapshotExercise }) {
  return <aside className="glass-strong flex flex-wrap items-center justify-between gap-2 rounded-card p-4">
    <span className="text-xs text-muted">اللي جاي</span>
    <span className="font-bold"><bdi>{exercise.name_ar || exercise.name_en}</bdi> · <bdi>{exercise.sets} × {exercise.reps_min}{exercise.reps_max !== null && exercise.reps_max !== exercise.reps_min ? `–${exercise.reps_max}` : ''}</bdi></span>
  </aside>;
}
