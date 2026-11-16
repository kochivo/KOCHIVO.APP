export type WorkoutPointsInput = {
  startedAt: string;
  completedAt: string;
  loggedSets: number;
  plannedSets: number;
  plannedSeconds: number;
  cardioSeconds?: number;
};

type WorkoutPointsPreview = { counted: true; points: 3 }
  | { counted: false; reason: 'short'; minMinutes: number }
  | { counted: false; reason: 'sets'; minSets: number };

export function previewWorkoutPoints(input: WorkoutPointsInput): WorkoutPointsPreview {
  // Match the cardio exception in 0144_points_crown_fairness.sql.
  const minSeconds = input.plannedSets === 0 && (input.cardioSeconds ?? 0) > 0
    ? input.cardioSeconds ?? 0 : Math.max(1200, input.plannedSeconds * 0.5);
  const seconds = (Date.parse(input.completedAt) - Date.parse(input.startedAt)) / 1000;
  if (!Number.isFinite(seconds) || seconds < minSeconds) {
    return { counted: false, reason: 'short', minMinutes: Math.ceil(minSeconds / 60) };
  }
  const minSets = Math.ceil(input.plannedSets * 0.6);
  if (input.loggedSets < minSets) return { counted: false, reason: 'sets', minSets };
  return { counted: true, points: 3 };
}
