import type { SnapshotExercise } from '@/core/offline';
import type { WorkoutStep } from '../queue';

export type ExerciseChoices = Record<string, string>;
export function readChoices(storage: Pick<Storage, 'getItem'>, sessionId: string): ExerciseChoices {
  try {
    const value: unknown = JSON.parse(storage.getItem(`exercise-choices:${sessionId}`) ?? 'null');
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    }
  } catch { /* Storage may be blocked; this visit can still use optimistic choices. */ }
  return {};
}
export function saveChoices(storage: Pick<Storage, 'setItem'>, sessionId: string, choices: ExerciseChoices): void {
  try { storage.setItem(`exercise-choices:${sessionId}`, JSON.stringify(choices)); }
  catch { /* Match warm-up progress: keep in-memory choices usable when storage is blocked. */ }
}
export function applyAlternative(row: SnapshotExercise, id: string | undefined): SnapshotExercise {
  if (!id || !row.alternatives?.includes(id)) return row;
  const alternative = row.alternative_exercises?.find(item => item.id === id);
  if (!alternative) return row;
  return { ...row, exercise_id: alternative.id, name_ar: alternative.name_ar, name_en: alternative.name_en,
    media_path: alternative.media_path, video_url: alternative.video_url };
}

export function alternativeStep(step: WorkoutStep | undefined, id: string | undefined): WorkoutStep | undefined {
  if (!step) return undefined;
  const exercise = applyAlternative(step.exercise, id);
  return exercise === step.exercise ? step : { ...step, exercise };
}

/** Eligibility applies to new choices; an existing log keeps its recorded identity. */
export function loggedStep(step: WorkoutStep | undefined, id: string, fallbackName: string): WorkoutStep | undefined {
  if (!step || id === step.exercise.exercise_id) return step;
  const metadata = step.exercise.alternative_exercises?.find(row => row.id === id);
  return { ...step, exercise: { ...step.exercise, exercise_id: id, name_ar: metadata?.name_ar ?? null,
    name_en: metadata?.name_en ?? fallbackName, media_path: metadata?.media_path ?? null, video_url: metadata?.video_url ?? null } };
}
