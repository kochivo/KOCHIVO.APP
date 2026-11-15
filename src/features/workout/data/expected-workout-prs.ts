type Performance = {
  session_id: string; exercise_id: string; weight_kg: number | null; reps: number | null;
  completed_at: string; deleted_at: string | null; drop_index?: number;
};

export function expectedWorkoutPrs(rows: readonly Performance[], session: { id: string; started_at: string }): number {
  const previous = new Map<string, number>();
  const current = new Map<string, number>();
  for (const row of rows) {
    if (row.deleted_at || (row.drop_index ?? 0) > 0 || row.weight_kg === null || row.weight_kg <= 0 ||
      row.reps === null || row.reps < 1 || row.reps > 12) continue;
    const target = row.session_id === session.id ? current
      : Date.parse(row.completed_at) < Date.parse(session.started_at) ? previous : undefined;
    if (!target) continue;
    const best = row.weight_kg * (1 + row.reps / 30);
    target.set(row.exercise_id, Math.max(target.get(row.exercise_id) ?? 0, best));
  }
  return Math.min(3, [...current].filter(([id, best]) => previous.has(id) && best > (previous.get(id) ?? 0)).length);
}
