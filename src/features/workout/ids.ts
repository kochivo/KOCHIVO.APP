import { stableId } from '@/core/offline';

export function sessionId(dayId: string, trainingDate: string): Promise<string> {
  return stableId('session', dayId, trainingDate);
}

export function setId(session: string, programExerciseId: string, setIndex: number, dropIndex = 0): Promise<string> {
  if (dropIndex > 0) return stableId('set', session, programExerciseId, String(setIndex), 'drop', String(dropIndex));
  return stableId('set', session, programExerciseId, String(setIndex));
}
