import type { SetLogRow } from '@/core/offline';
import type { PainReportRow } from '@/core/offline/pain-tables';
import { alternativeStep, readChoices, saveChoices } from './data/exercise-choices';
import type { ExerciseChoices } from './data/exercise-choices';
import { painBlocksExercise } from './pain-block';
import type { WorkoutStep } from './queue';

export function remainingPainIds(queue: readonly WorkoutStep[],
  sets: readonly Pick<SetLogRow, 'program_exercise_id' | 'set_index' | 'drop_index'>[],
  choices: ExerciseChoices, report?: PainReportRow): string[] {
  return [...new Set(queue.filter(step => !sets.some(row => row.program_exercise_id === step.exercise.id &&
    row.set_index === step.setIndex && (row.drop_index ?? 0) === (step.dropIndex ?? 0)))
    .filter(step => !report || painBlocksExercise([report], alternativeStep(step, choices[step.exercise.id])?.exercise,
      choices[step.exercise.id])).map(step => step.exercise.id))];
}

export function savePainSkips(storage: Pick<Storage, 'setItem'>, sessionId: string,
  previous: readonly string[], added: readonly string[]): string[] {
  const ids = [...new Set([...previous, ...added])];
  saveChoices(storage, `pain-skips:${sessionId}`, Object.fromEntries(ids.map(id => [id, 'skip'])));
  return ids;
}

export function painFinishHeadline(skipped: number, loggedSets: number) {
  return skipped > 0 ? loggedSets > 0 ? 'finishSafe' : 'finishStopped' : null;
}

export function readPainSkipCount(storage: Pick<Storage, 'getItem'>, sessionId: string): number {
  return Object.keys(readChoices(storage, `pain-skips:${sessionId}`)).length;
}
