export type StatusCard = 'training' | 'nutrition' | 'assessments';
export function primaryCard(available: Record<StatusCard, boolean>): StatusCard | null {
  return (['training', 'nutrition', 'assessments'] as const).find(key => !available[key]) ?? null;
}
export function weightProgress(initial: number | null, current: number | null, target: number | null) {
  if (initial === null || current === null || target === null) return null;
  if (initial === target) return current === target ? 100 : 0;
  return Math.round(Math.max(0, Math.min(1, (current - initial) / (target - initial))) * 100);
}

export function progressDetails(checkIns: readonly { weekStart: string; weightKg: number | null }[], target: number | null) {
  const points = checkIns.flatMap(row => row.weightKg === null ? [] : [{ date: row.weekStart, value: row.weightKg }])
    .sort((a, b) => a.date.localeCompare(b.date));
  const first = points[0], last = points.at(-1);
  const round = (value: number) => Math.round(value * 10) / 10;
  return { points, summary: first && last ? { latest: last.value, change: round(last.value - first.value),
    toTarget: target === null ? null : round(target - last.value) } : null };
}
