type Performance = { weight_kg: number | null; reps: number | null; drop_index?: number };
type Best = { weight_kg: number; reps: number };
export type Pr = { kind: 'weight' | 'reps'; previous: Best };

export function detectPr(history: readonly Performance[], set: Performance): Pr | null {
  if ((set.drop_index ?? 0) > 0 || set.weight_kg === null || set.reps === null || set.reps < 1) return null;
  let previous: Best | null = null;
  for (const row of history) {
    if ((row.drop_index ?? 0) > 0 || row.weight_kg === null || row.reps === null || row.reps < 1) continue;
    if (!previous || row.weight_kg > previous.weight_kg ||
      (row.weight_kg === previous.weight_kg && row.reps > previous.reps)) {
      previous = { weight_kg: row.weight_kg, reps: row.reps };
    }
  }
  if (!previous) return null;
  if (set.weight_kg > previous.weight_kg) return { kind: 'weight', previous };
  return set.weight_kg === previous.weight_kg && set.reps > previous.reps ? { kind: 'reps', previous } : null;
}
