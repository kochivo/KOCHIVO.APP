import type { SnapshotExercise } from '@/core/offline';

export function exerciseMuscle(exercise: SnapshotExercise): string | null {
  // Older cached snapshots predate the optional v6 metadata.
  return 'body_part' in exercise && typeof exercise.body_part === 'string' && exercise.body_part.trim()
    ? exercise.body_part : null;
}
