import { stableId } from '@/core/offline';

export function sessionId(dayId: string, trainingDate: string): Promise<string> {
  return stableId('session', dayId, trainingDate);
}

export function setId(session: string, programExerciseId: string, setIndex: number): Promise<string> {
  return stableId('set', session, programExerciseId, String(setIndex));
}
