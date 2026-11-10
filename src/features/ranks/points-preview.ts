export type WorkoutPointsInput = {
  startedAt: string;
  completedAt: string;
  loggedSets: number;
  plannedSets: number;
  plannedSeconds: number;
};

type WorkoutPointsPreview = { counted: true; points: 3 }
  | { counted: false; reason: 'short'; minMinutes: number }
  | { counted: false; reason: 'sets'; minSets: number };

export function previewWorkoutPoints(input: WorkoutPointsInput): WorkoutPointsPreview {
  // Keep in step with security_private.award_session_points in 0081_points_and_ranks.sql.
  const minSeconds = Math.max(1200, input.plannedSeconds * 0.5);
  const seconds = (Date.parse(input.completedAt) - Date.parse(input.startedAt)) / 1000;
  if (!Number.isFinite(seconds) || seconds < minSeconds) {
    return { counted: false, reason: 'short', minMinutes: Math.ceil(minSeconds / 60) };
  }
  const minSets = Math.ceil(input.plannedSets * 0.6);
  if (input.loggedSets < minSets) return { counted: false, reason: 'sets', minSets };
  return { counted: true, points: 3 };
}
