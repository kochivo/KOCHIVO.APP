export function validateSet({ weight, reps, bodyweight }: { weight: number; reps: number; bodyweight: boolean }):
  'ok' | 'weight' | 'reps' | 'both' {
  const validWeight = bodyweight || (Number.isFinite(weight) && weight > 0);
  const validReps = Number.isFinite(reps) && reps >= 1;
  return validWeight ? validReps ? 'ok' : 'reps' : validReps ? 'weight' : 'both';
}
